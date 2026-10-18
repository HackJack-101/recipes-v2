"use client";

import * as M from "@radix-ui/react-dropdown-menu";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Dropdown({ trigger, children }: { trigger: ReactNode; children: ReactNode }) {
  return (
    <M.Root>
      <M.Trigger asChild>{trigger}</M.Trigger>
      <M.Portal>
        <M.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-48 rounded-xl border bg-card p-1.5 shadow-lg"
        >
          {children}
        </M.Content>
      </M.Portal>
    </M.Root>
  );
}

export function DropdownItem({ className, ...props }: ComponentProps<typeof M.Item>) {
  return (
    <M.Item
      className={cn(
        "flex min-h-10 cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 text-sm outline-none data-[highlighted]:bg-muted [&_svg]:size-4 [&_svg]:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export const DropdownSeparator = () => <M.Separator className="my-1 h-px bg-border" />;
export const DropdownLabel = ({ children }: { children: ReactNode }) => (
  <M.Label className="px-2.5 py-1.5 text-xs font-medium text-muted-foreground">{children}</M.Label>
);
