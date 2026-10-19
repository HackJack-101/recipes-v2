"use client";

import { Copy, FileDown, Link2, Pencil, Printer, Share2, Trash2, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteRecipeAction, setSharingAction } from "@/app/actions/recipes";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Dropdown, DropdownItem, DropdownSeparator } from "@/components/ui/dropdown";
import { Input } from "@/components/ui/input";
import { FavoriteButton } from "./favorite-button";
import { WakeLockButton } from "./wake-lock-button";

type Props = { recipeId: string; favorite: boolean; shareUrl: string | null; appUrl: string };

export function RecipeActions({ recipeId, favorite, shareUrl, appUrl }: Props) {
  const t = useTranslations("recipe");
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [url, setUrl] = useState(shareUrl);
  const [pending, startTransition] = useTransition();

  const origin = () => appUrl || window.location.origin;

  const toggleShare = (shared: boolean) =>
    startTransition(async () => {
      const token = await setSharingAction(recipeId, shared);
      setUrl(token ? `${origin()}/share/${token}` : null);
      toast.success(shared ? t("shareEnabled") : t("shareRevoked"));
    });

  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast.success(t("linkCopied"));
  };

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <FavoriteButton recipeId={recipeId} favorite={favorite} />
      <WakeLockButton />
      <Button variant="outline" size="sm" asChild>
        <Link href={`/recipes/${recipeId}/edit`} aria-label={t("edit")}>
          <Pencil />
          <span className="hidden sm:inline">{t("edit")}</span>
        </Link>
      </Button>
      <Button variant="outline" size="sm" onClick={() => setShareOpen(true)} aria-label={t("share")}>
        <Share2 />
        <span className="hidden sm:inline">{t("share")}</span>
      </Button>
      <Dropdown
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label={t("more")}>
            <MoreHorizontal />
          </Button>
        }
      >
        <DropdownItem asChild>
          <a href={`/api/recipes/${recipeId}/markdown`}>
            <FileDown />
            {t("exportMarkdown")}
          </a>
        </DropdownItem>
        <DropdownItem onSelect={() => setTimeout(() => window.print(), 50)}>
          <Printer />
          {t("print")}
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem className="text-destructive [&_svg]:!text-destructive" onSelect={() => setDeleteOpen(true)}>
          <Trash2 />
          {t("delete")}
        </DropdownItem>
      </Dropdown>

      <Dialog open={shareOpen} onOpenChange={setShareOpen} title={t("shareTitle")} description={t("shareDescription")}>
        {url ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input readOnly value={url} onFocus={(e) => e.target.select()} aria-label={t("shareTitle")} />
              <Button variant="secondary" size="icon" onClick={copy} aria-label={t("copyLink")}>
                <Copy />
              </Button>
            </div>
            <Button variant="outline" className="w-full text-destructive" disabled={pending} onClick={() => toggleShare(false)}>
              {t("revokeLink")}
            </Button>
          </div>
        ) : (
          <Button className="w-full" disabled={pending} onClick={() => toggleShare(true)}>
            <Link2 />
            {t("createLink")}
          </Button>
        )}
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen} title={t("deleteTitle")} description={t("deleteDescription")}>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setDeleteOpen(false)}>
            {t("cancel")}
          </Button>
          <Button variant="destructive" disabled={pending} onClick={() => startTransition(() => deleteRecipeAction(recipeId))}>
            <Trash2 />
            {t("delete")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
