import { CookingPot } from "lucide-react";

export function Logo({ name }: { name: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <CookingPot className="size-5" />
      </span>
      <span className="font-display text-lg font-semibold">{name}</span>
    </span>
  );
}
