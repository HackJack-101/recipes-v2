import { asc, count, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { kitchenMembers, kitchens, users } from "@/db/schema";
import { requireSuperAdmin } from "@/lib/auth";
import { PageTitle } from "@/components/layout/page-title";
import { AdminPanel } from "@/components/admin/admin-panel";

export async function generateMetadata() {
  return { title: (await getTranslations("admin"))("title") };
}

export default async function AdminPage() {
  await requireSuperAdmin();
  const t = await getTranslations("admin");
  const [userRows, kitchenRows] = await Promise.all([
    db
      .select({ id: users.id, name: users.name, email: users.email, isSuperAdmin: users.isSuperAdmin })
      .from(users)
      .orderBy(asc(users.name)),
    db
      .select({ id: kitchens.id, name: kitchens.name, members: count(kitchenMembers.userId) })
      .from(kitchens)
      .leftJoin(kitchenMembers, eq(kitchenMembers.kitchenId, kitchens.id))
      .groupBy(kitchens.id)
      .orderBy(asc(kitchens.name)),
  ]);
  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle>{t("title")}</PageTitle>
      <AdminPanel users={userRows} kitchens={kitchenRows} />
    </div>
  );
}
