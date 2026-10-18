import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";
import { safeNext } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";
import { LoginForm } from "./login-form";

export async function generateMetadata() {
  return { title: (await getTranslations("auth"))("signIn") };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  const t = await getTranslations();
  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(ellipse_at_top,var(--accent),transparent_60%)] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo name={t("app.name")} />
          <p className="text-muted-foreground">{t("app.tagline")}</p>
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h1 className="mb-5 text-2xl font-semibold">{t("auth.signIn")}</h1>
          <LoginForm next={next} />
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">{t("auth.inviteOnly")}</p>
      </div>
    </main>
  );
}
