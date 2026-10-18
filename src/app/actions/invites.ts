"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { db } from "@/db";
import { kitchenMembers, users } from "@/db/schema";
import { isUuid, requireKitchen } from "@/lib/access";
import { createSession, requireUser } from "@/lib/auth";
import { createInvite, findInvite, redeemInvite, revokeInvite } from "@/lib/invites";
import { hashPassword } from "@/lib/password";
import type { FormState } from "./auth";

export async function createInviteAction(kitchenId: string) {
  const { user } = await requireKitchen(kitchenId, { manage: true });
  const { token } = await createInvite(kitchenId, user.id);
  revalidatePath(`/kitchens/${kitchenId}/settings`);
  return token;
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
