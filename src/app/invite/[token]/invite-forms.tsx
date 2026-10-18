"use client";

import { LogIn, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { acceptInviteAction, signUpWithInviteAction } from "@/app/actions/invites";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function SignUpForm({ token }: { token: string }) {
  const t = useTranslations("invite");
  const [state, action, pending] = useActionState(signUpWithInviteAction.bind(null, token), undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="name">{t("name")}</Label>
        <Input id="name" name="name" autoComplete="name" required maxLength={80} autoFocus />
      </div>
      <div>
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <Label htmlFor="password">{t("password")}</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        <p className="mt-1.5 text-xs text-muted-foreground">{t("passwordHint")}</p>
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        <UserPlus />
        {t("createAccount")}
      </Button>
    </form>
  );
}

export function JoinInvite({ token, userName }: { token: string; userName: string }) {
  const t = useTranslations("invite");
  const [state, action, pending] = useActionState(acceptInviteAction.bind(null, token), undefined);
  return (
    <form action={action} className="space-y-4">
      <p className="text-sm">{t("signedInAs", { name: userName })}</p>
      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        <LogIn />
        {t("joinButton")}
      </Button>
    </form>
  );
}
