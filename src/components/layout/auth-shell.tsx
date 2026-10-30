import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Logo } from "./logo";

/** Centered card for signed-out pages (password reset). */
export async function AuthShell({ children }: { children: ReactNode }) {
  const t = await getTranslations("app");
  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(ellipse_at_top,var(--accent),transparent_60%)] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo name={t("name")} />
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-sm">{children}</div>
      </div>
    </main>
  );
}
