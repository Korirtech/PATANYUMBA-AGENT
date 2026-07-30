import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import {
  searchProperties,
  getFeaturedProperties,
  getPropertiesByIds,
  getAllCities,
  getAllPropertyTypes,
  createConversation,
  getConversationMessages,
  addMessage,
  getConversation,
  PropertyFilters,
  addFavorite,
  removeFavorite,
  getFavorites,
} from "./db";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Property Endpoints ──────────────────────────────────────────

  properties: router({
    featured: publicProcedure.query(async () => {
      return getFeaturedProperties();
    }),

    search: publicProcedure
      .input(
        z.object({
          city: z.string().optional(),
          maxRent: z.number().optional(),
          minRent: z.number().optional(),
          bedrooms: z.number().optional(),
          propertyType: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        const filters: PropertyFilters = {};
        if (input.city) filters.city = input.city;
        if (input.maxRent !== undefined) filters.maxRent = input.maxRent;
        if (input.minRent !== undefined) filters.minRent = input.minRent;
        if (input.bedrooms !== undefined) filters.bedrooms = input.bedrooms;
        if (input.propertyType) filters.propertyType = input.propertyType;
        return searchProperties(filters);
      }),

    filters: publicProcedure.query(async () => {
      const [cities, propertyTypes] = await Promise.all([
        getAllCities(),
        getAllPropertyTypes(),
      ]);
      return {
        cities: ["Nairobi", "Mombasa", "Kisumu", "Nakuru"],
        propertyTypes: ["bedsitter", "1BR", "2BR", "3BR", "apartment", "maisonette"],
      };
    }),
  }),

  // ─── Chat / AI Agent Endpoints ───────────────────────────────────

  chat: router({
    /**
     * Send a message to the AI agent and get a response with matching properties.
     */
    sendMessage: publicProcedure
      .input(
        z.object({
          conversationId: z.number().optional(),
          message: z.string().min(1),
        })
      )
      .mutation(async ({ input, ctx }) => {
        let conversationId = input.conversationId;

        // Best-effort: Create conversation if needed
        try {
          if (!conversationId) {
            conversationId = await createConversation(
              ctx.user?.id,
              input.message.slice(0, 50)
            );
          }
        } catch (dbError) {
          console.error("[Chat] Failed to create/get conversation in DB:", dbError);
          // Fallback to a "stateless" conversation ID if DB is down
          conversationId = conversationId ?? 0;
        }

        // Best-effort: Save user message
        try {
          if (conversationId && conversationId > 0) {
            await addMessage(conversationId, "user", input.message);
          }
        } catch (dbError) {
          console.error("[Chat] Failed to save user message to DB:", dbError);
        }

        try {
          // 1. Parse search filters (with fallback for models that don't support json_schema)
          let filters: PropertyFilters = {};
          try {
            const filterPrompt = `You are a property search assistant for a Kenyan rental platform. Extract search filters from the user's message and return them as JSON. If a filter is not mentioned, omit it.

Available cities: Nairobi, Mombasa, Kisumu, Nakuru
Available property types: bedsitter, 1BR, 2BR, 3BR, apartment, maisonette

User message: "${input.message}"

Return ONLY a JSON object with these possible fields:
- city: string (one of the available cities, or omit)
- maxRent: number (maximum rent in KES, or omit)
- minRent: number (minimum rent in KES, or omit)
- bedrooms: number (number of bedrooms, or omit)
- propertyType: string (one of the available types, or omit)

Do NOT include any other fields.`;

            const filterResponse = await invokeLLM({
              messages: [{ role: "user", content: filterPrompt }],
              response_format: {
                type: "json_schema",
                json_schema: {
                  name: "search_filters",
                  strict: true,
                  schema: {
                    type: "object",
                    properties: {
                      city: { type: "string", description: "City name" },
                      maxRent: { type: "integer", description: "Maximum rent in KES" },
                      minRent: { type: "integer", description: "Minimum rent in KES" },
                      bedrooms: { type: "integer", description: "Number of bedrooms" },
                      propertyType: { type: "string", description: "Property type" },
                    },
                    required: [],
                    additionalProperties: false,
                  },
                },
              },
            }).catch(async (err) => {
              console.warn("[Chat] LLM json_schema failed, retrying with plain text:", err);
              // Fallback to plain text JSON if json_schema fails
              return invokeLLM({
                messages: [
                  { role: "system", content: "You are a helpful assistant that outputs only valid JSON." },
                  { role: "user", content: filterPrompt }
                ],
              });
            });

            const filterContent = filterResponse.choices[0]?.message?.content;
            let filterData: any = {};
            if (typeof filterContent === "string") {
              // Clean potential markdown code blocks
              const cleaned = filterContent.replace(/```json\n?|\n?```/g, "").trim();
              try {
                filterData = JSON.parse(cleaned);
              } catch (parseErr) {
                console.error("[Chat] Failed to parse filter JSON:", cleaned);
              }
            }

            // Validate and clean filter data
            if (filterData.city) {
              const validCities = ["Nairobi", "Mombasa", "Kisumu", "Nakuru"];
              if (validCities.includes(filterData.city)) filters.city = filterData.city;
            }
            if (typeof filterData.maxRent === "number") filters.maxRent = filterData.maxRent;
            if (typeof filterData.minRent === "number") filters.minRent = filterData.minRent;
            if (typeof filterData.bedrooms === "number") filters.bedrooms = filterData.bedrooms;
            if (filterData.propertyType) {
              const validTypes = ["bedsitter", "1BR", "2BR", "3BR", "apartment", "maisonette"];
              if (validTypes.includes(filterData.propertyType)) filters.propertyType = filterData.propertyType;
            }
          } catch (filterErr) {
            console.error("[Chat] Filter extraction failed:", filterErr);
            // Fallback: try to extract city name via simple regex if LLM fails
            const cityMatch = input.message.match(/(Nairobi|Mombasa|Kisumu|Nakuru)/i);
            if (cityMatch) {
              filters.city = cityMatch[0].charAt(0).toUpperCase() + cityMatch[0].slice(1).toLowerCase();
              console.log("[Chat] Regex fallback extracted city:", filters.city);
            }
          }

          // 2. Search properties
          const matchedProperties = await searchProperties(filters);
          const propertyIds = matchedProperties.map((p) => p.id);

          // 3. Generate conversational response
          const responsePrompt = `You are PataNyumba, a friendly and knowledgeable AI assistant for finding rental properties in Kenya. 

User's message: "${input.message}"

Extracted search filters: ${JSON.stringify(filters)}
Number of matching properties found: ${matchedProperties.length}

${
  matchedProperties.length > 0
    ? `Here are the matching properties:
${matchedProperties
  .map(
    (p) =>
      `- ${p.title} in ${p.location}, ${p.city} — KES ${p.rentPrice.toLocaleString()}/month, ${p.bedrooms}BR, ${p.propertyType}`
  )
  .join("\n")}`
    : "No matching properties were found."
}

Provide a natural, helpful response in 2-4 sentences. Be conversational and friendly. If no results were found, suggest broadening the search. Mention the number of results and give a brief overview. Use KES for currency.`;

          const response = await invokeLLM({
            messages: [{ role: "user", content: responsePrompt }],
          });

          const responseContent = response.choices[0]?.message?.content;
          const assistantContent =
            typeof responseContent === 'string'
              ? responseContent
              : "I apologize, I couldn't process your request. Please try again.";

          // Best-effort: Save assistant message
          try {
            if (conversationId && conversationId > 0) {
              await addMessage(
                conversationId,
                "assistant",
                assistantContent,
                propertyIds.length > 0 ? JSON.stringify(propertyIds) : undefined
              );
            }
          } catch (dbError) {
            console.error("[Chat] Failed to save assistant message to DB:", dbError);
          }

          return {
            conversationId: conversationId ?? 0,
            assistantMessage: assistantContent,
            properties: matchedProperties,
          };
        } catch (error: any) {
          console.error("[Chat] AI processing error:", error);

          // Fallback: return basic search
          const fallbackProperties = await searchProperties({});
          
          // Provide more context in the fallback message if it's an API error
          let fallbackMessage = "I'm having trouble processing your request right now. Please try again, or browse our featured listings below.";
          if (error?.message?.includes("API_KEY")) {
            fallbackMessage = "I'm having trouble connecting to my AI backend. Please check the API configuration or try again later.";
          }

          // Best-effort: save error message
          try {
            if (conversationId && conversationId > 0) {
              await addMessage(conversationId, "assistant", fallbackMessage);
            }
          } catch (dbError) {
            console.error("[Chat] Failed to save fallback message to DB:", dbError);
          }

          return {
            conversationId: conversationId ?? 0,
            assistantMessage: fallbackMessage,
            properties: fallbackProperties,
          };
        }
      }),

    /**
     * Get conversation history with messages and property details.
     */
    getHistory: publicProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ input }) => {
        const conversation = await getConversation(input.conversationId);
        if (!conversation) return null;

        const messages = await getConversationMessages(input.conversationId);

        // Collect all property IDs from assistant messages
        const allPropertyIds = new Set<string | number>();
        for (const msg of messages) {
          if (msg.propertyIds) {
            try {
              const ids = JSON.parse(msg.propertyIds);
              ids.forEach((id: string | number) => allPropertyIds.add(id));
            } catch {
              // ignore parse errors
            }
          }
        }

        const allProperties =
          allPropertyIds.size > 0
            ? await getPropertiesByIds(Array.from(allPropertyIds))
            : [];

        const propertyMap = new Map<string | number, typeof allProperties[0]>();
        allProperties.forEach((p) => propertyMap.set(p.id, p));

        // Build enriched messages
        const enrichedMessages = messages.map((msg) => ({
          ...msg,
          messageProperties: msg.propertyIds
            ? (() => {
                try {
                  const ids: (string | number)[] = JSON.parse(msg.propertyIds);
                  return ids
                    .map((id) => propertyMap.get(id))
                    .filter(Boolean);
                } catch {
                  return [];
                }
              })()
            : [],
        }));

        return {
          conversation,
          messages: enrichedMessages,
        };
      }),

    /**
     * Create a new conversation.
     */
    create: publicProcedure.mutation(async ({ ctx }) => {
      const id = await createConversation(ctx.user?.id, "New Chat");
      return { conversationId: id };
    }),
  }),

  // ─── Favorites Endpoints ──────────────────────────────────────────

  favorites: router({
    /**
     * Toggle a property favorite. Returns the new state.
     */
    toggle: publicProcedure
      .input(z.object({ propertyId: z.union([z.string(), z.number()]) }))
      .mutation(async ({ input, ctx }) => {
        try {
          // Check if already favorited
          const existing = await getFavorites(ctx.user?.id);
          const isFav = existing.some((f) => f.propertyId === String(input.propertyId));

          if (isFav) {
            await removeFavorite(input.propertyId);
            return { isFavorite: false };
          } else {
            await addFavorite(input.propertyId, ctx.user?.id);
            return { isFavorite: true };
          }
        } catch {
          return { isFavorite: false };
        }
      }),

    /**
     * Get all favorited properties.
     */
    list: publicProcedure.query(async ({ ctx }) => {
      const favs = await getFavorites(ctx.user?.id);
      const propertyIds = favs.map((f) => f.propertyId);
      if (propertyIds.length === 0) return [];
      const props = await getPropertiesByIds(propertyIds);
      return props;
    }),

    /**
     * Check if a specific property is favorited.
     */
    check: publicProcedure
      .input(z.object({ propertyId: z.union([z.string(), z.number()]) }))
      .query(async ({ input }) => {
        const favs = await getFavorites();
        const isFav = favs.some((f) => f.propertyId === String(input.propertyId));
        return { isFavorite: isFav };
      }),
  }),
});

export type AppRouter = typeof appRouter;
