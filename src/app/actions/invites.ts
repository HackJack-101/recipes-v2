"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import { db } from "@/db";
import { kitchenMembers, users } from "@/db/schema";
import { isUuid, requireKitchen } from "@/lib/access";
import { createSession, requireUser } from "@/lib/auth";
import { appUrl, emailEnabled, emailTranslator, sendEmail } from "@/lib/email";
import { inviteEmail } from "@/lib/email-templates";
import { createInvite, findInvite, INVITE_HOURS, redeemInvite, revokeInvite } from "@/lib/invites";
import { isLocale } from "@/i18n/config";
import { hashPassword } from "@/lib/password";
import type { FormState } from "./auth";

export async function createInviteAction(kitchenId: string) {
  const { user } = await requireKitchen(kitchenId, { manage: true });
  const { token } = await createInvite(kitchenId, user.id);
  revalidatePath(`/kitchens/${kitchenId}/settings`);
  return token;
}

export type EmailInviteState = { error?: string; email?: string; sentTo?: string; at?: number } | undefined;

/** Emails a single-use invite link. Written in the inviter's language. */
export async function emailInviteAction(kitchenId: string, _: EmailInviteState, formData: FormData): Promise<EmailInviteState> {
  const { user, kitchen } = await requireKitchen(kitchenId, { manage: true });
  const t = await getTranslations("kitchen");
  if (!emailEnabled()) return { error: t("emailInviteFailed") };
  const email = z.email().safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  const typed = String(formData.get("email") ?? "");
  if (!email.success) return { error: t("emailInviteInvalid"), email: typed };

  const [member] = await db
    .select({ id: users.id })
    .from(kitchenMembers)
    .innerJoin(users, eq(users.id, kitchenMembers.userId))
    .where(and(eq(kitchenMembers.kitchenId, kitchen.id), eq(users.email, email.data)));
  if (member) return { error: t("emailInviteMember", { email: email.data }), email: typed };

  const invite = await createInvite(kitchen.id, user.id, email.data);
  const locale = await getLocale();
  const [te, base, tApp] = await Promise.all([
    emailTranslator(isLocale(locale) ? locale : "en"),
    appUrl(),
    getTranslations("app"),
  ]);
  try {
    await sendEmail(
      email.data,
      inviteEmail(te, {
        url: `${base}/invite/${invite.token}`,
        inviter: user.name,
        kitchen: kitchen.name,
        appName: tApp("name"),
        hours: INVITE_HOURS,
      }),
    );
  } catch (err) {
    console.error("[email] invite:", err);
    await revokeInvite(kitchen.id, invite.id);
    return { error: t("emailInviteFailed"), email: typed };
  }
  revalidatePath(`/kitchens/${kitchen.id}/settings`);
  return { sentTo: email.data, at: Date.now() };
}

export async function revokeInviteAction(kitchenId: string, inviteId: string) {
  await requireKitchen(kitchenId, { manage: true });
  if (isUuid(inviteId)) await revokeInvite(kitchenId, inviteId);
  revalidatePath(`/kitchens/${kitchenId}/settings`);
}

/** A signed-in user joins the kitchen. Members already in it keep the link unused. */
export async function acceptInviteAction(token: string): Promise<FormState> {
  const user = await requireUser();
  const invite = await findInvite(token);
  if (!invite) return { error: (await getTranslations("invite"))("invalid") };
  const member = await db.query.kitchenMembers.findFirst({
    where: and(eq(kitchenMembers.kitchenId, invite.kitchenId), eq(kitchenMembers.userId, user.id)),
  });
  const kitchenId = member ? invite.kitchenId : await redeemInvite(db, token, user.id);
  if (!kitchenId) return { error: (await getTranslations("invite"))("invalid") };
  revalidatePath("/", "layout");
  redirect(`/kitchens/${kitchenId}`);
}

const signUp = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8).max(200),
});

class InviteUnusable extends Error {}

/** Creates an account from an invite link and joins the kitchen, all or nothing. */
export async function signUpWithInviteAction(token: string, _: FormState, formData: FormData): Promise<FormState> {
  const t = await getTranslations("invite");
  const parsed = signUp.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const short = parsed.error.issues.some((i) => i.path[0] === "password");
    return { error: short ? t("passwordTooShort") : t("invalidAccount") };
  }
  const { password, ...rest } = parsed.data;
  const passwordHash = await hashPassword(password);

  let result: { userId: string; kitchenId: string } | null;
  try {
    result = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(users)
        .values({ ...rest, passwordHash })
        .onConflictDoNothing()
        .returning({ id: users.id });
      if (!created) return null;
      const kitchenId = await redeemInvite(tx, token, created.id);
      // Roll the new account back if the link was used or expired meanwhile.
      if (!kitchenId) throw new InviteUnusable();
      return { userId: created.id, kitchenId };
    });
  } catch (e) {
    if (e instanceof InviteUnusable) return { error: t("invalid") };
    throw e;
  }
  if (!result) return { error: t("emailTaken") };

  await createSession(result.userId);
  revalidatePath("/", "layout");
  redirect(`/kitchens/${result.kitchenId}`);
}
