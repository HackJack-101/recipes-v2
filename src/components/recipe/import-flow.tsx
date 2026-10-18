"use client";

import { FileCode, Globe, Loader2, RotateCcw, Sparkles, Type } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { importRecipeAction } from "@/app/actions/recipes";
import type { ImportSource } from "@/lib/ai-import";
import type { RecipeInput } from "@/lib/recipe-input";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { RecipeEditor } from "./recipe-editor";

type Kind = ImportSource["kind"];

export function ImportFlow({ kitchenId, kitchenTags }: { kitchenId: string; kitchenTags: string[] }) {
  const t = useTranslations("import");
  const [kind, setKind] = useState<Kind>("url");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<RecipeInput | null>(null);
  const [pending, startTransition] = useTransition();

  if (recipe) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-accent/60 p-4 text-sm text-accent-foreground">
          <span className="flex items-center gap-2">
            <Sparkles className="size-4" />
            {t("review")}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setRecipe(null)}>
            <RotateCcw />
            {t("startOver")}
          </Button>
        </div>
        <RecipeEditor target={{ kitchenId }} initial={recipe} kitchenTags={kitchenTags} cancelHref={`/kitchens/${kitchenId}`} />
      </div>
    );
  }

  const run = () => {
    setError(null);
    const source: ImportSource =
      kind === "url" ? { kind, url: value.trim() } : kind === "html" ? { kind, html: value } : { kind, text: value };
    startTransition(async () => {
      const res = await importRecipeAction(kitchenId, source);
      if ("error" in res) setError(res.error);
      else setRecipe(res.recipe);
    });
  };

  const tabs: { kind: Kind; icon: typeof Globe; label: string }[] = [
    { kind: "url", icon: Globe, label: t("fromUrl") },
    { kind: "html", icon: FileCode, label: t("fromHtml") },
    { kind: "text", icon: Type, label: t("fromText") },
  ];

  return (
    <Card className="p-5 sm:p-6">
      <p className="text-muted-foreground">{t("intro")}</p>
      <div role="tablist" className="mt-5 grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
        {tabs.map(({ kind: k, icon: Icon, label }) => (
          <button
            key={k}
            role="tab"
            aria-selected={kind === k}
            onClick={() => {
              setKind(k);
              setValue("");
              setError(null);
            }}
            className={cn(
              "flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition",
              kind === k ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      <form
        className="mt-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        {kind === "url" ? (
          <div>
            <Label htmlFor="import-url">{t("urlLabel")}</Label>
            <Input
              id="import-url"
              type="url"
              inputMode="url"
              placeholder="https://"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
            />
          </div>
        ) : (
          <div>
            <Label htmlFor="import-text">{kind === "html" ? t("htmlLabel") : t("textLabel")}</Label>
            <Textarea
              id="import-text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className={cn("min-h-56", kind === "html" && "font-mono text-xs")}
              required
            />
          </div>
        )}
        {error && (
          <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending || !value.trim()}>
          {pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {pending ? t("working") : t("extract")}
        </Button>
        <p className="text-xs text-muted-foreground">{t("disclaimer")}</p>
      </form>
    </Card>
  );
}
