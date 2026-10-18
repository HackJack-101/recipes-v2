import "server-only";
import { asc, eq } from "drizzle-orm";
import JSZip from "jszip";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { recipes } from "@/db/schema";
import { recipeToMarkdown, slugify, type MarkdownLabels } from "./markdown";
import { loadRecipe, toRecipeInput, type FullRecipe } from "./recipes";

export async function markdownLabels(): Promise<MarkdownLabels> {
  const t = await getTranslations("recipe");
  return {
    servings: t("servings"),
    prep: t("prep"),
    cook: t("cook"),
    ingredients: t("ingredients"),
    steps: t("steps"),
    tags: t("tags"),
    minutes: "min",
  };
}

export async function recipeMarkdown(recipe: FullRecipe) {
  return recipeToMarkdown(toRecipeInput(recipe), await markdownLabels());
}

export async function kitchenZip(kitchenId: string) {
  const labels = await markdownLabels();
  const rows = await db.select({ id: recipes.id }).from(recipes).where(eq(recipes.kitchenId, kitchenId)).orderBy(asc(recipes.title));
  const zip = new JSZip();
  const used = new Set<string>();
  for (const { id } of rows) {
    const recipe = await loadRecipe({ id });
    if (!recipe) continue;
    const base = slugify(recipe.title);
    let name = `${base}.md`;
    for (let n = 2; used.has(name); n++) name = `${base}-${n}.md`;
    used.add(name);
    zip.file(name, recipeToMarkdown(toRecipeInput(recipe), labels));
  }
  return zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });
}

export function attachment(fileName: string) {
  return `attachment; filename="${fileName.replace(/[^\w.-]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
