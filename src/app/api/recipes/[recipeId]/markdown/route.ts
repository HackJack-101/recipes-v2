import { requireRecipe } from "@/lib/access";
import { attachment, recipeMarkdown } from "@/lib/export";
import { slugify } from "@/lib/markdown";
import { loadRecipe } from "@/lib/recipes";

export async function GET(_: Request, { params }: { params: Promise<{ recipeId: string }> }) {
  const { recipe: base } = await requireRecipe((await params).recipeId);
  const recipe = await loadRecipe({ id: base.id });
  if (!recipe) return new Response(null, { status: 404 });
  return new Response(await recipeMarkdown(recipe), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": attachment(`${slugify(recipe.title)}.md`),
    },
  });
}
