import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Runs against a real Postgres when TEST_DATABASE_URL is set (CI provides one).
const url = process.env.TEST_DATABASE_URL;
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

describe.skipIf(!url)("invites (database)", async () => {
  // Vitest still collects a skipped suite's body; don't import the db without a URL.
  if (!url) return;
  process.env.DATABASE_URL = url;
  const { db } = await import("@/db");
  const { setupDatabase } = await import("@/db/setup");
  const { kitchenInvites, kitchenMembers, kitchens, users } = await import("@/db/schema");
  const { createInvite, findInvite, pendingInvites, redeemInvite, revokeInvite } = await import("./invites");
  const { and, eq, inArray } = await import("drizzle-orm");

  let kitchenId: string;
  let ownerId: string;
  const guests: string[] = [];

  const newUser = async () => {
    const [{ id }] = await db
      .insert(users)
      .values({ email: `guest-${Math.random().toString(36).slice(2)}@test.local`, name: "Guest", passwordHash: "x" })
      .returning({ id: users.id });
    guests.push(id);
    return id;
  };
  const roleOf = async (userId: string) =>
    (
      await db.query.kitchenMembers.findFirst({
        where: and(eq(kitchenMembers.kitchenId, kitchenId), eq(kitchenMembers.userId, userId)),
      })
    )?.role;

  beforeAll(async () => {
    await setupDatabase();
    const suffix = Math.random().toString(36).slice(2);
    [{ id: ownerId }] = await db
      .insert(users)
      .values({ email: `owner-${suffix}@test.local`, name: "Owner", passwordHash: "x" })
      .returning({ id: users.id });
    [{ id: kitchenId }] = await db.insert(kitchens).values({ name: `Invites ${suffix}` }).returning({ id: kitchens.id });
  });

  afterAll(async () => {
    await db.delete(kitchens).where(eq(kitchens.id, kitchenId));
    await db.delete(users).where(inArray(users.id, [ownerId, ...guests]));
  });

  it("stores only a hash of the token and describes the invite", async () => {
    const { token, expiresAt } = await createInvite(kitchenId, ownerId);
    const stored = await db.select().from(kitchenInvites).where(eq(kitchenInvites.kitchenId, kitchenId));
    expect(stored.some((i) => i.tokenHash === token)).toBe(false);
    expect(expiresAt.getTime() - Date.now()).toBeGreaterThan(23.9 * 3600 * 1000);
    expect(expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(24 * 3600 * 1000);
    expect(await findInvite(token)).toMatchObject({ kitchenId, inviterName: "Owner", email: null });
  });

  it("remembers who an emailed invite was sent to", async () => {
    const { id, token } = await createInvite(kitchenId, ownerId, "cousin@test.local");
    expect(await findInvite(token)).toMatchObject({ kitchenId, email: "cousin@test.local" });
    expect((await pendingInvites(kitchenId)).find((i) => i.id === id)).toMatchObject({ email: "cousin@test.local" });
    await revokeInvite(kitchenId, id);
  });

  it("works exactly once and adds the user as a member", async () => {
    const { token } = await createInvite(kitchenId, ownerId);
    const [first, second] = [await newUser(), await newUser()];
    const results = await Promise.all([redeemInvite(db, token, first), redeemInvite(db, token, second)]);
    expect(results.filter(Boolean)).toEqual([kitchenId]);
    const joined = results[0] ? first : second;
    expect(await roleOf(joined)).toBe("member");
    expect(await findInvite(token)).toBeNull();
    expect(await redeemInvite(db, token, await newUser())).toBeNull();
  });

  it("rejects expired, revoked and unknown links", async () => {
    const expired = await createInvite(kitchenId, ownerId);
    await db
      .update(kitchenInvites)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(kitchenInvites.expiresAt, expired.expiresAt));
    expect(await findInvite(expired.token)).toBeNull();
    expect(await redeemInvite(db, expired.token, await newUser())).toBeNull();

    const revoked = await createInvite(kitchenId, ownerId);
    const pending = await pendingInvites(kitchenId);
    const id = pending.find((p) => p.expiresAt.getTime() === revoked.expiresAt.getTime())!.id;
    await revokeInvite(kitchenId, id);
    expect(await redeemInvite(db, revoked.token, await newUser())).toBeNull();

    expect(await findInvite("x".repeat(32))).toBeNull();
  });

  it("never downgrades someone already in the kitchen", async () => {
    await db.insert(kitchenMembers).values({ kitchenId, userId: ownerId, role: "owner" }).onConflictDoNothing();
    const { token } = await createInvite(kitchenId, ownerId);
    expect(await redeemInvite(db, token, ownerId)).toBe(kitchenId);
    expect(await roleOf(ownerId)).toBe("owner");
  });
});
