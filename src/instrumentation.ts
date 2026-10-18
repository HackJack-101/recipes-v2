export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.SKIP_DB_SETUP === "1") return;
  const { setupDatabase } = await import("./db/setup");
  await setupDatabase();
}
