import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRecipe } from "@/lib/access";
import { loadRecipe } from "@/lib/recipes";
import { RecipeActions } from "@/components/recipe/recipe-actions";
import { RecipeBody } from "@/components/recipe/recipe-body";
import { RecipeHeader } from "@/components/recipe/recipe-header";

type Props = { params: Promise<{ recipeId: string }> };

export async function generateMetadata({ params }: Props) {
  const { recipe } = await requireRecipe((await params).recipeId);
  return { title: recipe.title };
}

export default async function RecipePage({ params }: Props) {
  const { recipe: base } = await requireRecipe((await params).recipeId);
  const recipe = await loadRecipe({ id: base.id });
  if (!recipe) notFound();
  const appUrl = process.env.APP_URL?.replace(/\/$/, "") ?? "";

  return (
    <article>
      <div className="no-print mb-4 flex items-center justify-between gap-2">
        <Link
          href={`/kitchens/${recipe.kitchenId}`}
          className="-ml-2 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          <span className="max-w-[45vw] truncate">{recipe.kitchen.name}</span>
        </Link>
        <RecipeActions recipeId={recipe.id} shareUrl={recipe.shareToken ? `${appUrl}/share/${recipe.shareToken}` : null} appUrl={appUrl} />
      </div>
      <RecipeHeader recipe={recipe} />
      <RecipeBody
        servings={recipe.servings}
        ingredients={recipe.ingredients}
        steps={recipe.steps.map((s) => s.text)}
      />
    </article>
  );
}
