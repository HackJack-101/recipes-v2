import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { cache } from "react";
import { loadRecipe } from "@/lib/recipes";
import { Logo } from "@/components/layout/logo";
import { RecipeBody } from "@/components/recipe/recipe-body";
import { RecipeHeader } from "@/components/recipe/recipe-header";

type Props = { params: Promise<{ token: string }> };

const load = cache(async (token: string) => (token.length >= 16 ? loadRecipe({ shareToken: token }) : null));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const recipe = await load((await params).token);
  return {
    title: recipe?.title,
    robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  };
}

/** Public, read-only view of a recipe someone shared. No account needed. */
export default async function SharedRecipePage({ params }: Props) {
  const { token } = await params;
  const recipe = await load(token);
  if (!recipe) notFound();
  const t = await getTranslations();

  return (
    <div className="min-h-dvh">
      <header className="no-print border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo name={t("app.name")} />
          <span className="text-sm text-muted-foreground">{t("share.sharedRecipe")}</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
        <article>
          <RecipeHeader recipe={recipe} photoQuery={`?share=${encodeURIComponent(token)}`} />
          <RecipeBody servings={recipe.servings} ingredients={recipe.ingredients} steps={recipe.steps.map((s) => s.text)} />
        </article>
      </main>
    </div>
  );
}
