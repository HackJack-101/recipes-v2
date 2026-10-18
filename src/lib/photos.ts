import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const MAX_PHOTO_BYTES = 20 * 1024 * 1024;

// Runtime data, not source: keep the bundler from tracing it into the build.
const uploadDir = () => path.resolve(/* turbopackIgnore: true */ process.env.UPLOAD_DIR ?? "./uploads");
const photoPath = (fileName: string) => path.join(/* turbopackIgnore: true */ uploadDir(), path.basename(fileName));

/** Normalises an upload (orientation, size, format) and stores it as WebP. */
export async function storePhoto(file: File) {
  if (file.size > MAX_PHOTO_BYTES) throw new Error("Photo too large");
  const input = Buffer.from(await file.arrayBuffer());
  const { data, info } = await sharp(input, { failOn: "error" })
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  const fileName = `${randomUUID()}.webp`;
  await mkdir(uploadDir(), { recursive: true });
  await writeFile(photoPath(fileName), data);
  return { fileName, width: info.width, height: info.height };
}

export function readPhoto(fileName: string) {
  return readFile(photoPath(fileName));
}

export async function deletePhotoFile(fileName: string) {
  await unlink(photoPath(fileName)).catch(() => {});
}
