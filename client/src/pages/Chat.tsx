import { useState, useEffect, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { PropertyCard, type PropertyData } from "@/components/PropertyCard";
import { Home, Send, Sparkles, Loader2, ArrowLeft, MessageSquare } from "lucide-react";
import { Streamdown } from "streamdown";
import { Link } from "wouter";

const CHAT_STORAGE_KEY = "patanyumba_chat_state";
const CONVERSATION_ID_STORAGE_KEY = "patanyumba_conversation_id";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  propertyIds: string | null;
  messageProperties: PropertyData[];
}

// Allow loose property types from the server
type LooseProperty = Omit<PropertyData, 'createdAt' | 'updatedAt'> & {
  createdAt?: Date;
  updatedAt?: Date;
};

const SUGGESTED_PROMPTS = [
  "I need a 2-bedroom house in Eldoret under KSh 25,000",
  "Find me a bedsitter in Nairobi under KSh 10,000",
  "Looking for a 1BR apartment in Mombasa near the beach",
  "Show me properties in Kisumu under KSh 15,000",
];

const PRICE_RANGES = [
  { label: "Under KES 10K", min: 0, max: 10000 },
  { label: "KES 10K - 25K", min: 10000, max: 25000 },
  { label: "KES 25K - 50K", min: 25000, max: 50000 },
  { label: "Above KES 50K", min: 50000, max: undefined },
];

const CITIES = ["Nairobi", "Mombasa", "Kisumu", "Nakuru"];
const BEDROOMS = [0, 1, 2, 3];
const PROPERTY_TYPES = ["bedsitter", "1BR", "2BR", "3BR", "apartment", "maisonette"];

// localStorage helpers
function loadChatState(): { messages: ChatMessage[]; conversationId: number | null } | null {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Convert date strings back to Date objects
    const messages: ChatMessage[] = (parsed.messages || []).map((m: ChatMessage) => ({
      ...m,
      messageProperties: (m.messageProperties || []).map((p: any) => ({
        ...p,
        createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
        updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
      })),
    }));
    return {
      messages,
      conversationId: parsed.conversationId || null,
    };
  } catch {
    return null;
  }
}

function saveChatState(conversationId: number | null, messages: ChatMessage[]) {
  try {
    // Only store the last 50 messages to keep localStorage manageable
    const trimmedMessages = messages.slice(-50);
    const state = { conversationId, messages: trimmedMessages };
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage full — silently fail
  }
}

