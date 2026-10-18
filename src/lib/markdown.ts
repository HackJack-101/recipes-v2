import type { RecipeInput } from "./recipe-input";
import { formatQuantity } from "./scaler";

export type MarkdownLabels = {
  servings: string;
  prep: string;
  cook: string;
  ingredients: string;
  steps: string;
  tags: string;
  minutes: string;
};

export function recipeToMarkdown(recipe: RecipeInput, labels: MarkdownLabels): string {
  const lines: string[] = [`# ${recipe.title}`, ""];
  if (recipe.description) lines.push(recipe.description, "");

  const meta: string[] = [];
  if (recipe.servings) meta.push(`**${labels.servings}:** ${recipe.servings}`);
  if (recipe.prepMinutes) meta.push(`**${labels.prep}:** ${recipe.prepMinutes} ${labels.minutes}`);
  if (recipe.cookMinutes) meta.push(`**${labels.cook}:** ${recipe.cookMinutes} ${labels.minutes}`);
  if (recipe.tags.length) meta.push(`**${labels.tags}:** ${recipe.tags.join(", ")}`);
  if (meta.length) lines.push(meta.join("  \n"), "");

  if (recipe.ingredients.length) {
    lines.push(`## ${labels.ingredients}`, "");
    for (const i of recipe.ingredients) {
      const qty = i.quantity == null ? "" : formatQuantity(i.quantity);
      lines.push(`- ${[qty, i.unit, i.name].filter(Boolean).join(" ")}`);
    }
    lines.push("");
  }

  if (recipe.steps.length) {
    lines.push(`## ${labels.steps}`, "");
    recipe.steps.forEach((s, n) => lines.push(`${n + 1}. ${s.replace(/\n+/g, " ")}`));
    lines.push("");
  }
  return lines.join("\n");
}

/** A filesystem-safe, readable file name for a recipe. */
export function slugify(title: string) {
  return (
    title
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "recipe"
  );
}
