"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { db } from "@/db";
import { kitchenMembers, kitchens, users } from "@/db/schema";
import { requireSuperAdmin } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import type { FormState } from "./auth";

const newUser = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8).max(200),
  isSuperAdmin: z.boolean(),
});

export async function createUserAction(_: FormState, formData: FormData): Promise<FormState> {
  await requireSuperAdmin();
  const t = await getTranslations("admin");
  const parsed = newUser.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    isSuperAdmin: formData.get("isSuperAdmin") === "on",
  });
  if (!parsed.success) return { error: t("invalidUser") };
  const { password, ...rest } = parsed.data;
  const inserted = await db
    .insert(users)
    .values({ ...rest, passwordHash: await hashPassword(password) })
    .onConflictDoNothing()
    .returning({ id: users.id });
  if (!inserted.length) return { error: t("emailTaken") };
  revalidatePath("/admin");
  return { ok: true };
}

export async function renameUserAction(userId: string, _: FormState, formData: FormData): Promise<FormState> {
  await requireSuperAdmin();
  const t = await getTranslations("admin");
  const name = newUser.shape.name.safeParse(formData.get("name"));
  if (!name.success || !z.uuid().safeParse(userId).success) return { error: t("invalidName") };
  const updated = await db.update(users).set({ name: name.data }).where(eq(users.id, userId)).returning({ id: users.id });
  if (!updated.length) return { error: t("invalidName") };
  // Names appear in the header, member lists and invites.
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function createKitchenAction(_: FormState, formData: FormData): Promise<FormState> {
  await requireSuperAdmin();
  const t = await getTranslations("admin");
  const name = z.string().trim().min(1).max(80).safeParse(formData.get("name"));
  const ownerId = z.uuid().safeParse(formData.get("ownerId"));
  if (!name.success || !ownerId.success) return { error: t("invalidKitchen") };
  await db.transaction(async (tx) => {
    const [kitchen] = await tx.insert(kitchens).values({ name: name.data }).returning({ id: kitchens.id });
    await tx.insert(kitchenMembers).values({ kitchenId: kitchen.id, userId: ownerId.data, role: "owner" });
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
