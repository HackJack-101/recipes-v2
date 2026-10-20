import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { emailEnabled } from "@/lib/email";
import { AuthShell } from "@/components/layout/auth-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("auth"))("forgotTitle"), robots: { index: false, follow: false } };
}

export default async function ForgotPasswordPage() {
  if (!emailEnabled()) notFound();
  const t = await getTranslations("auth");
  return (
    <AuthShell>
      <h1 className="text-2xl font-semibold">{t("forgotTitle")}</h1>
      <p className="mt-2 mb-5 text-sm text-muted-foreground">{t("forgotDescription")}</p>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
