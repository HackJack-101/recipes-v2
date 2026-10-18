import { Download, Plus, Settings, Sparkles, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireKitchen } from "@/lib/access";
import { aiImportEnabled } from "@/lib/ai-import";
import { canManageKitchen } from "@/lib/permissions";
import { kitchenTags, searchRecipes } from "@/lib/recipes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RecipeCard } from "@/components/recipe/recipe-card";
import { RecipeFilters } from "@/components/recipe/recipe-filters";

type Props = {
  params: Promise<{ kitchenId: string }>;
  searchParams: Promise<{ q?: string; tag?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { kitchen } = await requireKitchen((await params).kitchenId);
  return { title: kitchen.name };
}

export default async function KitchenPage({ params, searchParams }: Props) {
  const { kitchenId } = await params;
  const { q = "", tag = null } = await searchParams;
  const { kitchen, actor } = await requireKitchen(kitchenId);
  const [t, tags, cards] = await Promise.all([
    getTranslations("kitchen"),
    kitchenTags(kitchen.id),
    searchRecipes(kitchen.id, q, tag),
  ]);
  const filtering = Boolean(q || tag);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-semibold sm:text-4xl">{kitchen.name}</h1>
          <p className="mt-1 text-muted-foreground">{t("recipeCount", { count: cards.length })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageKitchen(actor) && (
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/kitchens/${kitchen.id}/settings`} aria-label={t("settings")} title={t("settings")}>
                <Settings />
              </Link>
            </Button>
          )}
          <Button variant="ghost" size="icon" asChild>
            <a href={`/api/kitchens/${kitchen.id}/export`} aria-label={t("export")} title={t("export")}>
              <Download />
            </a>
          </Button>
          {aiImportEnabled() && (
            <Button variant="secondary" asChild>
              <Link href={`/kitchens/${kitchen.id}/import`}>
                <Sparkles />
                {t("import")}
              </Link>
            </Button>
          )}
          <Button asChild>
            <Link href={`/kitchens/${kitchen.id}/new`}>
              <Plus />
              {t("newRecipe")}
            </Link>
          </Button>
        </div>
      </div>

      <RecipeFilters tags={tags} />

      {cards.length === 0 ? (
        <Card className="mt-6 flex flex-col items-center gap-3 p-10 text-center">
          <UtensilsCrossed className="size-10 text-muted-foreground" />
          <p className="text-muted-foreground">{filtering ? t("noResults") : t("empty")}</p>
        </Card>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map((c) => (
            <RecipeCard key={c.id} recipe={c} />
          ))}
        </div>
      )}
    </div>
  );
}
