"use client";

import { Check, ChefHat, Languages, LogOut, Monitor, Moon, Shield, Sun } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useTransition } from "react";
import { logout, setLocale } from "@/app/actions/auth";
import { Dropdown, DropdownItem, DropdownLabel, DropdownSeparator } from "@/components/ui/dropdown";

type Props = {
  user: { name: string; email: string; isSuperAdmin: boolean };
  kitchens: { id: string; name: string }[];
  version: string;
};

export function UserMenu({ user, kitchens, version }: Props) {
  const t = useTranslations("menu");
  const locale = useLocale();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [, startTransition] = useTransition();

  const changeLocale = (l: string) =>
    startTransition(async () => {
      await setLocale(l);
      router.refresh();
    });

  const initials = user.name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Dropdown
      trigger={
        <button
          className="grid size-10 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground ring-offset-2 transition hover:brightness-95"
          aria-label={t("open")}
        >
          {initials}
        </button>
      }
    >
      <div className="px-2.5 py-2">
        <p className="text-sm font-medium">{user.name}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
      <DropdownSeparator />
      {kitchens.length > 0 && <DropdownLabel>{t("kitchens")}</DropdownLabel>}
      {kitchens.map((k) => (
        <DropdownItem key={k.id} asChild>
          <Link href={`/kitchens/${k.id}`}>
            <ChefHat />
            <span className="truncate">{k.name}</span>
          </Link>
        </DropdownItem>
      ))}
      {user.isSuperAdmin && (
        <DropdownItem asChild>
          <Link href="/admin">
            <Shield />
            {t("admin")}
          </Link>
        </DropdownItem>
      )}
      <DropdownSeparator />
      <DropdownLabel>{t("language")}</DropdownLabel>
      {[
        ["en", "English"],
        ["fr", "Français"],
      ].map(([l, label]) => (
        <DropdownItem key={l} onSelect={() => changeLocale(l)}>
          <Languages />
          <span className="flex-1">{label}</span>
          {locale === l && <Check className="!text-primary" />}
        </DropdownItem>
      ))}
      <DropdownSeparator />
      <DropdownLabel>{t("theme")}</DropdownLabel>
      {(
        [
          ["light", Sun],
          ["dark", Moon],
          ["system", Monitor],
        ] as const
      ).map(([value, Icon]) => (
        <DropdownItem key={value} onSelect={(e) => (e.preventDefault(), setTheme(value))}>
          <Icon />
          <span className="flex-1">{t(value)}</span>
          {theme === value && <Check className="!text-primary" />}
        </DropdownItem>
      ))}
      <DropdownSeparator />
      <DropdownItem onSelect={() => startTransition(() => logout())}>
        <LogOut />
        {t("logout")}
      </DropdownItem>
      <DropdownSeparator />
      <p className="px-2.5 py-1.5 text-xs text-muted-foreground tabular-nums">{t("version", { version })}</p>
    </Dropdown>
  );
}
