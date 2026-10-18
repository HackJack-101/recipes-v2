import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireKitchen } from "@/lib/access";
import { aiImportEnabled } from "@/lib/ai-import";
import { kitchenTags } from "@/lib/recipes";
import { PageTitle } from "@/components/layout/page-title";
import { ImportFlow } from "@/components/recipe/import-flow";

type Props = { params: Promise<{ kitchenId: string }> };

export async function generateMetadata() {
  return { title: (await getTranslations("import"))("title") };
}

export default async function ImportPage({ params }: Props) {
  const { kitchen } = await requireKitchen((await params).kitchenId);
  if (!aiImportEnabled()) notFound();
  const t = await getTranslations("import");
  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle back={{ href: `/kitchens/${kitchen.id}`, label: kitchen.name }}>{t("title")}</PageTitle>
      <ImportFlow kitchenId={kitchen.id} kitchenTags={await kitchenTags(kitchen.id)} />
    </div>
  );
}
