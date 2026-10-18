import { requireKitchen } from "@/lib/access";
import { attachment, kitchenZip } from "@/lib/export";
import { slugify } from "@/lib/markdown";

export async function GET(_: Request, { params }: { params: Promise<{ kitchenId: string }> }) {
  const { kitchen } = await requireKitchen((await params).kitchenId);
  const zip = await kitchenZip(kitchen.id);
  return new Response(zip, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": attachment(`${slugify(kitchen.name)}.zip`),
    },
  });
}
