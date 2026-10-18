import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const field =
  "w-full rounded-xl border border-input bg-card px-3.5 text-base placeholder:text-muted-foreground/70 transition-shadow focus-visible:border-primary disabled:opacity-60 sm:text-sm";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(field, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(field, "min-h-24 py-2.5 leading-relaxed", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(field, "h-11 pr-8", className)} {...props} />;
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("mb-1.5 block text-sm font-medium", className)} {...props} />;
}
