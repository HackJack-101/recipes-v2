import { ChefHat, Clock, Flame, Users } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { FullRecipe } from "@/lib/recipes";
import { formatDuration } from "@/lib/format";
import { tagSlug } from "@/lib/tags";
import { Badge } from "@/components/ui/card";
import { PhotoGallery } from "./photo-gallery";

type Props = {
  recipe: FullRecipe;
  photoQuery?: string;
  /** Makes each tag a link to the kitchen's recipes with that tag (members only, not on public pages). */
  linkTags?: boolean;
};

export async function RecipeHeader({ recipe, photoQuery = "", linkTags = false }: Props) {
  const t = await getTranslations("recipe");
  const total = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
  const facts = [
    recipe.servings && { icon: Users, label: t("servings"), value: String(recipe.servings) },
    recipe.prepMinutes && { icon: ChefHat, label: t("prep"), value: formatDuration(recipe.prepMinutes) },
    recipe.cookMinutes && { icon: Flame, label: t("cook"), value: formatDuration(recipe.cookMinutes) },
    total > 0 && { icon: Clock, label: t("total"), value: formatDuration(total) },
  ].filter((f) => !!f);

  return (
    <header>
      <PhotoGallery photos={recipe.photos.map((p) => `/api/photos/${p.id}${photoQuery}`)} alt={recipe.title} />
      <h1 className="mt-6 text-3xl font-semibold leading-tight text-balance sm:text-5xl">{recipe.title}</h1>
      {recipe.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {recipe.tags.map((tag) =>
            linkTags ? (
              <Link
                key={tag}
                href={`/kitchens/${recipe.kitchenId}?${new URLSearchParams({ tag: tagSlug(tag) })}`}
                title={t("tagRecipes", { tag })}
                className="rounded-full transition hover:ring-2 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Badge className="py-1">{tag}</Badge>
              </Link>
            ) : (
              <Badge key={tag}>{tag}</Badge>
            ),
          )}
        </div>
      )}
      {recipe.description && (
        <p className="mt-4 max-w-3xl whitespace-pre-line text-lg leading-relaxed text-muted-foreground">
          {recipe.description}
        </p>
      )}
      {facts.length > 0 && (
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
          {facts.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5">
              <Icon className="size-5 text-primary" />
              <div>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="font-semibold">{value}</dd>
              </div>
            </div>
          ))}
        </dl>
      )}
    </header>
  );
}
