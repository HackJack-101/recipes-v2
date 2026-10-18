import path from "node:path";
import { count } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { hashPassword } from "@/lib/password";
import { db } from "./index";
import { users } from "./schema";

/** Applies pending migrations and creates the first super admin. Runs once at server start. */
export async function setupDatabase() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  await migrate(db, { migrationsFolder: path.join(/* turbopackIgnore: true */ process.cwd(), "drizzle") });

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
