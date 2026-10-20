import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Runs against a real Postgres when TEST_DATABASE_URL is set (CI provides one).
const url = process.env.TEST_DATABASE_URL;
vi.mock("server-only", () => ({}));

describe.skipIf(!url)("recipes (database)", async () => {
  // Vitest still collects a skipped suite's body; don't import the db without a URL.
  if (!url) return;
  process.env.DATABASE_URL = url;
  const { db } = await import("@/db");
  const { fillTagSlugs, setupDatabase } = await import("@/db/setup");
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
      { name: "dessert", slug: "dessert", count: 3 },
      { name: "savory", slug: "savory", count: 2 },
      { name: "french", slug: "french", count: 1 },
      { name: "vegetarian", slug: "vegetarian", count: 1 },
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

  it("matches tags by slug and keeps the first spelling", async () => {
    const id = await saveRecipe(kitchenId, { ...crepes, title: "Tarte", tags: ["Plat principal", "Végé"] }, userId);
    await saveRecipe(kitchenId, { ...crepes, title: "Quiche", tags: ["plat-principal", "VEGE"] }, userId);
    expect((await loadRecipe({ id }))?.tags).toEqual(["Plat principal", "Végé"]);
    const [quiche] = await searchRecipes(kitchenId, userId, "quiche", null);
    expect(quiche.tags).toEqual(["Plat principal", "Végé"]);
    const titles = async (q: string, tag: string | null) => (await searchRecipes(kitchenId, userId, q, tag)).map((r) => r.title);
    expect(await titles("", "plat-principal")).toEqual(["Quiche", "Tarte"]);
    expect(await titles("", "Plat principal")).toEqual(["Quiche", "Tarte"]);
    expect(await titles("plat princ", null)).toEqual(["Quiche", "Tarte"]);
    expect(await titles("", "végé")).toEqual(["Quiche", "Tarte"]);
    expect(await titles("vege", null)).toEqual(expect.arrayContaining(["Quiche", "Tarte"]));
    expect((await kitchenTagCounts(kitchenId)).find((t) => t.slug === "plat-principal")).toEqual({
      name: "Plat principal",
      slug: "plat-principal",
      count: 2,
    });
  });

  it("fills in slugs for tags created before them, merging duplicates", async () => {
    const cards = await searchRecipes(kitchenId, userId, "", null);
    const id = (title: string) => cards.find((c) => c.title === title)!.id;
    const legacy = await db
      .insert(tags)
      .values(["Fête", "fête", "Dessert"].map((name) => ({ kitchenId, name })))
      .returning({ id: tags.id });
    await db.insert(recipeTags).values([
      { recipeId: id("Clafoutis"), tagId: legacy[0].id },
      { recipeId: id("Clafoutis"), tagId: legacy[1].id },
      { recipeId: id("Galettes"), tagId: legacy[1].id },
      { recipeId: id("Galettes"), tagId: legacy[2].id },
      { recipeId: id("Crêpes"), tagId: legacy[2].id }, // already tagged "dessert"
    ]);

    await fillTagSlugs();
    await fillTagSlugs(); // idempotent
    const counts = await kitchenTagCounts(kitchenId);
    expect(counts.find((t) => t.slug === "dessert")).toEqual({ name: "dessert", slug: "dessert", count: 4 });
    expect(counts.find((t) => t.slug === "fete")).toMatchObject({ slug: "fete", count: 2 });
    expect(counts.filter((t) => t.slug === "fete")).toHaveLength(1);
    expect((await searchRecipes(kitchenId, userId, "", "fete")).map((r) => r.title)).toEqual(["Clafoutis", "Galettes"]);
  });
});
