import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Runs against a real Postgres when TEST_DATABASE_URL is set (CI provides one).
const url = process.env.TEST_DATABASE_URL;
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

describe.skipIf(!url)("password resets (database)", async () => {
  // Vitest still collects a skipped suite's body; don't import the db without a URL.
  if (!url) return;
  process.env.DATABASE_URL = url;
  const { db } = await import("@/db");
  const { setupDatabase } = await import("@/db/setup");
  const { passwordResets, sessions, users } = await import("@/db/schema");
  const { createPasswordReset, findPasswordReset, resetPassword } = await import("./password-resets");
  const { eq } = await import("drizzle-orm");

  const email = `reset-${Math.random().toString(36).slice(2)}@test.local`;
  let userId: string;

  beforeAll(async () => {
    await setupDatabase();
    [{ id: userId }] = await db.insert(users).values({ email, name: "Reset", passwordHash: "old" }).returning({ id: users.id });
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.id, userId));
  });

  /** Moves the user's reset links into the past, as if they were sent `minutes` ago. */
  const age = (minutes: number) =>
    db
      .update(passwordResets)
      .set({ createdAt: new Date(Date.now() - minutes * 60_000) })
      .where(eq(passwordResets.userId, userId));

  it("returns nothing for an unknown email", async () => {
    expect(await createPasswordReset("nobody@test.local")).toBeNull();
  });

  it("resets the password once, signs the account out and voids other links", async () => {
    const first = await createPasswordReset(email);
    expect(first?.user.id).toBe(userId);
    // A second request right away sends nothing.
    expect(await createPasswordReset(email)).toBeNull();
    await age(5);
    const second = await createPasswordReset(email);
    expect(second).not.toBeNull();

    expect(await findPasswordReset(first!.token)).toEqual({ email });
    expect(await findPasswordReset("not-a-real-token-at-all")).toBeNull();

    await db.insert(sessions).values({ id: `s-${userId}`, userId, expiresAt: new Date(Date.now() + 3_600_000) });
    expect(await resetPassword(first!.token, "new-hash")).toBe(userId);
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    expect(user?.passwordHash).toBe("new-hash");
    expect(await db.select().from(sessions).where(eq(sessions.userId, userId))).toEqual([]);

    // Single use, and the other link is gone too.
    expect(await resetPassword(first!.token, "again")).toBeNull();
    expect(await findPasswordReset(second!.token)).toBeNull();
    expect(await resetPassword(second!.token, "again")).toBeNull();
  });

  it("refuses expired links", async () => {
    await age(5);
    const reset = await createPasswordReset(email);
    await db.update(passwordResets).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(passwordResets.userId, userId));
    expect(await findPasswordReset(reset!.token)).toBeNull();
    expect(await resetPassword(reset!.token, "late")).toBeNull();
  });
});
