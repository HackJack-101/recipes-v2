import path from "node:path";
import { and, count, eq, isNull, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { hashPassword } from "@/lib/password";
import { tagSlug } from "@/lib/tags";
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
  await fillTagSlugs();

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
 * Gives a slug to tags created before slugs existed, merging those that share one in a kitchen
 * ("Végétarien" and "végétarien"): the first keeps its name and gets the other's recipes.
 * Does nothing once done.
 */
export async function fillTagSlugs() {
  const pending = await db.select().from(tags).where(isNull(tags.slug)).orderBy(tags.name);
  if (!pending.length) return;
  await db.transaction(async (tx) => {
    for (const tag of pending) {
      const slug = tagSlug(tag.name);
      const [target] = await tx
        .select({ id: tags.id })
        .from(tags)
        .where(and(eq(tags.kitchenId, tag.kitchenId), eq(tags.slug, slug)));
      if (!target) {
        await tx.update(tags).set({ slug }).where(eq(tags.id, tag.id));
        continue;
      }
      await tx.execute(sql`
        insert into ${recipeTags} (recipe_id, tag_id)
        select recipe_id, ${target.id} from ${recipeTags} where tag_id = ${tag.id}
        on conflict do nothing`);
      await tx.delete(tags).where(eq(tags.id, tag.id));
    }
  });
  console.log(`[setup] Added slugs to ${pending.length} tag(s)`);
}
