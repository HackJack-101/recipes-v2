import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireRecipe } from "@/lib/access";
import { kitchenTags, loadRecipe, toRecipeInput } from "@/lib/recipes";
import { PageTitle } from "@/components/layout/page-title";
import { RecipeEditor } from "@/components/recipe/recipe-editor";

type Props = { params: Promise<{ recipeId: string }> };

export async function generateMetadata() {
  return { title: (await getTranslations("editor"))("editTitle") };
}

export default async function EditRecipePage({ params }: Props) {
  const { recipe: base } = await requireRecipe((await params).recipeId);
  const recipe = await loadRecipe({ id: base.id });
  if (!recipe) notFound();
  const t = await getTranslations("editor");
  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle back={{ href: `/recipes/${recipe.id}`, label: recipe.title }}>{t("editTitle")}</PageTitle>
      <RecipeEditor
        target={{ recipeId: recipe.id }}
        initial={toRecipeInput(recipe)}
        existingPhotos={recipe.photos.map((p) => ({ id: p.id, url: `/api/photos/${p.id}` }))}
        kitchenTags={await kitchenTags(recipe.kitchenId)}
        cancelHref={`/recipes/${recipe.id}`}
      />
    </div>
  );
}
