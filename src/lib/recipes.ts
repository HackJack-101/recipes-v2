import "server-only";
import { and, asc, count, desc, eq, exists, ilike, inArray, or, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { favorites, ingredients, photos, recipes, recipeTags, steps, tags } from "@/db/schema";
import type { RecipeInput } from "./recipe-input";

export type FullRecipe = NonNullable<Awaited<ReturnType<typeof loadRecipe>>>;

export async function loadRecipe(where: { id: string } | { shareToken: string }) {
  const recipe = await db.query.recipes.findFirst({
    where: "id" in where ? eq(recipes.id, where.id) : eq(recipes.shareToken, where.shareToken),
    with: {
      ingredients: { orderBy: asc(ingredients.position) },
      steps: { orderBy: asc(steps.position) },
      photos: { orderBy: asc(photos.position) },
      recipeTags: { with: { tag: true } },
      kitchen: true,
    },
  });
  if (!recipe) return null;
  const { recipeTags: rt, ...rest } = recipe;
  return { ...rest, tags: rt.map((t) => t.tag.name).sort() };
}

export function toRecipeInput(r: FullRecipe): RecipeInput {
  return {
    title: r.title,
    description: r.description,
    servings: r.servings,
    prepMinutes: r.prepMinutes,
    cookMinutes: r.cookMinutes,
    tags: r.tags,
    ingredients: r.ingredients.map(({ quantity, unit, name }) => ({ quantity, unit, name })),
    steps: r.steps.map((s) => s.text),
  };
}

/** Creates or fully replaces a recipe's content. Returns its id. */
export async function saveRecipe(kitchenId: string, input: RecipeInput, userId: string, recipeId?: string) {
  return db.transaction(async (tx) => {
    const values = {
      title: input.title,
      description: input.description,
      servings: input.servings,
      prepMinutes: input.prepMinutes,
      cookMinutes: input.cookMinutes,
      updatedAt: new Date(),
    };
    let id = recipeId;
    if (id) {
      await tx.update(recipes).set(values).where(eq(recipes.id, id));
      await tx.delete(ingredients).where(eq(ingredients.recipeId, id));
      await tx.delete(steps).where(eq(steps.recipeId, id));
      await tx.delete(recipeTags).where(eq(recipeTags.recipeId, id));
    } else {
      [{ id }] = await tx
        .insert(recipes)
        .values({ ...values, kitchenId, createdBy: userId })
        .returning({ id: recipes.id });
    }
    const rid = id!;

    if (input.ingredients.length) {
      await tx.insert(ingredients).values(input.ingredients.map((i, position) => ({ ...i, position, recipeId: rid })));
    }
    if (input.steps.length) {
      await tx.insert(steps).values(input.steps.map((text, position) => ({ text, position, recipeId: rid })));
    }
    const tagIds = await ensureTags(tx, kitchenId, input.tags);
    if (tagIds.length) {
      await tx.insert(recipeTags).values(tagIds.map((tagId) => ({ recipeId: rid, tagId })));
    }
    await pruneUnusedTags(tx, kitchenId);
    return rid;
  });
}

async function ensureTags(tx: Tx, kitchenId: string, names: string[]) {
  const unique = [...new Set(names.map((n) => n.trim().toLowerCase()).filter(Boolean))];
  if (!unique.length) return [];
  await tx
    .insert(tags)
    .values(unique.map((name) => ({ kitchenId, name })))
    .onConflictDoNothing();
  const rows = await tx
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.kitchenId, kitchenId), inArray(tags.name, unique)));
  return rows.map((r) => r.id);
}

export async function pruneUnusedTags(tx: Tx | typeof db, kitchenId: string) {
  await tx
    .delete(tags)
    .where(
      and(
        eq(tags.kitchenId, kitchenId),
        sql`not exists (select 1 from ${recipeTags} where ${recipeTags.tagId} = ${tags.id})`,
      ),
    );
}

