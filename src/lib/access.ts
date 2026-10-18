import "server-only";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { kitchenMembers, kitchens, recipes, type User } from "@/db/schema";
import { requireUser } from "./auth";
import { canManageKitchen, canUseKitchen, type Actor } from "./permissions";

export async function getActor(user: User, kitchenId: string): Promise<Actor> {
  const [m] = await db
    .select({ role: kitchenMembers.role })
    .from(kitchenMembers)
    .where(and(eq(kitchenMembers.kitchenId, kitchenId), eq(kitchenMembers.userId, user.id)))
    .limit(1);
  return { isSuperAdmin: user.isSuperAdmin, role: m?.role ?? null };
}

/** Loads a kitchen the current user may use, or 404s (never reveals that it exists). */
export async function requireKitchen(kitchenId: string, opts: { manage?: boolean } = {}) {
  const user = await requireUser();
  if (!isUuid(kitchenId)) notFound();
  const kitchen = await db.query.kitchens.findFirst({ where: eq(kitchens.id, kitchenId) });
  if (!kitchen) notFound();
  const actor = await getActor(user, kitchenId);
  if (!canUseKitchen(actor) || (opts.manage && !canManageKitchen(actor))) notFound();
  return { user, kitchen, actor };
}

export async function requireRecipe(recipeId: string) {
  const user = await requireUser();
  if (!isUuid(recipeId)) notFound();
  const recipe = await db.query.recipes.findFirst({ where: eq(recipes.id, recipeId) });
  if (!recipe) notFound();
  const actor = await getActor(user, recipe.kitchenId);
  if (!canUseKitchen(actor)) notFound();
  return { user, recipe, actor };
}

export const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
