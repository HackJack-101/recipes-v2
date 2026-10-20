import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, eq, gt, isNotNull, isNull, lt, or } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { kitchenInvites, kitchenMembers, kitchens, users } from "@/db/schema";
import { hashToken } from "./auth";

export const INVITE_HOURS = 24;

/** Whole hours before expiry, rounded up so a fresh link reads "24 h". */
export const hoursLeft = (expiresAt: Date) => Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 3_600_000));

const usable = () => and(isNull(kitchenInvites.usedAt), gt(kitchenInvites.expiresAt, new Date()));

/** Creates a single-use link token. Only its hash is stored, so the link can't be shown again. */
export async function createInvite(kitchenId: string, createdBy: string, email: string | null = null) {
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_HOURS * 3600 * 1000);
  // Used and expired invites have no use left; keep the table small.
  await db
    .delete(kitchenInvites)
    .where(and(eq(kitchenInvites.kitchenId, kitchenId), or(isNotNull(kitchenInvites.usedAt), lt(kitchenInvites.expiresAt, new Date()))));
  const [{ id }] = await db
    .insert(kitchenInvites)
    .values({ tokenHash: hashToken(token), email, kitchenId, createdBy, expiresAt })
    .returning({ id: kitchenInvites.id });
  return { id, token, expiresAt };
}

/** The invite behind a link, or null when it doesn't exist, was used, or expired. */
export async function findInvite(token: string) {
  if (token.length < 16 || token.length > 100) return null;
  const [row] = await db
    .select({
      kitchenId: kitchens.id,
      kitchenName: kitchens.name,
      inviterName: users.name,
      email: kitchenInvites.email,
      expiresAt: kitchenInvites.expiresAt,
    })
    .from(kitchenInvites)
    .innerJoin(kitchens, eq(kitchens.id, kitchenInvites.kitchenId))
    .leftJoin(users, eq(users.id, kitchenInvites.createdBy))
    .where(and(eq(kitchenInvites.tokenHash, hashToken(token)), usable()))
    .limit(1);
  return row ? { ...row, hoursLeft: hoursLeft(row.expiresAt) } : null;
}

/**
 * Uses up an invite and adds the user to its kitchen as a member. Returns the kitchen id,
 * or null when the link is no longer usable. The conditional update makes it single-use
 * even when two people open the link at the same time.
 */
export async function redeemInvite(tx: Tx | typeof db, token: string, userId: string) {
  const [invite] = await tx
    .update(kitchenInvites)
    .set({ usedAt: new Date(), usedBy: userId })
    .where(and(eq(kitchenInvites.tokenHash, hashToken(token)), usable()))
    .returning({ kitchenId: kitchenInvites.kitchenId });
  if (!invite) return null;
  await tx.insert(kitchenMembers).values({ kitchenId: invite.kitchenId, userId, role: "member" }).onConflictDoNothing();
  return invite.kitchenId;
}

export async function pendingInvites(kitchenId: string) {
  const rows = await db
    .select({ id: kitchenInvites.id, email: kitchenInvites.email, createdByName: users.name, expiresAt: kitchenInvites.expiresAt })
    .from(kitchenInvites)
    .leftJoin(users, eq(users.id, kitchenInvites.createdBy))
    .where(and(eq(kitchenInvites.kitchenId, kitchenId), usable()))
    .orderBy(asc(kitchenInvites.expiresAt));
  return rows.map((r) => ({ ...r, hoursLeft: hoursLeft(r.expiresAt) }));
}

export async function revokeInvite(kitchenId: string, inviteId: string) {
  await db
    .delete(kitchenInvites)
    .where(and(eq(kitchenInvites.id, inviteId), eq(kitchenInvites.kitchenId, kitchenId), isNull(kitchenInvites.usedAt)));
}
