"use client";

import { Camera, Check, Minus, PartyPopper, Plus, RotateCcw, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { markCookedAction, resetIngredientChecksAction, setIngredientCheckedAction } from "@/app/actions/recipes";
import { MULTIPLIERS, scaleFactor, scaleQuantity } from "@/lib/scaler";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

type Props = {
  servings: number | null;
  ingredients: { id: string; quantity: number | null; unit: string; name: string }[];
  steps: string[];
  /** Saves ticked ingredients for the signed-in user. Without it (public page) they're kept in the page only. */
  checklist?: { recipeId: string; checked: string[] };
  /** How many times the signed-in user made the recipe. Shows the "I made it" button. */
  cooked?: { count: number; last: Date | null };
};

/** Ingredients (with the guest scaler) beside the steps on large screens, stacked on phones. */
export function RecipeBody({ servings, ingredients, steps, checklist, cooked }: Props) {
  const t = useTranslations("recipe");
  const format = useFormatter();
  const router = useRouter();
  const locale = useLocale();
  const [guests, setGuests] = useState(servings ?? 1);
  const factor = scaleFactor(servings, guests);
  const [done, setDone] = useState<Set<number>>(new Set());

  const [checked, setChecked] = useState(() => new Set(checklist?.checked));
  const [, startTransition] = useTransition();

  const save = (action: () => Promise<void>, previous: Set<string>) =>
    startTransition(async () => {
      try {
        await action();
      } catch {
        setChecked(previous);
        toast.error(t("checkError"));
      }
    });

  const toggleIngredient = (id: string) => {
    const next = new Set(checked);
    const on = !next.delete(id);
    if (on) next.add(id);
    setChecked(next);
    if (checklist) save(() => setIngredientCheckedAction(checklist.recipeId, id, on), checked);
  };

  const resetIngredients = () => {
    setChecked(new Set());
    if (checklist) save(() => resetIngredientChecksAction(checklist.recipeId), checked);
  };

  const [cooking, startCooking] = useTransition();
  const [photoPrompt, setPhotoPrompt] = useState(false);

  const markCooked = (recipeId: string) =>
    startCooking(async () => {
      try {
        await markCookedAction(recipeId);
      } catch {
        toast.error(t("cookedError"));
        return;
      }
      // Ready for next time.
      setChecked(new Set());
      setDone(new Set());
      setPhotoPrompt(true);
    });

  const toggleStep = (i: number) =>
    setDone((prev) => {
      const next = new Set(prev);
      if (!next.delete(i)) next.add(i);
      return next;
    });

  return (
    <div className="print-full mt-8 grid gap-8 lg:grid-cols-[minmax(280px,360px)_1fr] lg:gap-12">
      <section aria-labelledby="ingredients" className="lg:self-start">
        <div className="print-static rounded-2xl border bg-card p-5 shadow-sm lg:sticky lg:top-24">
          <div className="flex min-h-9 items-center justify-between gap-2">
            <h2 id="ingredients" className="text-xl font-semibold">
              {t("ingredients")}
            </h2>
            {checked.size > 0 && (
              <div className="no-print flex items-center gap-1">
                <span className="text-sm tabular-nums text-muted-foreground">
                  {t("checkedCount", { checked: checked.size, total: ingredients.length })}
                </span>
                <Button variant="ghost" size="sm" onClick={resetIngredients} className="text-muted-foreground">
                  <RotateCcw />
                  {t("resetChecks")}
                </Button>
              </div>
            )}
          </div>

          <div className="no-print mt-4">
            {servings ? (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-muted p-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-card shadow-sm"
                  onClick={() => setGuests((g) => Math.max(1, g - 1))}
                  disabled={guests <= 1}
                  aria-label={t("fewerGuests")}
                >
                  <Minus />
                </Button>
                <span className="flex items-center gap-2 font-medium" aria-live="polite">
                  <Users className="size-4 text-muted-foreground" />
                  {t("guests", { count: guests })}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-card shadow-sm"
                  onClick={() => setGuests((g) => Math.min(100, g + 1))}
                  aria-label={t("moreGuests")}
                >
                  <Plus />
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("multiplier")}>
                {MULTIPLIERS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setGuests(m)}
                    aria-pressed={guests === m}
                    className={cn(
                      "h-10 min-w-12 rounded-xl border px-3 text-sm font-medium transition",
                      guests === m ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
                    )}
                  >
                    ×{m.toLocaleString(locale)}
                  </button>
                ))}
              </div>
            )}
          </div>
          {servings && <p className="mt-3 hidden text-sm text-muted-foreground print:block">{t("guests", { count: guests })}</p>}

          {ingredients.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">{t("noIngredients")}</p>
          ) : (
            <ul className="mt-4 divide-y">
              {ingredients.map((i) => {
                const qty = scaleQuantity(i.quantity, factor, locale);
                const on = checked.has(i.id);
                return (
                  <li key={i.id}>
                    <label className="group flex cursor-pointer items-start gap-3 py-2.5 leading-snug select-none">
                      <input type="checkbox" checked={on} onChange={() => toggleIngredient(i.id)} className="peer sr-only" />
                      <span
                        aria-hidden
                        className={cn(
                          "mt-px grid size-5 shrink-0 place-items-center rounded-md border-2 border-primary/50 transition-all duration-150",
                          "group-hover:border-primary peer-focus-visible:ring-4 peer-focus-visible:ring-ring",
                          on && "scale-105 border-primary bg-primary text-primary-foreground",
                        )}
                      >
                        <Check strokeWidth={3.5} className={cn("size-3.5 transition-transform duration-150", on ? "scale-100" : "scale-0")} />
                      </span>
                      <span
                        className={cn(
                          "min-w-16 shrink-0 font-semibold tabular-nums text-primary transition-opacity",
                          on && "opacity-45",
                        )}
                      >
                        {[qty, i.unit].filter(Boolean).join(" ")}
                      </span>
                      <span className={cn("transition-opacity", on && "text-muted-foreground line-through decoration-primary/60 opacity-70")}>
                        {i.name}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section aria-labelledby="steps">
        <h2 id="steps" className="text-xl font-semibold">
          {t("steps")}
        </h2>
        {steps.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{t("noSteps")}</p>
        ) : (
          <ol className="mt-4 space-y-3">
            {steps.map((s, i) => (
              <li key={i}>
                <button
                  onClick={() => toggleStep(i)}
                  aria-pressed={done.has(i)}
                  className={cn(
                    "flex w-full gap-4 rounded-2xl p-3 text-left transition hover:bg-muted/60 sm:p-4",
                    done.has(i) && "opacity-50",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-full border-2 border-primary text-sm font-semibold text-primary",
                      done.has(i) && "bg-primary text-primary-foreground",
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className={cn("whitespace-pre-line pt-1 text-[1.05rem] leading-relaxed", done.has(i) && "line-through")}>
                    {s}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}

        {checklist && cooked && (
          <div className="no-print mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-5 py-6 text-center">
            <Button size="lg" onClick={() => markCooked(checklist.recipeId)} disabled={cooking}>
              <PartyPopper />
              {t("markCooked")}
            </Button>
            {cooked.count > 0 && cooked.last && (
              <p className="text-sm text-muted-foreground">
                {t("cookedStats", { count: cooked.count, date: format.dateTime(cooked.last, { dateStyle: "long" }) })}
              </p>
            )}
          </div>
        )}
        {checklist && (
          <Dialog open={photoPrompt} onOpenChange={setPhotoPrompt} title={t("cookedTitle")} description={t("photoPrompt")}>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setPhotoPrompt(false)}>
                {t("notNow")}
              </Button>
              <Button onClick={() => router.push(`/recipes/${checklist.recipeId}/edit#photos`)}>
                <Camera />
                {t("addPhoto")}
              </Button>
            </div>
          </Dialog>
        )}
      </section>
    </div>
  );
}
