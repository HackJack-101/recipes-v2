"use client";

import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export function Dialog({
  trigger,
  title,
  description,
  children,
  open,
  onOpenChange,
}: {
  trigger?: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <D.Trigger asChild>{trigger}</D.Trigger>}
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <D.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-2xl border bg-card p-6 shadow-xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <D.Title className="font-display text-xl font-semibold">{title}</D.Title>
              {description ? (
                <D.Description className="mt-1 text-sm text-muted-foreground">{description}</D.Description>
              ) : (
                <D.Description className="sr-only">{title}</D.Description>
              )}
            </div>
            <D.Close className="-m-2 rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Close">
              <X className="size-5" />
            </D.Close>
          </div>
          {children}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
