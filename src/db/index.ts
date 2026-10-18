import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { sql?: postgres.Sql };

// postgres() connects lazily, so importing this module at build time is safe.
// setupDatabase() fails fast at startup when DATABASE_URL is missing.
const sql = globalForDb.sql ?? postgres(process.env.DATABASE_URL ?? "postgres://localhost/recipes", { max: 10 });
if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;

export const db = drizzle(sql, { schema });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
