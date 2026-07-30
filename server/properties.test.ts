import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createTestContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("properties.featured", () => {
  it("returns an array of featured properties", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.properties.featured();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    // Verify property structure
    const first = result[0];
    expect(first).toHaveProperty("id");
    expect(first).toHaveProperty("title");
    expect(first).toHaveProperty("location");
    expect(first).toHaveProperty("city");
    expect(first).toHaveProperty("rentPrice");
    expect(first).toHaveProperty("bedrooms");
    expect(first).toHaveProperty("bathrooms");
    expect(first).toHaveProperty("propertyType");
    expect(first).toHaveProperty("amenities");
    expect(first).toHaveProperty("isFeatured");
    expect(first?.isFeatured).toBe(1);
  });

  it("returns properties only from the four specified cities", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.properties.featured();
    const validCities = ["Nairobi", "Mombasa", "Kisumu", "Nakuru"];

    result.forEach((property) => {
      expect(validCities).toContain(property.city);
    });
  });
});

describe("properties.search", () => {
  it("searches properties with city filter", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.properties.search({ city: "Nairobi" });

    expect(Array.isArray(result)).toBe(true);
    result.forEach((property) => {
      expect(property.city).toBe("Nairobi");
    });
  });

  it("searches properties with maxRent filter", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.properties.search({ maxRent: 20000 });

    result.forEach((property) => {
      expect(property.rentPrice).toBeLessThanOrEqual(20000);
    });
  });

  it("searches properties with bedrooms filter", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.properties.search({ bedrooms: 2 });

    result.forEach((property) => {
      expect(property.bedrooms).toBe(2);
    });
  });

  it("searches properties with propertyType filter", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.properties.search({ propertyType: "bedsitter" });

    result.forEach((property) => {
      expect(property.propertyType).toBe("bedsitter");
    });
  });

  it("returns empty array when no properties match", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.properties.search({
      city: "Nairobi",
      maxRent: 100,
      propertyType: "maisonette",
    });

    expect(result).toEqual([]);
  });

  it("returns all properties when no filters applied", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.properties.search({});

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("properties.filters", () => {
  it("returns valid cities and property types", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.properties.filters();

    expect(result.cities).toEqual(["Nairobi", "Mombasa", "Kisumu", "Nakuru"]);
    expect(result.propertyTypes).toEqual([
      "bedsitter",
      "1BR",
      "2BR",
      "3BR",
      "apartment",
      "maisonette",
    ]);
  });
});

describe("chat.create", () => {
  it("creates a new conversation and returns its id", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.create();

    expect(result).toHaveProperty("conversationId");
    expect(typeof result.conversationId).toBe("number");
  });
});
