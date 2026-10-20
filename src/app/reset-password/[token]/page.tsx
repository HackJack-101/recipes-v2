import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { findPasswordReset } from "@/lib/password-resets";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { ResetPasswordForm } from "./reset-password-form";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: (await getTranslations("auth"))("resetTitle"),
    robots: { index: false, follow: false, nocache: true },
    referrer: "no-referrer",
  };
}

/** Landing page of a password reset email. */
export default async function ResetPasswordPage({ params }: Props) {
  const { token } = await params;
  const [reset, t] = await Promise.all([findPasswordReset(token), getTranslations("auth")]);
  return (
    <AuthShell>
      {reset ? (
        <>
          <h1 className="text-2xl font-semibold">{t("resetTitle")}</h1>
          <p className="mt-2 mb-5 text-sm text-muted-foreground">{t("resetFor", { email: reset.email })}</p>
          <ResetPasswordForm token={token} email={reset.email} />
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold">{t("resetInvalidTitle")}</h1>
          <p className="mt-2 text-muted-foreground">{t("resetInvalid")}</p>
          <Button asChild className="mt-6 w-full">
            <Link href="/forgot-password">{t("requestNewLink")}</Link>
          </Button>
        </>
      )}
    </AuthShell>
  );
}
