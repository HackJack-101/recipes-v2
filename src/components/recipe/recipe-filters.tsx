"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { suggestTags, tagSlug, type Tag } from "@/lib/tags";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

/** How many tags show before "more", and how many suggestions while typing. */
const VISIBLE_TAGS = 8;

/** Tags come most used first; the count shows only for tags on several recipes. */
export function RecipeFilters({ tags }: { tags: Tag[] }) {
  const t = useTranslations("kitchen");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  // A slug, though a tag's name from an older link works too.
  const activeParam = params.get("tag");
  const activeTag = activeParam && tagSlug(activeParam);
  const [q, setQ] = useState(params.get("q") ?? "");
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();
  // The search text last sent to the URL, so picking a suggestion doesn't send it again.
  const sentQ = useRef(q);

  const update = (next: { q?: string | null; tag?: string | null }) => {
    if ("q" in next) sentQ.current = next.q ?? "";
    const sp = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    startTransition(() => router.replace(`${pathname}${sp.size ? `?${sp}` : ""}`, { scroll: false }));
  };

  // Debounce typing so every keystroke doesn't hit the server.
  useEffect(() => {
    if (q === sentQ.current) return;
    const id = setTimeout(() => update({ q }), 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const typing = q.trim() !== "";
  let shown = typing ? suggestTags(tags, q).slice(0, VISIBLE_TAGS) : expanded ? tags : tags.slice(0, VISIBLE_TAGS);
  const active = activeTag && tags.find((t) => t.slug === activeTag);
  if (active && !shown.includes(active)) shown = [active, ...shown];
  const hidden = typing || expanded ? 0 : tags.length - shown.length;

  // A suggestion replaces the text that found it.
  const pickTag = (slug: string) => {
    if (typing) {
      setQ("");
      update({ tag: slug, q: null });
    } else {
      update({ tag: slug === activeTag ? null : slug });
    }
  };

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
      {(shown.length > 0 || activeTag) && (
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
          {shown.map(({ name, slug, count }) => (
            <button
              key={slug}
              onClick={() => pickTag(slug)}
              aria-pressed={slug === activeTag}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm transition",
                slug === activeTag
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card hover:bg-muted",
              )}
            >
              {name}
              {count > 1 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs font-medium tabular-nums",
                    slug === activeTag ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          ))}
          {(hidden > 0 || (expanded && !typing && tags.length > VISIBLE_TAGS)) && (
            <button
              onClick={() => setExpanded((e) => !e)}
              aria-expanded={expanded}
              className="inline-flex h-9 shrink-0 items-center rounded-full px-3 text-sm font-medium text-primary hover:bg-muted"
            >
              {expanded ? t("fewerTags") : t("moreTags", { count: hidden })}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
