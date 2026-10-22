import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";

/** Lets phones add the app to the home screen with its name and icon. */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations("app");
  return {
    name: t("name"),
    short_name: t("name"),
    description: t("tagline"),
    start_url: "/",
    display: "standalone",
    background_color: "#fbf8f4",
    theme_color: "#c4593a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
