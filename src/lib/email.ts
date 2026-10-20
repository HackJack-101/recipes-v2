import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { headers } from "next/headers";
import { createTranslator } from "next-intl";
import type { Locale } from "@/db/schema";
import type { RenderedEmail } from "./email-templates";

const from = () => process.env.SMTP_FROM || process.env.SMTP_USER;

/** Emails (invites, password resets) need SMTP_HOST and a sender address. */
export const emailEnabled = () => Boolean(process.env.SMTP_HOST && from());

let transporter: Transporter | undefined;

function transport() {
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // 465 speaks TLS from the start (OVH: ssl0.ovh.net:465); 587 and 25 upgrade with STARTTLS.
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
    auth: user ? { user, pass: process.env.SMTP_PASSWORD } : undefined,
  });
  return transporter;
}

export async function sendEmail(to: string, email: RenderedEmail) {
  if (!emailEnabled()) throw new Error("Email is not configured: set SMTP_HOST and SMTP_FROM");
  await transport().sendMail({ from: from(), to, ...email });
}

/** Translations for an email, in the recipient's language rather than the request's. */
export async function emailTranslator(locale: Locale) {
  const messages = (await import(`@/messages/${locale}.json`)).default;
  return createTranslator({ locale, messages, namespace: "email" });
}

export type EmailTranslator = Awaited<ReturnType<typeof emailTranslator>>;

/** Base URL for links in emails: APP_URL, or the address this request came to. */
export async function appUrl() {
  const configured = process.env.APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
}
