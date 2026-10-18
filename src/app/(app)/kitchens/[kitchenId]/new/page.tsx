import { getTranslations } from "next-intl/server";
import { requireKitchen } from "@/lib/access";
import { emptyRecipe } from "@/lib/recipe-input";
import { kitchenTags } from "@/lib/recipes";
import { PageTitle } from "@/components/layout/page-title";
import { RecipeEditor } from "@/components/recipe/recipe-editor";

type Props = { params: Promise<{ kitchenId: string }> };

export async function generateMetadata() {
  return { title: (await getTranslations("editor"))("newTitle") };
}

export default async function NewRecipePage({ params }: Props) {
  const { kitchen } = await requireKitchen((await params).kitchenId);
  const t = await getTranslations("editor");
  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle back={{ href: `/kitchens/${kitchen.id}`, label: kitchen.name }}>{t("newTitle")}</PageTitle>
      <RecipeEditor
        target={{ kitchenId: kitchen.id }}
        initial={emptyRecipe()}
        kitchenTags={await kitchenTags(kitchen.id)}
        cancelHref={`/kitchens/${kitchen.id}`}
      />
    </div>
  );
}
