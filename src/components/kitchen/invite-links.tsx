"use client";

import { Copy, Link2, MailCheck, Send, Share } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";
import { createInviteAction, emailInviteAction, revokeInviteAction } from "@/app/actions/invites";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

type Invite = { id: string; email: string | null; createdByName: string | null; hoursLeft: number };

const noop = () => () => {};

export function InviteLinks({
  kitchen,
  invites,
  appUrl,
  canEmail,
}: {
  kitchen: { id: string; name: string };
  invites: Invite[];
  appUrl: string;
  /** Whether the server can send emails (SMTP configured). */
  canEmail: boolean;
}) {
  const t = useTranslations("kitchen");
  const [url, setUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const canShare = useSyncExternalStore(noop, () => "share" in navigator, () => false);

  const create = () =>
    startTransition(async () => {
      const token = await createInviteAction(kitchen.id);
      setUrl(`${appUrl || window.location.origin}/invite/${token}`);
    });

  const revoke = (id: string) => startTransition(() => revokeInviteAction(kitchen.id, id));

  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast.success(t("inviteCopied"));
  };

  const share = () => {
    if (url) navigator.share({ title: kitchen.name, text: t("inviteShareText", { kitchen: kitchen.name }), url }).catch(() => {});
  };

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-xl font-semibold">{t("invites")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("invitesDescription")}</p>

      {canEmail && <EmailInvite kitchenId={kitchen.id} />}

      {url && (
        <div className="mt-4 rounded-xl border bg-muted/40 p-3">
          <div className="flex gap-2">
            <Input readOnly value={url} onFocus={(e) => e.target.select()} aria-label={t("inviteLink")} />
            <Button variant="secondary" size="icon" onClick={copy} aria-label={t("copyInvite")}>
              <Copy />
            </Button>
            {canShare && (
              <Button variant="secondary" size="icon" onClick={share} aria-label={t("shareInvite")}>
                <Share />
              </Button>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("inviteShownOnce")}</p>
        </div>
      )}

      <Button className="mt-4" onClick={create} disabled={pending}>
        <Link2 />
        {url ? t("createAnotherInvite") : t("createInvite")}
      </Button>

      {invites.length > 0 && (
        <div className="mt-5 border-t pt-4">
          <h3 className="text-sm font-medium">{t("pendingInvites")}</h3>
          <ul className="mt-1 divide-y">
            {invites.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-sm text-muted-foreground">
                  {i.email
                    ? t("pendingEmailInvite", { email: i.email, name: i.createdByName ?? "—", hours: i.hoursLeft })
                    : t("pendingInvite", { name: i.createdByName ?? "—", hours: i.hoursLeft })}
                </span>
                <Button variant="ghost" size="sm" disabled={pending} onClick={() => revoke(i.id)} className="text-destructive">
                  {t("revokeInvite")}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function EmailInvite({ kitchenId }: { kitchenId: string }) {
  const t = useTranslations("kitchen");
  const [state, action, pending] = useActionState(emailInviteAction.bind(null, kitchenId), undefined);
  return (
    <form action={action} className="mt-4 border-b pb-5">
      <Label htmlFor="invite-email">{t("emailInvite")}</Label>
      <div className="flex gap-2">
        <Input
          // A new form after each send: empty once sent, the typed address kept on error.
          key={state?.at ?? state?.error}
          id="invite-email"
          name="email"
          type="email"
          autoComplete="off"
          placeholder={t("emailInvitePlaceholder")}
          defaultValue={state?.error ? state.email : ""}
          required
        />
        <Button type="submit" disabled={pending} className="shrink-0">
          <Send />
          {t("sendInvite")}
        </Button>
      </div>
      {state?.error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state?.sentTo && (
        <p role="status" className="mt-2 flex items-center gap-1.5 text-sm text-primary">
          <MailCheck className="size-4" />
          {t("emailInviteSent", { email: state.sentTo })}
        </p>
      )}
    </form>
  );
}
