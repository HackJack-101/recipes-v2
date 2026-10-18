import { ChefHat } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { userKitchens } from "@/lib/kitchens";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const user = await requireUser();
  const kitchens = await userKitchens(user);
  if (kitchens.length === 1 && !user.isSuperAdmin) redirect(`/kitchens/${kitchens[0].id}`);
  const t = await getTranslations("home");

  return (
    <div>
      <h1 className="text-3xl font-semibold sm:text-4xl">{t("title", { name: user.name.split(" ")[0] })}</h1>
      <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>

      {kitchens.length === 0 ? (
        <Card className="mt-8 flex flex-col items-center gap-3 p-10 text-center">
          <ChefHat className="size-10 text-muted-foreground" />
          <p className="max-w-sm text-muted-foreground">{user.isSuperAdmin ? t("emptyAdmin") : t("empty")}</p>
          {user.isSuperAdmin && (
            <Button asChild>
              <Link href="/admin">{t("goAdmin")}</Link>
            </Button>
          )}
        </Card>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kitchens.map((k) => (
            <Link key={k.id} href={`/kitchens/${k.id}`} className="group rounded-2xl">
              <Card className="flex h-full items-center gap-4 p-5 transition group-hover:-translate-y-0.5 group-hover:shadow-md">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <ChefHat className="size-6" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-display text-lg font-semibold">{k.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {t("recipeCount", { count: k.recipeCount })}
                    {k.role === "owner" && ` · ${t("owner")}`}
                  </span>
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
