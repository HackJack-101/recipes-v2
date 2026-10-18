import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-2xl border bg-card shadow-sm", className)} {...props} />;
}

export function Badge({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground", className)}
      {...props}
    />
  );
}
