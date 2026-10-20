import { createTranslator } from "next-intl";
import { expect, it } from "vitest";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";
import { inviteEmail, passwordResetEmail, renderEmail } from "./email-templates";

it("escapes text in the HTML version and keeps it as is in the text version", () => {
  const email = renderEmail({
    subject: "Hi <you>",
    heading: "Tom & Jerry's",
    paragraphs: ['<script>alert("x")</script>'],
    action: { label: "Go", url: "https://example.com/a?b=1&c=2" },
    notes: ["Note"],
    footer: "Footer",
  });
  expect(email.html).toContain("Tom &amp; Jerry&#39;s");
  expect(email.html).toContain("&lt;script&gt;");
  expect(email.html).not.toContain("<script>");
  expect(email.html).toContain('href="https://example.com/a?b=1&amp;c=2"');
  expect(email.text).toContain("Tom & Jerry's");
  expect(email.text).toContain("https://example.com/a?b=1&c=2");
});

it("writes the reset email in the recipient's language", () => {
  const values = { url: "https://r.test/reset-password/abc", email: "a@b.fr", appName: "Recettes", minutes: 60 };
  const french = passwordResetEmail(createTranslator({ locale: "fr", messages: fr, namespace: "email" }), values);
  expect(french.subject).toBe("Réinitialisez votre mot de passe Recettes");
  expect(french.text).toContain("a@b.fr");
  expect(french.text).toContain("expire dans 60 minutes");
  expect(french.text).toContain(values.url);
  const english = passwordResetEmail(createTranslator({ locale: "en", messages: en, namespace: "email" }), values);
  expect(english.html).toContain("Choose a new password");
});

it("writes the invite email with the inviter and kitchen", () => {
  const t = createTranslator({ locale: "fr", messages: fr, namespace: "email" });
  const email = inviteEmail(t, { url: "https://r.test/invite/xyz", inviter: "Mamie", kitchen: "Chez <Mamie>", appName: "Recettes", hours: 24 });
  expect(email.subject).toBe("Mamie vous invite dans la cuisine « Chez <Mamie> »");
  expect(email.html).toContain("Rejoignez « Chez &lt;Mamie&gt; »");
  expect(email.text).toContain("expire dans 24 heures");
  expect(email.text).toContain("https://r.test/invite/xyz");
});
