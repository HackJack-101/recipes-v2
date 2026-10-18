"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { isLocale, LOCALE_COOKIE } from "@/i18n/config";

export type FormState = { error?: string; ok?: boolean } | undefined;

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const t = await getTranslations("auth");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const user = email ? await db.query.users.findFirst({ where: eq(users.email, email) }) : undefined;
  // Always run a verification so response time doesn't reveal which emails exist.
  const ok = await verifyPassword(user?.passwordHash ?? (await dummyHash()), password);
  if (!user || !ok) return { error: t("invalidCredentials") };
  await createSession(user.id);
  if (user.locale) await setLocaleCookie(user.locale);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function setLocale(locale: string) {
  if (!isLocale(locale)) return;
  await setLocaleCookie(locale);
  const user = await getCurrentUser();
  if (user) await db.update(users).set({ locale }).where(eq(users.id, user.id));
}

async function setLocaleCookie(locale: string) {
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 365 * 24 * 3600, sameSite: "lax" });
}

let dummy: Promise<string> | undefined;
const dummyHash = () => (dummy ??= hashPassword("not-a-real-password"));
