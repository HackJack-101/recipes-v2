import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { isLocale, LOCALE_COOKIE, negotiateLocale } from "./config";

export default getRequestConfig(async () => {
  const cookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookie) ? cookie : negotiateLocale((await headers()).get("accept-language"));
  return {
    locale,
    // Dates are shown in the household's time zone, the same on the server and in the browser.
    timeZone: process.env.TIME_ZONE || "UTC",
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
