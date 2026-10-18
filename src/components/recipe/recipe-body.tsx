"use client";

import { Minus, Plus, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { MULTIPLIERS, scaleFactor, scaleQuantity } from "@/lib/scaler";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Props = {
  servings: number | null;
  ingredients: { quantity: number | null; unit: string; name: string }[];
  steps: string[];
};

/** Ingredients (with the guest scaler) beside the steps on large screens, stacked on phones. */
export function RecipeBody({ servings, ingredients, steps }: Props) {
  const t = useTranslations("recipe");
  const locale = useLocale();
  const [guests, setGuests] = useState(servings ?? 1);
  const factor = scaleFactor(servings, guests);
  const [done, setDone] = useState<Set<number>>(new Set());

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
          <h2 id="ingredients" className="text-xl font-semibold">
            {t("ingredients")}
          </h2>

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
              {ingredients.map((i, n) => {
                const qty = scaleQuantity(i.quantity, factor, locale);
                return (
                  <li key={n} className="flex gap-3 py-2.5 leading-snug">
                    <span className="min-w-16 shrink-0 font-semibold tabular-nums text-primary">
                      {[qty, i.unit].filter(Boolean).join(" ")}
                    </span>
                    <span>{i.name}</span>
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
      </section>
    </div>
  );
}
