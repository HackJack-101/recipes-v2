import path from "node:path";
import { and, count, eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { hashPassword } from "@/lib/password";
import { slugify } from "@/lib/tags";
import { db } from "./index";
import { recipeTags, tags, users } from "./schema";

// Arbitrary key for the Postgres advisory lock that serializes setup.
const SETUP_LOCK = 7_265_281;

/** Applies pending migrations and creates the first super admin. Runs once at server start. */
export async function setupDatabase() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  // Several processes may start at once (replicas, parallel test files): set up one at a time.
  const lock = await db.$client.reserve();
  try {
    await lock`select pg_advisory_lock(${SETUP_LOCK})`;
    await migrateAndSeed();
  } finally {
    await lock`select pg_advisory_unlock(${SETUP_LOCK})`;
    lock.release();
  }
}

async function migrateAndSeed() {
  await migrate(db, { migrationsFolder: path.join(/* turbopackIgnore: true */ process.cwd(), "drizzle") });
  await slugifyTags();

  const [{ value }] = await db.select({ value: count() }).from(users);
  if (value > 0) return;

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn("[setup] No users yet and ADMIN_EMAIL / ADMIN_PASSWORD are not set: nobody can log in.");
    return;
  }
  await db.insert(users).values({
    email,
    name: process.env.ADMIN_NAME?.trim() || "Admin",
    passwordHash: await hashPassword(password),
    isSuperAdmin: true,
  });
  console.log(`[setup] Created super admin ${email}`);
}

/**
 * Rewrites tags saved before they were slugs ("Végétarien" → "vegetarien"),
 * merging those that end up with the same slug in a kitchen. Does nothing once done.
 */
export async function slugifyTags() {
  const stale = (await db.select().from(tags)).filter((t) => slugify(t.name) && slugify(t.name) !== t.name);
  if (!stale.length) return;
  await db.transaction(async (tx) => {
    for (const tag of stale) {
      const name = slugify(tag.name);
      const [target] = await tx
        .select({ id: tags.id })
        .from(tags)
        .where(and(eq(tags.kitchenId, tag.kitchenId), eq(tags.name, name)));
      if (!target) {
        await tx.update(tags).set({ name }).where(eq(tags.id, tag.id));
        continue;
      }
      await tx.execute(sql`
        insert into ${recipeTags} (recipe_id, tag_id)
        select recipe_id, ${target.id} from ${recipeTags} where tag_id = ${tag.id}
        on conflict do nothing`);
      await tx.delete(tags).where(eq(tags.id, tag.id));
    }
  });
  console.log(`[setup] Converted ${stale.length} tag(s) to slugs`);
}
