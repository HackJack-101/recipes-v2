import "server-only";
import { and, asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { kitchenMembers, kitchens, recipes, type MemberRole, type User } from "@/db/schema";

export type KitchenSummary = { id: string; name: string; role: MemberRole | null; recipeCount: number };

/** Kitchens the user belongs to; super admins see every kitchen. */
export async function userKitchens(user: User): Promise<KitchenSummary[]> {
  const counts = db
    .select({ kitchenId: recipes.kitchenId, n: count().as("n") })
    .from(recipes)
    .groupBy(recipes.kitchenId)
    .as("counts");

  const rows = await db
    .select({ id: kitchens.id, name: kitchens.name, role: kitchenMembers.role, recipeCount: counts.n })
    .from(kitchens)
    .leftJoin(kitchenMembers, and(eq(kitchenMembers.kitchenId, kitchens.id), eq(kitchenMembers.userId, user.id)))
    .leftJoin(counts, eq(counts.kitchenId, kitchens.id))
    .orderBy(asc(kitchens.name));

  return rows
    .filter((r) => user.isSuperAdmin || r.role)
    .map((r) => ({ ...r, recipeCount: Number(r.recipeCount ?? 0) }));
}
