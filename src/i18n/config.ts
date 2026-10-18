export const locales = ["en", "fr"] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = "en";
export const LOCALE_COOKIE = "recipes_locale";

export const isLocale = (v: unknown): v is AppLocale => locales.includes(v as AppLocale);

export function negotiateLocale(acceptLanguage: string | null): AppLocale {
  for (const part of (acceptLanguage ?? "").split(",")) {
    const lang = part.split(";")[0].trim().slice(0, 2).toLowerCase();
    if (isLocale(lang)) return lang;
  }
  return defaultLocale;
}