export async function kitchenTags(kitchenId: string) {
  const rows = await db.select({ name: tags.name }).from(tags).where(eq(tags.kitchenId, kitchenId)).orderBy(asc(tags.name));
  return rows.map((r) => r.name);
}

/** Tags with how many recipes use them, most used first. */
export async function kitchenTagCounts(kitchenId: string) {
  const uses = count(recipeTags.recipeId);
  return db
    .select({ name: tags.name, count: uses })
    .from(tags)
    .innerJoin(recipeTags, eq(recipeTags.tagId, tags.id))
    .where(eq(tags.kitchenId, kitchenId))
    .groupBy(tags.id)
    .orderBy(desc(uses), asc(tags.name));
}

export type RecipeCard = {
  id: string;
  title: string;
  totalMinutes: number | null;
  tags: string[];
  coverPhotoId: string | null;
  favorite: boolean;
};

const byTitle = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

/** The user's favorites first, then alphabetical (ignoring case and accents). */
export const compareCards = (a: RecipeCard, b: RecipeCard) =>
  Number(b.favorite) - Number(a.favorite) || byTitle.compare(a.title, b.title);

export async function isFavorite(userId: string, recipeId: string) {
  const [row] = await db
    .select({ one: sql`1` })
    .from(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.recipeId, recipeId)))
    .limit(1);
  return Boolean(row);
}

export async function setFavorite(userId: string, recipeId: string, favorite: boolean) {
  if (favorite) await db.insert(favorites).values({ userId, recipeId }).onConflictDoNothing();
  else await db.delete(favorites).where(and(eq(favorites.userId, userId), eq(favorites.recipeId, recipeId)));
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export async function searchRecipes(
  kitchenId: string,
  userId: string,
  query: string,
  tag: string | null,
): Promise<RecipeCard[]> {
  const conditions = [eq(recipes.kitchenId, kitchenId)];
  const q = query.trim();
  if (q) {
    const pattern = `%${escapeLike(q)}%`;
    conditions.push(
      or(
        ilike(recipes.title, pattern),
        ilike(recipes.description, pattern),
        exists(
          db
            .select({ one: sql`1` })
            .from(recipeTags)
            .innerJoin(tags, eq(tags.id, recipeTags.tagId))
            .where(and(eq(recipeTags.recipeId, recipes.id), ilike(tags.name, pattern))),
        ),
      )!,
    );
  }
  if (tag) {
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(recipeTags)
          .innerJoin(tags, eq(tags.id, recipeTags.tagId))
          .where(and(eq(recipeTags.recipeId, recipes.id), eq(tags.name, tag))),
      ),
    );
  }

  const [rows, favoriteRows] = await Promise.all([
    db.query.recipes.findMany({
      where: and(...conditions),
      columns: { id: true, title: true, prepMinutes: true, cookMinutes: true },
      with: {
        photos: { columns: { id: true }, orderBy: asc(photos.position), limit: 1 },
        recipeTags: { with: { tag: { columns: { name: true } } } },
      },
    }),
    db
      .select({ recipeId: favorites.recipeId })
      .from(favorites)
      .innerJoin(recipes, eq(recipes.id, favorites.recipeId))
      .where(and(eq(favorites.userId, userId), eq(recipes.kitchenId, kitchenId))),
  ]);
  const favoriteIds = new Set(favoriteRows.map((f) => f.recipeId));

  return rows
    .map((r) => ({
      id: r.id,
      title: r.title,
      totalMinutes: r.prepMinutes == null && r.cookMinutes == null ? null : (r.prepMinutes ?? 0) + (r.cookMinutes ?? 0),
      tags: r.recipeTags.map((t) => t.tag.name).sort(),
      coverPhotoId: r.photos[0]?.id ?? null,
      favorite: favoriteIds.has(r.id),
    }))
    .sort(compareCards);
}
