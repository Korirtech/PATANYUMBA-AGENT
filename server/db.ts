import { and, desc, eq, gte, lte, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, properties, conversations, messages, favorites, Property } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ─── Property Queries (Integrated with Patanyumba-App) ─────────────

export interface PropertyFilters {
  city?: string;
  maxRent?: number;
  minRent?: number;
  bedrooms?: number;
  propertyType?: string;
}

// Map Patanyumba-App property to Agent property
function mapAppPropertyToAgent(appProp: any): Property {
  return {
    id: appProp.id, // Note: App uses UUID string, Agent schema uses int autoincrement. 
    // This might cause issues if Agent logic expects numeric IDs. 
    // However, for display and chat, strings should be fine.
    title: appProp.title,
    location: `${appProp.estate || ""}, ${appProp.town}`,
    city: appProp.county as any, // App uses county, Agent uses city enum
    rentPrice: appProp.price,
    bedrooms: appProp.bedrooms || 0,
    bathrooms: appProp.bathrooms || 0,
    propertyType: appProp.type as any,
    amenities: (appProp.amenities || []).join(", "),
    description: appProp.description,
    landlordName: "Patanyumba",
    landlordPhone: "",
    imageUrl: appProp.images && appProp.images.length > 0 ? appProp.images[0] : null,
    isFeatured: appProp.featured ? 1 : 0,
    createdAt: new Date(appProp.createdAt),
    updatedAt: new Date(appProp.createdAt),
  } as Property;
}

