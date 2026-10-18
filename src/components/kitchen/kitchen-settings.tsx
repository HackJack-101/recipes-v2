"use client";

import { Crown, UserMinus, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import { addMemberAction, renameKitchenAction, setMemberRoleAction } from "@/app/actions/kitchens";
import type { MemberRole } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";

type Member = { id: string; name: string; email: string; role: MemberRole };

export function KitchenSettings({
  kitchen,
  members,
  currentUserId,
}: {
  kitchen: { id: string; name: string };
  members: Member[];
  currentUserId: string;
}) {
  const t = useTranslations("kitchen");
  const [renameState, rename, renaming] = useActionState(renameKitchenAction.bind(null, kitchen.id), undefined);
  const [addState, add, adding] = useActionState(addMemberAction.bind(null, kitchen.id), undefined);
  const [pending, startTransition] = useTransition();
  const addForm = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (renameState?.ok) toast.success(t("saved"));
  }, [renameState, t]);
  useEffect(() => {
    if (addState?.ok) {
      toast.success(t("memberAdded"));
      addForm.current?.reset();
    }
  }, [addState, t]);

  const setRole = (userId: string, role: MemberRole | null) =>
    startTransition(async () => {
      const res = await setMemberRoleAction(kitchen.id, userId, role);
      if (res?.error) toast.error(res.error);
    });

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <form action={rename} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="kitchen-name">{t("name")}</Label>
            <Input id="kitchen-name" name="name" defaultValue={kitchen.name} required maxLength={80} />
          </div>
          <Button type="submit" disabled={renaming}>
            {t("rename")}
          </Button>
        </form>
        {renameState?.error && <p className="mt-2 text-sm text-destructive">{renameState.error}</p>}
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="text-xl font-semibold">{t("members")}</h2>
        <ul className="mt-4 divide-y">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-medium">
                  <span className="truncate">{m.name}</span>
                  {m.id === currentUserId && <Badge className="bg-muted text-muted-foreground">{t("you")}</Badge>}
                </p>
                <p className="truncate text-sm text-muted-foreground">{m.email}</p>
              </div>
              <div className="flex items-center gap-1">
                {m.role === "owner" ? (
                  <Button variant="ghost" size="sm" disabled={pending} onClick={() => setRole(m.id, "member")}>
                    <Crown className="text-primary" />
                    {t("demote")}
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" disabled={pending} onClick={() => setRole(m.id, "owner")}>
                    <Crown />
                    {t("promote")}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={pending}
                  onClick={() => setRole(m.id, null)}
                  aria-label={t("removeMember", { name: m.name })}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <UserMinus />
                </Button>
              </div>
            </li>
          ))}
        </ul>

        <form ref={addForm} action={add} className="mt-4 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="member-email">{t("addMember")}</Label>
            <Input id="member-email" name="email" type="email" placeholder={t("memberEmail")} required />
          </div>
          <Select name="role" defaultValue="member" aria-label={t("role")} className="sm:w-36">
            <option value="member">{t("roleMember")}</option>
            <option value="owner">{t("roleOwner")}</option>
          </Select>
          <Button type="submit" disabled={adding}>
            <UserPlus />
            {t("add")}
          </Button>
        </form>
        {addState?.error && <p className="mt-2 text-sm text-destructive">{addState.error}</p>}
      </Card>
    </div>
  );
}
