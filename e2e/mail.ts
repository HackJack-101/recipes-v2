import { expect, type APIRequestContext } from "@playwright/test";

export type Mail = { from: string; subject: string; text: string; html: string };

/** Waits for the latest email sent to `to` (by the sink in mail-sink.mjs) that matches `subject`. */
export async function waitForMail(request: APIRequestContext, to: string, subject: RegExp): Promise<Mail> {
  let mail: Mail | null = null;
  await expect
    .poll(
      async () => {
        const res = await request.get(`http://localhost:3199/last?to=${encodeURIComponent(to)}`);
        mail = res.ok() ? await res.json() : null;
        return mail?.subject ?? "";
      },
      { timeout: 10_000 },
    )
    .toMatch(subject);
  return mail!;
}

/** The first link to this app in an email's text. */
export const linkIn = (mail: Mail, path: RegExp) => {
  const url = mail.text.match(/https?:\/\/\S+/g)?.find((u) => path.test(new URL(u).pathname));
  if (!url) throw new Error(`No link matching ${path} in: ${mail.text}`);
  return new URL(url).pathname;
};
