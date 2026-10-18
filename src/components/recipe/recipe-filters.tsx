"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export function RecipeFilters({ tags }: { tags: string[] }) {
  const t = useTranslations("kitchen");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const activeTag = params.get("tag");
  const [q, setQ] = useState(params.get("q") ?? "");
  const [pending, startTransition] = useTransition();

  const update = (next: { q?: string; tag?: string | null }) => {
    const sp = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    startTransition(() => router.replace(`${pathname}${sp.size ? `?${sp}` : ""}`, { scroll: false }));
  };

  // Debounce typing so every keystroke doesn't hit the server.
  useEffect(() => {
    if (q === (params.get("q") ?? "")) return;
    const id = setTimeout(() => update({ q }), 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="mt-6 space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("search")}
          aria-label={t("search")}
          className={cn("pl-10", pending && "opacity-80")}
        />
      </div>
      {tags.length > 0 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
          {activeTag && (
            <button
              onClick={() => update({ tag: null })}
              className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full border px-3 text-sm text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" />
              {t("allTags")}
            </button>
          )}
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => update({ tag: tag === activeTag ? null : tag })}
              aria-pressed={tag === activeTag}
              className={cn(
                "h-9 shrink-0 rounded-full border px-3.5 text-sm transition",
                tag === activeTag
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card hover:bg-muted",
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
