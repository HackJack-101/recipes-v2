export type RenderedEmail = { subject: string; text: string; html: string };

type Content = {
  subject: string;
  heading: string;
  paragraphs: string[];
  action: { label: string; url: string };
  /** Small print under the button (expiry, "ignore this email"…). */
  notes: string[];
  footer: string;
};

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const color = { primary: "#c4552d", text: "#2b211c", muted: "#7a6e66", background: "#faf8f5", border: "#ece6df" };

/** A plain-text version and a simple HTML version that holds up in most mail clients (tables, inline styles). */
export function renderEmail({ subject, heading, paragraphs, action, notes, footer }: Content): RenderedEmail {
  const text = [heading, "", ...paragraphs.flatMap((p) => [p, ""]), `${action.label}:`, action.url, "", ...notes, "", "—", footer].join("\n");

  const p = (s: string, style = "") => `<p style="margin:0 0 16px;${style}">${escape(s)}</p>`;
  const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(subject)}</title></head>
<body style="margin:0;padding:0;background:${color.background};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${color.background};padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid ${color.border};border-radius:16px;">
<tr><td style="padding:32px 28px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;color:${color.text};">
<h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:24px;line-height:1.25;font-weight:600;">${escape(heading)}</h1>
${paragraphs.map((s) => p(s)).join("\n")}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="border-radius:12px;background:${color.primary};">
<a href="${escape(action.url)}" style="display:inline-block;padding:14px 24px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:12px;">${escape(action.label)}</a>
</td></tr></table>
${notes.map((s) => p(s, `font-size:14px;color:${color.muted};`)).join("\n")}
${p(action.url, `font-size:13px;color:${color.muted};word-break:break-all;`)}
</td></tr>
</table>
<p style="margin:16px 0 0;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:${color.muted};">${escape(footer)}</p>
</td></tr>
</table>
</body>
</html>`;

  return { subject, text, html };
}

type EmailKey = keyof (typeof import("@/messages/en.json"))["email"];
type T = (key: EmailKey, values?: Record<string, string | number>) => string;

export function passwordResetEmail(t: T, { url, email, appName, minutes }: { url: string; email: string; appName: string; minutes: number }) {
  return renderEmail({
    subject: t("resetSubject", { app: appName }),
    heading: t("resetHeading"),
    paragraphs: [t("resetBody", { email })],
    action: { label: t("resetAction"), url },
    notes: [t("resetExpiry", { minutes }), t("resetIgnore")],
    footer: t("footer", { app: appName }),
  });
}
