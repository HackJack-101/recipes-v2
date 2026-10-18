import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Runs against a real Postgres when TEST_DATABASE_URL is set (CI provides one).
const url = process.env.TEST_DATABASE_URL;
vi.mock("server-only", () => ({}));

describe.skipIf(!url)("recipes (database)", async () => {
  // Vitest still collects a skipped suite's body; don't import the db without a URL.
  if (!url) return;
  process.env.DATABASE_URL = url;
  const { db } = await import("@/db");
  const { setupDatabase } = await import("@/db/setup");
  const { kitchens, tags, users } = await import("@/db/schema");
  const { kitchenTagCounts, kitchenTags, loadRecipe, saveRecipe, searchRecipes, toRecipeInput } = await import("./recipes");
  const { eq } = await import("drizzle-orm");

  let kitchenId: string;
  let userId: string;

  beforeAll(async () => {
    await setupDatabase();
    const suffix = Math.random().toString(36).slice(2);
    [{ id: userId }] = await db
      .insert(users)
      .values({ email: `cook-${suffix}@test.local`, name: "Cook", passwordHash: "x" })
      .returning({ id: users.id });
    [{ id: kitchenId }] = await db.insert(kitchens).values({ name: `Test ${suffix}` }).returning({ id: kitchens.id });
  });

  afterAll(async () => {
    await db.delete(kitchens).where(eq(kitchens.id, kitchenId));
    await db.delete(users).where(eq(users.id, userId));
  });

  const crepes = {
    title: "Crêpes",
    description: "Thin French pancakes",
    servings: 4,
    prepMinutes: 10,
    cookMinutes: 20,
    tags: ["dessert", "french"],
    ingredients: [
      { quantity: 250, unit: "g", name: "flour" },
      { quantity: null, unit: "", name: "salt" },
    ],
    steps: ["Mix", "Cook"],
  };

  it("saves and loads a recipe in order", async () => {
    const id = await saveRecipe(kitchenId, crepes, userId);
    const loaded = await loadRecipe({ id });
    expect(loaded && toRecipeInput(loaded)).toEqual(crepes);
  });

  it("searches titles, descriptions and tags, and filters by tag", async () => {
    await saveRecipe(kitchenId, { ...crepes, title: "Ratatouille", description: "Provençal stew", tags: ["vegetarian"] }, userId);
    expect((await searchRecipes(kitchenId, "crêp", null)).map((r) => r.title)).toEqual(["Crêpes"]);
    expect((await searchRecipes(kitchenId, "stew", null)).map((r) => r.title)).toEqual(["Ratatouille"]);
    expect((await searchRecipes(kitchenId, "VEGETAR", null)).map((r) => r.title)).toEqual(["Ratatouille"]);
    expect((await searchRecipes(kitchenId, "", "dessert")).map((r) => r.title)).toEqual(["Crêpes"]);
    expect((await searchRecipes(kitchenId, "100%", null))).toEqual([]);
    const [card] = await searchRecipes(kitchenId, "crêpes", null);
    expect(card.totalMinutes).toBe(30);
  });

  it("replaces content on update and prunes unused tags", async () => {
    const id = await saveRecipe(kitchenId, { ...crepes, title: "Galettes", tags: ["only-here"] }, userId);
    await saveRecipe(kitchenId, { ...crepes, title: "Galettes", tags: ["savory"], steps: ["One step"] }, userId, id);
    const loaded = await loadRecipe({ id });
    expect(loaded?.steps.map((s) => s.text)).toEqual(["One step"]);
    expect(loaded?.tags).toEqual(["savory"]);
    expect(await kitchenTags(kitchenId)).not.toContain("only-here");
    const all = await db.select().from(tags).where(eq(tags.kitchenId, kitchenId));
    expect(all.map((t) => t.name).sort()).toEqual(["dessert", "french", "savory", "vegetarian"]);
  });

  it("counts tag uses, most used first, then by name", async () => {
    await saveRecipe(kitchenId, { ...crepes, title: "Clafoutis", tags: ["dessert", "savory"] }, userId);
    await saveRecipe(kitchenId, { ...crepes, title: "Far breton", tags: ["dessert"] }, userId);
    expect(await kitchenTagCounts(kitchenId)).toEqual([
      { name: "dessert", count: 3 },
      { name: "savory", count: 2 },
      { name: "french", count: 1 },
      { name: "vegetarian", count: 1 },
    ]);
  });
});
