import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, gt, isNotNull, isNull, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { passwordResets, sessions, users } from "@/db/schema";
import { hashToken } from "./auth";

export const RESET_MINUTES = 60;
/** At most one email per account in this window, so the form can't flood someone's inbox. */
const RESEND_MINUTES = 2;

const usable = () => and(isNull(passwordResets.usedAt), gt(passwordResets.expiresAt, new Date()));

/**
 * Creates a single-use reset token for the account with this email. Returns null when there's
 * no such account or a link was sent moments ago: the caller must answer the same either way.
 */
export async function createPasswordReset(email: string) {
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) return null;
  const now = Date.now();
  const [recent] = await db
    .select({ id: passwordResets.id })
    .from(passwordResets)
    .where(and(eq(passwordResets.userId, user.id), gt(passwordResets.createdAt, new Date(now - RESEND_MINUTES * 60_000))))
    .limit(1);
  if (recent) return null;

  await db
    .delete(passwordResets)
    .where(and(eq(passwordResets.userId, user.id), or(isNotNull(passwordResets.usedAt), lt(passwordResets.expiresAt, new Date(now)))));
  const token = randomBytes(24).toString("base64url");
  await db.insert(passwordResets).values({
    tokenHash: hashToken(token),
    userId: user.id,
    expiresAt: new Date(now + RESET_MINUTES * 60_000),
  });
  return { token, user };
}

/** The account a reset link is for, or null when the link doesn't exist, was used, or expired. */
export async function findPasswordReset(token: string) {
  if (token.length < 16 || token.length > 100) return null;
  const [row] = await db
    .select({ email: users.email })
    .from(passwordResets)
    .innerJoin(users, eq(users.id, passwordResets.userId))
    .where(and(eq(passwordResets.tokenHash, hashToken(token)), usable()))
    .limit(1);
  return row ?? null;
}

/**
 * Sets the new password, uses up the link and the account's other reset links, and signs the
 * account out everywhere. Returns the user id, or null when the link is no longer usable.
 */
export async function resetPassword(token: string, passwordHash: string) {
  return db.transaction(async (tx) => {
    const [reset] = await tx
      .update(passwordResets)
      .set({ usedAt: new Date() })
      .where(and(eq(passwordResets.tokenHash, hashToken(token)), usable()))
      .returning({ userId: passwordResets.userId });
    if (!reset) return null;
    await tx.update(users).set({ passwordHash }).where(eq(users.id, reset.userId));
    await tx.delete(sessions).where(eq(sessions.userId, reset.userId));
    await tx.delete(passwordResets).where(and(eq(passwordResets.userId, reset.userId), isNull(passwordResets.usedAt)));
    return reset.userId;
  });
}
