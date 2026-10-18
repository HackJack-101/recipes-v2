"use server";

import { randomBytes } from "node:crypto";
import { and, eq, inArray, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { photos, recipes } from "@/db/schema";
import { requireKitchen, requireRecipe } from "@/lib/access";
import { aiImportEnabled, extractRecipe, NoRecipeFound, type ImportSource } from "@/lib/ai-import";
import { deletePhotoFile, storePhoto } from "@/lib/photos";
import { recipeInput, type RecipeInput } from "@/lib/recipe-input";
import { kitchenTags, pruneUnusedTags, saveRecipe } from "@/lib/recipes";

export type SaveResult = { error: string } | undefined;

/**
 * Saves the editor: `data` is the recipe as JSON, `photos` new files,
 * `removePhotos` ids to delete. Redirects to the recipe on success.
 */
export async function saveRecipeAction(
  target: { kitchenId: string } | { recipeId: string },
  formData: FormData,
): Promise<SaveResult> {
  const t = await getTranslations("editor");
  const ctx =
    "recipeId" in target
      ? await requireRecipe(target.recipeId).then((r) => ({ user: r.user, kitchenId: r.recipe.kitchenId, recipeId: r.recipe.id }))
      : await requireKitchen(target.kitchenId).then((k) => ({ user: k.user, kitchenId: k.kitchen.id, recipeId: undefined }));

  let input: RecipeInput;
  try {
    input = recipeInput.parse(JSON.parse(String(formData.get("data"))));
  } catch {
    return { error: t("invalid") };
  }

  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  let stored: Awaited<ReturnType<typeof storePhoto>>[];
  try {
    stored = await Promise.all(files.map(storePhoto));
  } catch {
    return { error: t("photoError") };
  }

  const recipeId = await saveRecipe(ctx.kitchenId, input, ctx.user.id, ctx.recipeId);

  const removeIds = formData.getAll("removePhotos").map(String);
  if (removeIds.length) {
    const removed = await db
      .delete(photos)
      .where(and(eq(photos.recipeId, recipeId), inArray(photos.id, removeIds)))
      .returning({ fileName: photos.fileName });
    await Promise.all(removed.map((p) => deletePhotoFile(p.fileName)));
  }
  if (stored.length) {
    const [{ last }] = await db.select({ last: max(photos.position) }).from(photos).where(eq(photos.recipeId, recipeId));
    const start = (last ?? -1) + 1;
    await db.insert(photos).values(stored.map((p, i) => ({ ...p, recipeId, position: start + i })));
  }

  revalidatePath(`/kitchens/${ctx.kitchenId}`);
  redirect(`/recipes/${recipeId}`);
}

export async function deleteRecipeAction(recipeId: string) {
  const { recipe } = await requireRecipe(recipeId);
  const removed = await db.select({ fileName: photos.fileName }).from(photos).where(eq(photos.recipeId, recipe.id));
  await db.delete(recipes).where(eq(recipes.id, recipe.id));
  await pruneUnusedTags(db, recipe.kitchenId);
  await Promise.all(removed.map((p) => deletePhotoFile(p.fileName)));
  revalidatePath(`/kitchens/${recipe.kitchenId}`);
  redirect(`/kitchens/${recipe.kitchenId}`);
}

export async function setSharingAction(recipeId: string, shared: boolean) {
  const { recipe } = await requireRecipe(recipeId);
  const shareToken = shared ? (recipe.shareToken ?? randomBytes(18).toString("base64url")) : null;
  await db.update(recipes).set({ shareToken }).where(eq(recipes.id, recipe.id));
  revalidatePath(`/recipes/${recipe.id}`);
  return shareToken;
}

export type ImportResult = { recipe: RecipeInput } | { error: string };

export async function importRecipeAction(kitchenId: string, source: ImportSource): Promise<ImportResult> {
  await requireKitchen(kitchenId);
  const t = await getTranslations("import");
  if (!aiImportEnabled()) return { error: t("disabled") };
  try {
    return { recipe: await extractRecipe(source, await kitchenTags(kitchenId)) };
  } catch (err) {
    if (err instanceof NoRecipeFound) return { error: t("noRecipe") };
    console.error("[import]", err);
    return { error: source.kind === "url" ? t("fetchFailed") : t("failed") };
  }
}
