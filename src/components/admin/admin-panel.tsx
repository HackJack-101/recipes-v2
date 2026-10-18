"use client";

import { ChefHat, Plus, Settings, Shield, UserPlus } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { createKitchenAction, createUserAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";

type Props = {
  users: { id: string; name: string; email: string; isSuperAdmin: boolean }[];
  kitchens: { id: string; name: string; members: number }[];
};

export function AdminPanel({ users, kitchens }: Props) {
  const t = useTranslations("admin");
  const [userState, createUser, creatingUser] = useActionState(createUserAction, undefined);
  const [kitchenState, createKitchen, creatingKitchen] = useActionState(createKitchenAction, undefined);
  const userForm = useRef<HTMLFormElement>(null);
  const kitchenForm = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (userState?.ok) {
      toast.success(t("userCreated"));
      userForm.current?.reset();
    }
  }, [userState, t]);
  useEffect(() => {
    if (kitchenState?.ok) {
      toast.success(t("kitchenCreated"));
      kitchenForm.current?.reset();
    }
  }, [kitchenState, t]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-5 sm:p-6">
        <h2 className="text-xl font-semibold">{t("users")}</h2>
        <ul className="mt-4 divide-y">
          {users.map((u) => (
            <li key={u.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{u.name}</p>
                <p className="truncate text-sm text-muted-foreground">{u.email}</p>
              </div>
              {u.isSuperAdmin && (
                <Badge>
                  <Shield className="mr-1 size-3" />
                  {t("superAdmin")}
                </Badge>
              )}
            </li>
          ))}
        </ul>
        <form ref={userForm} action={createUser} className="mt-4 space-y-3 border-t pt-5">
          <h3 className="flex items-center gap-2 font-sans text-sm font-semibold">
            <UserPlus className="size-4" />
            {t("newUser")}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="u-name">{t("name")}</Label>
              <Input id="u-name" name="name" required maxLength={80} />
            </div>
            <div>
              <Label htmlFor="u-email">{t("email")}</Label>
              <Input id="u-email" name="email" type="email" required />
            </div>
          </div>
          <div>
            <Label htmlFor="u-password">{t("password")}</Label>
            <Input id="u-password" name="password" type="text" minLength={8} required autoComplete="off" />
            <p className="mt-1 text-xs text-muted-foreground">{t("passwordHint")}</p>
          </div>
          <label className="flex min-h-10 items-center gap-2 text-sm">
            <input type="checkbox" name="isSuperAdmin" className="size-4 accent-[var(--primary)]" />
            {t("makeSuperAdmin")}
          </label>
          {userState?.error && <p className="text-sm text-destructive">{userState.error}</p>}
          <Button type="submit" disabled={creatingUser}>
            {t("createUser")}
          </Button>
        </form>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="text-xl font-semibold">{t("kitchens")}</h2>
        {kitchens.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{t("noKitchens")}</p>
        ) : (
          <ul className="mt-4 divide-y">
            {kitchens.map((k) => (
              <li key={k.id} className="flex items-center gap-3 py-2">
                <ChefHat className="size-5 shrink-0 text-muted-foreground" />
                <Link href={`/kitchens/${k.id}`} className="min-w-0 flex-1 truncate font-medium hover:underline">
                  {k.name}
                </Link>
                <span className="text-sm text-muted-foreground">{t("memberCount", { count: k.members })}</span>
                <Button variant="ghost" size="icon-sm" asChild>
                  <Link href={`/kitchens/${k.id}/settings`} aria-label={t("manage")}>
                    <Settings />
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
        <form ref={kitchenForm} action={createKitchen} className="mt-4 space-y-3 border-t pt-5">
          <h3 className="flex items-center gap-2 font-sans text-sm font-semibold">
            <Plus className="size-4" />
            {t("newKitchen")}
          </h3>
          <div>
            <Label htmlFor="k-name">{t("kitchenName")}</Label>
            <Input id="k-name" name="name" required maxLength={80} />
          </div>
          <div>
            <Label htmlFor="k-owner">{t("owner")}</Label>
            <Select id="k-owner" name="ownerId" required defaultValue="">
              <option value="" disabled>
                {t("chooseOwner")}
              </option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </Select>
          </div>
          {kitchenState?.error && <p className="text-sm text-destructive">{kitchenState.error}</p>}
          <Button type="submit" disabled={creatingKitchen}>
            {t("createKitchen")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
