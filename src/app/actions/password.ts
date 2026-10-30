"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import { appUrl, emailEnabled, emailTranslator, sendEmail } from "@/lib/email";
import { passwordResetEmail } from "@/lib/email-templates";
import { hashPassword } from "@/lib/password";
import { createPasswordReset, RESET_MINUTES, resetPassword } from "@/lib/password-resets";
import { isLocale } from "@/i18n/config";
import type { FormState } from "./auth";

export type ResetRequestState = { error?: string; sentTo?: string } | undefined;

/** Emails a reset link. Answers the same whether or not the account exists. */
export async function requestPasswordResetAction(_: ResetRequestState, formData: FormData): Promise<ResetRequestState> {
  const t = await getTranslations("auth");
  const email = z.email().safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { error: t("invalidEmail") };
  if (!emailEnabled()) notConfigured();

  const reset = await createPasswordReset(email.data);
  if (reset) {
    const locale = reset.user.locale ?? (await getLocale());
    const [te, base, tApp] = await Promise.all([
      emailTranslator(isLocale(locale) ? locale : "en"),
      appUrl(),
      getTranslations({ locale, namespace: "app" }),
    ]);
    const message = passwordResetEmail(te, {
      url: `${base}/reset-password/${reset.token}`,
      email: reset.user.email,
      appName: tApp("name"),
      minutes: RESET_MINUTES,
    });
    // Send after answering, so the response time doesn't tell whether the account exists.
    after(() => sendEmail(reset.user.email, message).catch((err) => console.error("[email] password reset:", err)));
  }
  return { sentTo: email.data };
}

export async function resetPasswordAction(token: string, _: FormState, formData: FormData): Promise<FormState> {
  const t = await getTranslations("auth");
  const password = z.string().min(8).max(200).safeParse(formData.get("password"));
  if (!password.success) return { error: t("passwordTooShort") };
  const userId = await resetPassword(token, await hashPassword(password.data));
  if (!userId) return { error: t("resetInvalid") };
  await createSession(userId);
  revalidatePath("/", "layout");
  redirect("/");
}

function notConfigured(): never {
  throw new Error("Email is not configured: set SMTP_HOST and SMTP_FROM");
}
