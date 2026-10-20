import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${port}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    {
      // Catches the app's emails; tests read them from http://localhost:3199/last?to=<email>.
      command: "node e2e/mail-sink.mjs",
      url: "http://localhost:3199/health",
      reuseExistingServer: !process.env.CI,
    },
    {
      // Production server from the standalone build (run `pnpm build` first).
      command: `cp -r .next/static .next/standalone/.next/ && cp -r drizzle .next/standalone/ && PORT=${port} node .next/standalone/server.js`,
      url: `http://localhost:${port}/api/health`,
      env: { SMTP_HOST: "127.0.0.1", SMTP_PORT: "2525", SMTP_SECURE: "false", SMTP_FROM: "Recettes <recettes@test.local>" },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
