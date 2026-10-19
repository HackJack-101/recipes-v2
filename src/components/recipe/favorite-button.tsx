"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { setFavoriteAction } from "@/app/actions/recipes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Stars a recipe for the current user. `overlay` sits on top of a recipe card's photo. */
export function FavoriteButton({
  recipeId,
  favorite,
  overlay = false,
}: {
  recipeId: string;
  favorite: boolean;
  overlay?: boolean;
}) {
  const t = useTranslations("recipe");
  const [starred, setStarred] = useOptimistic(favorite);
  const [, startTransition] = useTransition();

  const toggle = () =>
    startTransition(async () => {
      setStarred(!starred);
      try {
        await setFavoriteAction(recipeId, !starred);
      } catch {
        toast.error(t("favoriteError"));
      }
    });

  const props = {
    onClick: toggle,
    "aria-pressed": starred,
    "aria-label": t("favorite"),
    title: starred ? t("unfavorite") : t("favorite"),
  };
  const icon = <Star className={cn(starred && "fill-amber-400 text-amber-400")} />;

  if (overlay) {
    return (
      <button
        type="button"
        {...props}
        className="absolute right-2 top-2 grid size-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/60 [&_svg]:size-5"
      >
        {icon}
      </button>
    );
  }
  return (
    <Button variant="outline" size="icon-sm" className="no-print" {...props}>
      {icon}
    </Button>
  );
}
