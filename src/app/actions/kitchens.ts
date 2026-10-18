"use server";

import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { db } from "@/db";
import { kitchenMembers, kitchens, users, type MemberRole } from "@/db/schema";
import { requireKitchen } from "@/lib/access";
import { canChangeRole } from "@/lib/permissions";
import type { FormState } from "./auth";

const name = z.string().trim().min(1).max(80);

export async function renameKitchenAction(kitchenId: string, _: FormState, formData: FormData): Promise<FormState> {
  await requireKitchen(kitchenId, { manage: true });
  const parsed = name.safeParse(formData.get("name"));
  if (!parsed.success) return { error: (await getTranslations("kitchen"))("invalidName") };
  await db.update(kitchens).set({ name: parsed.data }).where(eq(kitchens.id, kitchenId));
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function addMemberAction(kitchenId: string, _: FormState, formData: FormData): Promise<FormState> {
  await requireKitchen(kitchenId, { manage: true });
  const t = await getTranslations("kitchen");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) return { error: t("unknownUser") };
  await db
    .insert(kitchenMembers)
    .values({ kitchenId, userId: user.id, role: formData.get("role") === "owner" ? "owner" : "member" })
    .onConflictDoNothing();
  revalidatePath(`/kitchens/${kitchenId}/settings`);
  return { ok: true };
}

/** Changes a member's role, or removes them when `role` is null. */
export async function setMemberRoleAction(kitchenId: string, userId: string, role: MemberRole | null): Promise<FormState> {
  await requireKitchen(kitchenId, { manage: true });
  const t = await getTranslations("kitchen");
  const where = and(eq(kitchenMembers.kitchenId, kitchenId), eq(kitchenMembers.userId, userId));
  const member = await db.query.kitchenMembers.findFirst({ where });
  if (!member) return { error: t("unknownUser") };
  const [{ owners }] = await db
    .select({ owners: count() })
    .from(kitchenMembers)
    .where(and(eq(kitchenMembers.kitchenId, kitchenId), eq(kitchenMembers.role, "owner")));
  if (!canChangeRole(owners, member.role, role)) return { error: t("lastOwner") };

  if (role) await db.update(kitchenMembers).set({ role }).where(where);
  else await db.delete(kitchenMembers).where(where);
  revalidatePath(`/kitchens/${kitchenId}/settings`);
  return { ok: true };
}
