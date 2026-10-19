import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Runs against a real Postgres when TEST_DATABASE_URL is set (CI provides one).
const url = process.env.TEST_DATABASE_URL;
vi.mock("server-only", () => ({}));

describe.skipIf(!url)("recipes (database)", async () => {
  // Vitest still collects a skipped suite's body; don't import the db without a URL.
  if (!url) return;
  process.env.DATABASE_URL = url;
  const { db } = await import("@/db");
  const { setupDatabase, slugifyTags } = await import("@/db/setup");
  const { kitchens, recipeTags, tags, users } = await import("@/db/schema");
  const { isFavorite, kitchenTagCounts, kitchenTags, loadRecipe, saveRecipe, searchRecipes, setFavorite, toRecipeInput } =
    await import("./recipes");
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
    expect((await searchRecipes(kitchenId, userId, "crêp", null)).map((r) => r.title)).toEqual(["Crêpes"]);
    expect((await searchRecipes(kitchenId, userId, "stew", null)).map((r) => r.title)).toEqual(["Ratatouille"]);
    expect((await searchRecipes(kitchenId, userId, "VEGETAR", null)).map((r) => r.title)).toEqual(["Ratatouille"]);
    expect((await searchRecipes(kitchenId, userId, "", "dessert")).map((r) => r.title)).toEqual(["Crêpes"]);
    expect((await searchRecipes(kitchenId, userId, "100%", null))).toEqual([]);
    const [card] = await searchRecipes(kitchenId, userId, "crêpes", null);
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

  it("lists favorites first, then alphabetically, per user", async () => {
    const titles = async (uid: string) => (await searchRecipes(kitchenId, uid, "", null)).map((r) => [r.title, r.favorite]);
    expect(await titles(userId)).toEqual([
      ["Clafoutis", false],
      ["Crêpes", false],
      ["Far breton", false],
      ["Galettes", false],
      ["Ratatouille", false],
    ]);

    const [ratatouille] = await searchRecipes(kitchenId, userId, "ratatouille", null);
    const [far] = await searchRecipes(kitchenId, userId, "far breton", null);
    await setFavorite(userId, ratatouille.id, true);
    await setFavorite(userId, ratatouille.id, true); // idempotent
    await setFavorite(userId, far.id, true);
    expect(await isFavorite(userId, ratatouille.id)).toBe(true);
    expect(await titles(userId)).toEqual([
      ["Far breton", true],
      ["Ratatouille", true],
      ["Clafoutis", false],
      ["Crêpes", false],
      ["Galettes", false],
    ]);

    // Another cook doesn't see someone else's favorites.
    const [{ id: otherId }] = await db
      .insert(users)
      .values({ email: `other-${kitchenId}@test.local`, name: "Other", passwordHash: "x" })
      .returning({ id: users.id });
    expect((await titles(otherId))[0]).toEqual(["Clafoutis", false]);
    await db.delete(users).where(eq(users.id, otherId));

    await setFavorite(userId, far.id, false);
    expect(await isFavorite(userId, far.id)).toBe(false);
    expect((await titles(userId)).slice(0, 2)).toEqual([
      ["Ratatouille", true],
      ["Clafoutis", false],
    ]);
  });

  it("converts tags saved before slugs, merging duplicates", async () => {
    const cards = await searchRecipes(kitchenId, userId, "", null);
    const id = (title: string) => cards.find((c) => c.title === title)!.id;
    const legacy = await db
      .insert(tags)
      .values(["Plat principal", "plat principal", "Dessert"].map((name) => ({ kitchenId, name })))
      .returning({ id: tags.id });
    await db.insert(recipeTags).values([
      { recipeId: id("Clafoutis"), tagId: legacy[0].id },
      { recipeId: id("Clafoutis"), tagId: legacy[1].id },
      { recipeId: id("Galettes"), tagId: legacy[1].id },
      { recipeId: id("Galettes"), tagId: legacy[2].id },
      { recipeId: id("Crêpes"), tagId: legacy[2].id }, // already tagged "dessert"
    ]);

    await slugifyTags();
    await slugifyTags(); // idempotent
    expect(await kitchenTagCounts(kitchenId)).toEqual([
      { name: "dessert", count: 4 },
      { name: "plat-principal", count: 2 },
      { name: "savory", count: 2 },
      { name: "french", count: 1 },
      { name: "vegetarian", count: 1 },
    ]);
    expect((await searchRecipes(kitchenId, userId, "", "Plat principal")).map((r) => r.title)).toEqual(["Clafoutis", "Galettes"]);
    expect((await searchRecipes(kitchenId, userId, "plat princ", null)).map((r) => r.title)).toEqual(["Clafoutis", "Galettes"]);
  });
});
