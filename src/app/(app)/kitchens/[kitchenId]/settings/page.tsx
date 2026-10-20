import { asc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { kitchenMembers, users } from "@/db/schema";
import { requireKitchen } from "@/lib/access";
import { PageTitle } from "@/components/layout/page-title";
import { emailEnabled } from "@/lib/email";
import { pendingInvites } from "@/lib/invites";
import { InviteLinks } from "@/components/kitchen/invite-links";
import { KitchenSettings } from "@/components/kitchen/kitchen-settings";

type Props = { params: Promise<{ kitchenId: string }> };

export async function generateMetadata() {
  return { title: (await getTranslations("kitchen"))("settings") };
}

export default async function KitchenSettingsPage({ params }: Props) {
  const { kitchen, user } = await requireKitchen((await params).kitchenId, { manage: true });
  const t = await getTranslations("kitchen");
  const members = await db
    .select({ id: users.id, name: users.name, email: users.email, role: kitchenMembers.role })
    .from(kitchenMembers)
    .innerJoin(users, eq(users.id, kitchenMembers.userId))
    .where(eq(kitchenMembers.kitchenId, kitchen.id))
    .orderBy(asc(users.name));
  const invites = (await pendingInvites(kitchen.id)).map(({ id, email, createdByName, hoursLeft }) => ({
    id,
    email,
    createdByName,
    hoursLeft,
  }));
  const appUrl = process.env.APP_URL?.replace(/\/$/, "") ?? "";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageTitle back={{ href: `/kitchens/${kitchen.id}`, label: kitchen.name }}>{t("settings")}</PageTitle>
      <KitchenSettings kitchen={{ id: kitchen.id, name: kitchen.name }} members={members} currentUserId={user.id} />
      <InviteLinks kitchen={{ id: kitchen.id, name: kitchen.name }} invites={invites} appUrl={appUrl} canEmail={emailEnabled()} />
    </div>
  );
}
