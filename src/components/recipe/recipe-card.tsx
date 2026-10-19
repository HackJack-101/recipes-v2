import { Clock, CookingPot } from "lucide-react";
import Link from "next/link";
import type { RecipeCard as Card } from "@/lib/recipes";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/card";
import { FavoriteButton } from "./favorite-button";

export function RecipeCard({ recipe }: { recipe: Card }) {
  return (
    // The star is a sibling of the link: a button can't live inside an <a>.
    <div className="group relative flex flex-col transition hover:-translate-y-0.5">
      <Link
        href={`/recipes/${recipe.id}`}
        className={cn(
          "flex flex-1 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition group-hover:shadow-md",
          recipe.favorite && "border-amber-400/70 ring-1 ring-amber-400/40",
        )}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {recipe.coverPhotoId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/photos/${recipe.coverPhotoId}`}
              alt=""
              loading="lazy"
              className="size-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="grid size-full place-items-center bg-gradient-to-br from-accent to-muted">
              <CookingPot className="size-10 text-accent-foreground/40" />
            </div>
          )}
          {recipe.totalMinutes != null && recipe.totalMinutes > 0 && (
            <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur">
              <Clock className="size-3.5" />
              {formatDuration(recipe.totalMinutes)}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <h2 className="line-clamp-2 font-display text-lg font-semibold leading-snug">{recipe.title}</h2>
          {recipe.tags.length > 0 && (
            <div className="mt-auto flex flex-wrap gap-1.5">
              {recipe.tags.slice(0, 4).map((t) => (
                <Badge key={t}>{t}</Badge>
              ))}
              {recipe.tags.length > 4 && <Badge className="bg-muted text-muted-foreground">+{recipe.tags.length - 4}</Badge>}
            </div>
          )}
        </div>
      </Link>
      <FavoriteButton recipeId={recipe.id} favorite={recipe.favorite} overlay />
    </div>
  );
}
