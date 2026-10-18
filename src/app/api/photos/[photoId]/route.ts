import { eq } from "drizzle-orm";
import { db } from "@/db";
import { photos, recipes } from "@/db/schema";
import { getActor, isUuid } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { canUseKitchen } from "@/lib/permissions";
import { readPhoto } from "@/lib/photos";

/** Serves a photo to kitchen members, or to anyone holding the recipe's share token. */
export async function GET(req: Request, { params }: { params: Promise<{ photoId: string }> }) {
  const { photoId } = await params;
  if (!isUuid(photoId)) return new Response(null, { status: 404 });

  const [row] = await db
    .select({ fileName: photos.fileName, kitchenId: recipes.kitchenId, shareToken: recipes.shareToken })
    .from(photos)
    .innerJoin(recipes, eq(recipes.id, photos.recipeId))
    .where(eq(photos.id, photoId))
    .limit(1);
  if (!row) return new Response(null, { status: 404 });

  const share = new URL(req.url).searchParams.get("share");
  let allowed = Boolean(share && row.shareToken && share === row.shareToken);
  if (!allowed) {
    const user = await getCurrentUser();
    allowed = Boolean(user && canUseKitchen(await getActor(user, row.kitchenId)));
  }
  if (!allowed) return new Response(null, { status: 404 });

  try {
    const data = await readPhoto(row.fileName);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "image/webp",
        // Photo files are immutable (new upload → new id), but access can be revoked.
        "Cache-Control": "private, max-age=86400",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
