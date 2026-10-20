"use client";

import { KeyRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { resetPasswordAction } from "@/app/actions/password";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function ResetPasswordForm({ token, email }: { token: string; email: string }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(resetPasswordAction.bind(null, token), undefined);
  return (
    <form action={action} className="space-y-4">
      {/* Lets password managers update the right entry. */}
      <input type="email" name="username" value={email} autoComplete="username" readOnly hidden />
      <div>
        <Label htmlFor="password">{t("newPassword")}</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} autoFocus />
        <p className="mt-1.5 text-xs text-muted-foreground">{t("passwordHint")}</p>
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        <KeyRound />
        {t("savePassword")}
      </Button>
    </form>
  );
}
