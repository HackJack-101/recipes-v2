import type { MemberRole } from "@/db/schema";

export type Actor = { isSuperAdmin: boolean; role: MemberRole | null };

/** Members (and owners, and super admins) read and write recipes. */
export const canUseKitchen = (a: Actor) => a.isSuperAdmin || a.role !== null;

/** Owners and super admins rename kitchens and manage members. */
export const canManageKitchen = (a: Actor) => a.isSuperAdmin || a.role === "owner";

/** A kitchen must always keep at least one owner. */
export function canChangeRole(ownerCount: number, currentRole: MemberRole, nextRole: MemberRole | null) {
  if (currentRole !== "owner" || nextRole === "owner") return true;
  return ownerCount > 1;
}
