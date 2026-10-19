import { sql } from "drizzle-orm";
import { db } from "@/db";
import { appVersion } from "@/lib/version";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ status: "ok", version: appVersion() });
  } catch {
    return Response.json({ status: "db_unavailable" }, { status: 503 });
  }
}
