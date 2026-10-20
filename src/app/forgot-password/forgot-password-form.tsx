"use client";

import { MailCheck, Send } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { requestPasswordResetAction } from "@/app/actions/password";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(requestPasswordResetAction, undefined);

  if (state?.sentTo) {
    return (
      <div className="space-y-5">
        <div role="status" className="flex gap-3 rounded-xl bg-accent p-4 text-sm text-accent-foreground">
          <MailCheck className="size-5 shrink-0" />
          <p>{t("forgotSent", { email: state.sentTo })}</p>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">{t("backToSignIn")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        <Send />
        {pending ? t("sending") : t("sendResetLink")}
      </Button>
      <p className="text-center text-sm">
        <Link href="/login" className="text-muted-foreground hover:text-foreground">
          {t("backToSignIn")}
        </Link>
      </p>
    </form>
  );
}
