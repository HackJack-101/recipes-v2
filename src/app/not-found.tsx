import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <main className="grid min-h-[70dvh] place-items-center px-4 text-center">
      <div>
        <p className="font-display text-7xl font-semibold text-primary">404</p>
        <h1 className="mt-4 text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("body")}</p>
        <Button asChild className="mt-6">
          <Link href="/">{t("home")}</Link>
        </Button>
      </div>
    </main>
  );
}
