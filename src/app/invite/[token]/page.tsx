import type { Metadata } from "next";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { kitchenMembers } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { findInvite } from "@/lib/invites";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { JoinInvite, SignUpForm } from "./invite-forms";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: (await getTranslations("invite"))("title"),
    robots: { index: false, follow: false, nocache: true },
    referrer: "no-referrer",
  };
}

/** Landing page of a kitchen invite link: sign up, or join with the current account. */
export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const [invite, user, t] = await Promise.all([findInvite(token), getCurrentUser(), getTranslations()]);
  const member =
    invite && user
      ? await db.query.kitchenMembers.findFirst({
          where: and(eq(kitchenMembers.kitchenId, invite.kitchenId), eq(kitchenMembers.userId, user.id)),
        })
      : undefined;
  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(ellipse_at_top,var(--accent),transparent_60%)] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo name={t("app.name")} />
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          {!invite ? (
            <>
              <h1 className="text-2xl font-semibold">{t("invite.invalidTitle")}</h1>
              <p className="mt-2 text-muted-foreground">{t("invite.invalid")}</p>
              <Button asChild variant="outline" className="mt-6 w-full">
                <Link href="/">{t("invite.home")}</Link>
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-primary">
                {invite.inviterName ? t("invite.invitedBy", { name: invite.inviterName }) : t("invite.invited")}
              </p>
              <h1 className="mt-1 text-2xl font-semibold">{t("invite.join", { kitchen: invite.kitchenName })}</h1>
              <p className="mt-2 mb-5 text-sm text-muted-foreground">{t("invite.expires", { hours: invite.hoursLeft })}</p>
              {member ? (
                <>
                  <p className="text-sm">{t("invite.alreadyMember")}</p>
                  <Button asChild className="mt-4 w-full">
                    <Link href={`/kitchens/${invite.kitchenId}`}>{t("invite.openKitchen")}</Link>
                  </Button>
                </>
              ) : user ? (
                <JoinInvite token={token} userName={user.name} />
              ) : (
                <>
                  <SignUpForm token={token} email={invite.email} />
                  <p className="mt-5 text-center text-sm text-muted-foreground">
                    {t("invite.haveAccount")}{" "}
                    <Link href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`} className="font-medium text-primary underline-offset-4 hover:underline">
                      {t("auth.signIn")}
                    </Link>
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