async function fetchAppProperties(): Promise<Property[]> {
  try {
    const url = `${ENV.patanyumbaAppUrl.replace(/\/$/, "")}/api/admin/properties/all`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch properties: ${response.statusText}`);
    }
    const data = await response.json();
    const appProperties = data.properties || [];
    return appProperties.map(mapAppPropertyToAgent);
  } catch (error) {
    console.error("[Integration] Failed to fetch properties from App:", error);
    return [];
  }
}

export async function searchProperties(filters: PropertyFilters) {
  try {
    let allProps = await fetchAppProperties();
    
    // If App fetch fails or is empty, fallback to local DB if available
    if (allProps.length === 0) {
      const db = await getDb();
      if (db) {
        console.log("[Integration] Falling back to local DB for properties");
        const conditions = [];
        if (filters.city) conditions.push(eq(properties.city, filters.city as any));
        if (filters.maxRent !== undefined) conditions.push(lte(properties.rentPrice, filters.maxRent));
        if (filters.minRent !== undefined) conditions.push(gte(properties.rentPrice, filters.minRent));
        if (filters.bedrooms !== undefined) conditions.push(eq(properties.bedrooms, filters.bedrooms));
        if (filters.propertyType) conditions.push(eq(properties.propertyType, filters.propertyType as any));

        const query = db.select().from(properties);
        if (conditions.length > 0) {
          const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
          return await query.where(whereClause).limit(20);
        }
        return await query.limit(20);
      }
      return [];
    }

    // Filter properties in-memory
    let filtered = allProps.filter(p => {
      if (filters.city && p.city !== filters.city) return false;
      if (filters.maxRent !== undefined && p.rentPrice > filters.maxRent) return false;
      if (filters.minRent !== undefined && p.rentPrice < filters.minRent) return false;
      if (filters.bedrooms !== undefined && p.bedrooms !== filters.bedrooms) return false;
      if (filters.propertyType && p.propertyType !== filters.propertyType) return false;
      return true;
    });

    return filtered.slice(0, 20);
  } catch (error) {
    console.error("[Database] Failed to search properties:", error);
    return [];
  }
}

export async function getFeaturedProperties() {
  try {
    let allProps = await fetchAppProperties();
    if (allProps.length === 0) {
      const db = await getDb();
      if (db) {
        return await db.select()
          .from(properties)
          .where(eq(properties.isFeatured, 1))
          .limit(6);
      }
      return [];
    }
    return allProps.filter(p => p.isFeatured === 1).slice(0, 6);
  } catch (error) {
    console.error("[Database] Failed to get featured properties:", error);
    return [];
  }
}

export async function getPropertiesByIds(ids: (number | string)[]) {
  try {
    let allProps = await fetchAppProperties();
    if (allProps.length === 0) {
      const db = await getDb();
      if (db) {
        // Only use numeric IDs for local DB
        const numericIds = ids.filter(id => typeof id === 'number') as number[];
        if (numericIds.length === 0) return [];
        return await db.select()
          .from(properties)
          .where(inArray(properties.id, numericIds));
      }
      return [];
    }
    return allProps.filter(p => ids.includes(p.id));
  } catch (error) {
    console.error("[Database] Failed to get properties by IDs:", error);
    return [];
  }
}

export async function getAllCities() {
  try {
    let allProps = await fetchAppProperties();
    if (allProps.length === 0) {
      const db = await getDb();
      if (db) {
        const result = await db.select({ city: properties.city })
          .from(properties)
          .groupBy(properties.city);
        return result.map(r => r.city);
      }
      return [];
    }
    const cities = new Set(allProps.map(p => p.city));
    return Array.from(cities);
  } catch (error) {
    console.error("[Database] Failed to get cities:", error);
    return [];
  }
}

export async function getAllPropertyTypes() {
  try {
    let allProps = await fetchAppProperties();
    if (allProps.length === 0) {
      const db = await getDb();
      if (db) {
        const result = await db.select({ propertyType: properties.propertyType })
          .from(properties)
          .groupBy(properties.propertyType);
        return result.map(r => r.propertyType);
      }
      return [];
    }
    const types = new Set(allProps.map(p => p.propertyType));
    return Array.from(types);
  } catch (error) {
    console.error("[Database] Failed to get property types:", error);
    return [];
  }
}

// ─── Conversation & Message Queries ────────────────────────────────

export async function createConversation(userId?: number, title?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [result] = await db.insert(conversations)
      .values({ userId: userId ?? null, title: title ?? "New Chat" });
    return result.insertId;
  } catch (error) {
    console.error("[Database] Failed to create conversation:", error);
    throw error;
  }
}

export async function getConversationMessages(conversationId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db.select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
    return result;
  } catch (error) {
    console.error("[Database] Failed to get messages:", error);
    return [];
  }
}

export async function addMessage(
  conversationId: number,
  role: "user" | "assistant",
  content: string,
  propertyIds?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.insert(messages).values({
      conversationId,
      role,
      content,
      propertyIds: propertyIds ?? null,
    });
    return true;
  } catch (error) {
    console.error("[Database] Failed to add message:", error);
    throw error;
  }
}

export async function getConversation(conversationId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] Failed to get conversation:", error);
    return null;
  }
}

// ─── Favorites Queries ─────────────────────────────────────────────

export async function addFavorite(propertyId: number | string, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [result] = await db.insert(favorites).values({
      propertyId: propertyId as any,
      userId: userId ?? null,
    });
    return { id: result.insertId };
  } catch (error) {
    console.error("[Database] Failed to add favorite:", error);
    throw error;
  }
}

export async function removeFavorite(propertyId: number | string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.delete(favorites).where(eq(favorites.propertyId, propertyId as any));
    return true;
  } catch (error) {
    console.error("[Database] Failed to remove favorite:", error);
    throw error;
  }
}

export async function getFavorites(userId?: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const query = db.select().from(favorites);
    if (userId) {
      const result = await query.where(eq(favorites.userId, userId));
      return result;
    }
    return await query;
  } catch (error) {
    console.error("[Database] Failed to get favorites:", error);
    return [];
  }
}

export async function isFavorite(propertyId: number | string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const result = await db.select().from(favorites)
      .where(eq(favorites.propertyId, propertyId as any))
      .limit(1);
    return result.length > 0;
  } catch {
    return false;
  }
}
