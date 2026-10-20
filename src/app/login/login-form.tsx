"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { login } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

/** `canReset` shows the "forgot password" link (only when emails can be sent). */
export function LoginForm({ next, canReset }: { next: string; canReset: boolean }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </div>
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor="password">{t("password")}</Label>
          {canReset && (
            <Link href="/forgot-password" className="mb-1.5 text-sm text-primary hover:underline">
              {t("forgotPassword")}
            </Link>
          )}
        </div>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? t("signingIn") : t("signIn")}
      </Button>
    </form>
  );
}
