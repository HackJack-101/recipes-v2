import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { userKitchens } from "@/lib/kitchens";
import { appVersion } from "@/lib/version";
import { Logo } from "@/components/layout/logo";
import { UserMenu } from "@/components/layout/user-menu";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [t, kitchens] = await Promise.all([getTranslations("app"), userKitchens(user)]);
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="no-print sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="rounded-xl">
            <Logo name={t("name")} />
          </Link>
          <UserMenu
            user={{ name: user.name, email: user.email, isSuperAdmin: user.isSuperAdmin }}
            kitchens={kitchens.map(({ id, name }) => ({ id, name }))}
            version={appVersion()}
          />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6 sm:px-6 sm:pt-8">{children}</main>
    </div>
  );
}