function loadConversationId(): number | null {
  try {
    const raw = localStorage.getItem(CONVERSATION_ID_STORAGE_KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

function saveConversationId(id: number | null) {
  try {
    if (id !== null) {
      localStorage.setItem(CONVERSATION_ID_STORAGE_KEY, String(id));
    } else {
      localStorage.removeItem(CONVERSATION_ID_STORAGE_KEY);
    }
  } catch {
    // silently fail
  }
}

/** Wipe all chat-related localStorage keys and reset to a clean state. */
function clearChatStorage() {
  try {
    localStorage.removeItem(CHAT_STORAGE_KEY);
    localStorage.removeItem(CONVERSATION_ID_STORAGE_KEY);
  } catch {
    // silently fail
  }
}

export default function Chat() {
  // Initialize from localStorage on mount
  const [conversationId, setConversationId] = useState<number | null>(() => {
    const saved = loadConversationId();
    if (saved) return saved;
    const chatState = loadChatState();
    return chatState?.conversationId || null;
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const chatState = loadChatState();
    return chatState?.messages || [];
  });

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  // Track whether we've already attempted to validate the stored conversation ID
  const [historyValidated, setHistoryValidated] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filters
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedPriceRange, setSelectedPriceRange] = useState<{ min: number; max?: number } | null>(null);
  const [selectedBedrooms, setSelectedBedrooms] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const sendMessage = trpc.chat.sendMessage.useMutation();

  // Fetch history only when we have a conversationId and haven't validated yet.
  // retry: false prevents React Query from retrying on a stale/invalid ID, which
  // would delay the recovery path by up to ~30 seconds.
  const getHistory = trpc.chat.getHistory.useQuery(
    { conversationId: conversationId! },
    {
      enabled: !!conversationId && !historyValidated,
      retry: false,
      staleTime: Infinity, // once loaded, don't re-fetch automatically
    }
  );

  // Handle history load: validate the server response and recover from stale IDs.
  useEffect(() => {
    if (!conversationId) {
      setHistoryValidated(true);
      return;
    }

    // Query is still in-flight — wait for it to settle.
    if (getHistory.isLoading) return;

    // The query has settled (either success or error).
    setHistoryValidated(true);

    if (getHistory.isError) {
      // Network or server error while fetching history — clear the stale ID and
      // start fresh so the user can still send new messages.
      console.warn("[Chat] Failed to load conversation history — clearing stale conversation ID.", getHistory.error);
      clearChatStorage();
      setConversationId(null);
      setMessages([]);
      return;
    }

    if (getHistory.data === null || getHistory.data === undefined) {
      // The server returned null, meaning the conversation no longer exists
      // (e.g. after a server restart that wiped the database).  Clear the stale
      // ID so subsequent messages create a fresh conversation.
      console.warn("[Chat] Stored conversation ID is no longer valid — resetting.");
      clearChatStorage();
      setConversationId(null);
      // Keep any locally-cached messages so the user can still read them, but
      // mark them as orphaned by clearing the conversation linkage.
      setMessages((prev) => {
        if (prev.length > 0) {
          saveChatState(null, prev);
        }
        return prev;
      });
      return;
    }

    // Conversation exists on the server — hydrate from server data only when
    // there are no locally-cached messages (avoids overwriting optimistic state).
    if (getHistory.data && messages.length === 0) {
      const enriched: ChatMessage[] = getHistory.data.messages.map(m => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        propertyIds: m.propertyIds,
        messageProperties: (m.messageProperties ?? []).filter((p): p is PropertyData => p != null) as PropertyData[],
      }));
      setMessages(enriched);
      saveChatState(conversationId, enriched);
    }
  }, [getHistory.isLoading, getHistory.isError, getHistory.data, conversationId]);

  // Persist conversation ID whenever it changes
  useEffect(() => {
    saveConversationId(conversationId);
  }, [conversationId]);

  // Persist messages whenever they change
  useEffect(() => {
    saveChatState(conversationId, messages);
  }, [conversationId, messages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      setIsLoading(true);

      // Add user message optimistically
      const userMsg: ChatMessage = {
        id: Date.now(),
        role: "user",
        content: content.trim(),
        propertyIds: null,
        messageProperties: [],
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");

      // Build filters from selected chips
      const filters: Record<string, unknown> = {};
      if (selectedCity) filters.city = selectedCity;
      if (selectedPriceRange) {
        filters.minRent = selectedPriceRange.min;
        if (selectedPriceRange.max !== undefined) filters.maxRent = selectedPriceRange.max;
      }
      if (selectedBedrooms !== null) filters.bedrooms = selectedBedrooms;
      if (selectedType) filters.propertyType = selectedType;

      // Append filter info to message if any filters are active
      const filterContext = Object.keys(filters).length > 0
        ? ` [Filters: ${Object.entries(filters).map(([k, v]) => `${k}: ${v}`).join(", ")}]`
        : "";

      // Capture the current conversationId in a local variable so that if the
      // server rejects it as stale we can reset state correctly.
      const currentConversationId = conversationId;

      try {
        const response = await sendMessage.mutateAsync({
          conversationId: currentConversationId ?? undefined,
          message: content.trim() + filterContext,
        });

        setConversationId(response.conversationId);

        const assistantMsg: ChatMessage = {
          id: Date.now() + 1,
          role: "assistant",
          content: response.assistantMessage,
          propertyIds: JSON.stringify(response.properties.map((p) => p.id)),
          messageProperties: response.properties.filter((p): p is typeof response.properties[0] => !!p),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (error: unknown) {
        console.error("[Chat] Failed to send message:", error);

        // Determine whether the failure is likely caused by a stale conversation
        // ID (e.g. the server restarted and the conversation no longer exists).
        // In that case, clear the stale ID and retry the message as a fresh
        // conversation so the user gets a useful response instead of an error.
        const isStaleConversationError =
          currentConversationId !== null &&
          error instanceof Error &&
          (error.message.toLowerCase().includes("conversation") ||
            error.message.toLowerCase().includes("not found") ||
            error.message.toLowerCase().includes("database"));

        if (isStaleConversationError) {
          console.warn("[Chat] Stale conversation ID detected — retrying as new conversation.");
          clearChatStorage();
          setConversationId(null);

          try {
            const retryResponse = await sendMessage.mutateAsync({
              conversationId: undefined,
              message: content.trim() + filterContext,
            });

            setConversationId(retryResponse.conversationId);

            const assistantMsg: ChatMessage = {
              id: Date.now() + 1,
              role: "assistant",
              content: retryResponse.assistantMessage,
              propertyIds: JSON.stringify(retryResponse.properties.map((p) => p.id)),
              messageProperties: retryResponse.properties.filter(
                (p): p is typeof retryResponse.properties[0] => !!p
              ),
            };
            setMessages((prev) => [...prev, assistantMsg]);
            setIsLoading(false);
            return;
          } catch (retryError) {
            console.error("[Chat] Retry after stale-ID reset also failed:", retryError);
          }
        }

        // Generic error — show a user-friendly message with a hint to try again.
        const errorMsg: ChatMessage = {
          id: Date.now() + 1,
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
          propertyIds: null,
          messageProperties: [],
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId, isLoading, sendMessage, selectedCity, selectedPriceRange, selectedBedrooms, selectedType]
  );

  const handleNewChat = () => {
    setConversationId(null);
    setMessages([]);
    setInput("");
    setSelectedCity(null);
    setSelectedPriceRange(null);
    setSelectedBedrooms(null);
    setSelectedType(null);
    setHistoryValidated(false);
    clearChatStorage();
  };

  const activeFilterCount = [selectedCity, selectedPriceRange, selectedBedrooms, selectedType].filter(Boolean).length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
                <Sparkles className="size-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-sm font-semibold leading-none">PataNyumba</h1>
                <p className="text-xs text-muted-foreground">AI Property Agent</p>
              </div>
            </div>
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleNewChat}>
              <MessageSquare className="size-4 mr-1.5" />
              New Chat
            </Button>
          )}
        </div>
      </header>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto">
        {/* Filter Chips */}
        {activeFilterCount === 0 || messages.length === 0 ? (
          <div className="px-4 pt-4 pb-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Quick Filters
            </p>
            <div className="flex flex-wrap gap-2">
              {/* City chips */}
              {CITIES.map((city) => (
                <Badge
                  key={city}
                  variant={selectedCity === city ? "default" : "outline"}
                  className="cursor-pointer transition-all duration-150 ease-out hover:scale-[1.02] active:scale-[0.97]"
                  onClick={() => setSelectedCity(selectedCity === city ? null : city)}
                >
                  {city}
                </Badge>
              ))}
              {/* Price range chips */}
              {PRICE_RANGES.map((range) => {
                const isActive =
                  selectedPriceRange?.min === range.min &&
                  selectedPriceRange?.max === range.max;
                return (
                  <Badge
                    key={range.label}
                    variant={isActive ? "default" : "outline"}
                    className="cursor-pointer transition-all duration-150 ease-out hover:scale-[1.02] active:scale-[0.97]"
                    onClick={() =>
                      setSelectedPriceRange(isActive ? null : { min: range.min, max: range.max })
                    }
                  >
                    {range.label}
                  </Badge>
                );
              })}
              {/* Bedroom chips */}
              {BEDROOMS.map((b) => (
                <Badge
                  key={`bed-${b}`}
                  variant={selectedBedrooms === b ? "default" : "outline"}
                  className="cursor-pointer transition-all duration-150 ease-out hover:scale-[1.02] active:scale-[0.97]"
                  onClick={() => setSelectedBedrooms(selectedBedrooms === b ? null : b)}
                >
                  {b === 0 ? "Studio" : `${b}BR`}
                </Badge>
              ))}
              {/* Property type chips */}
              {PROPERTY_TYPES.map((type) => (
                <Badge
                  key={type}
                  variant={selectedType === type ? "default" : "outline"}
                  className="cursor-pointer transition-all duration-150 ease-out hover:scale-[1.02] active:scale-[0.97]"
                  onClick={() => setSelectedType(selectedType === type ? null : type)}
                >
                  {type}
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-4 pt-3 pb-1">
            <div className="flex flex-wrap gap-2">
              {selectedCity && (
                <Badge
                  variant="default"
                  className="cursor-pointer"
                  onClick={() => setSelectedCity(null)}
                >
                  {selectedCity} x
                </Badge>
              )}
              {selectedPriceRange && (
                <Badge
                  variant="default"
                  className="cursor-pointer"
                  onClick={() => setSelectedPriceRange(null)}
                >
                  KES {selectedPriceRange.min.toLocaleString()}{selectedPriceRange.max ? `-${selectedPriceRange.max.toLocaleString()}` : "+"} x
                </Badge>
              )}
              {selectedBedrooms !== null && (
                <Badge
                  variant="default"
                  className="cursor-pointer"
                  onClick={() => setSelectedBedrooms(null)}
                >
                  {selectedBedrooms === 0 ? "Studio" : `${selectedBedrooms}BR`} x
                </Badge>
              )}
              {selectedType && (
                <Badge
                  variant="default"
                  className="cursor-pointer"
                  onClick={() => setSelectedType(null)}
                >
                  {selectedType} x
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => {
                  setSelectedCity(null);
                  setSelectedPriceRange(null);
                  setSelectedBedrooms(null);
                  setSelectedType(null);
                }}
              >
                Clear all
              </Button>
            </div>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          <div className="space-y-6 py-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="size-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold mb-2">How can I help you find a home?</h2>
                <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
                  Describe what you're looking for in natural language, and I'll find matching rental properties for you.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleSendMessage(prompt)}
                      className="text-left px-4 py-3 rounded-xl border bg-card text-sm hover:bg-accent transition-all duration-150 ease-out hover:scale-[1.01] active:scale-[0.99] hover:shadow-sm"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={msg.role === "user" ? "flex justify-end" : ""}>
                <div className={`max-w-[85%] ${msg.role === "user" ? "" : "w-full"}`}>
                  {msg.role === "user" ? (
                    <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2.5 text-sm">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <Streamdown>{msg.content}</Streamdown>
                        </div>
                      </div>
                      {msg.messageProperties.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {msg.messageProperties.length} matching {msg.messageProperties.length === 1 ? "property" : "properties"}
                          </p>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {msg.messageProperties.map((prop) => (
                              <PropertyCard key={prop.id} property={prop} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="sticky bottom-0 bg-card/80 backdrop-blur-md border-t px-4 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(input);
            }}
            className="flex gap-2 max-w-4xl mx-auto"
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="Describe the home you're looking for..."
              className="flex-1 resize-none min-h-[44px] max-h-32 rounded-xl"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(input);
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="shrink-0 h-[44px] w-[44px] rounded-xl transition-transform duration-150 ease-out active:scale-[0.97]"
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
