export type Tag = { name: string; slug: string; count: number };

export const MAX_TAG_LENGTH = 40;

/** Lowercase ASCII letters and digits separated by single dashes ("Plat principal" → "plat-principal"). */
export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, MAX_TAG_LENGTH)
    .replace(/^-+|-+$/g, "");
}

/** A tag as written: trimmed, single spaces, at most 40 characters. */
export const cleanTag = (text: string) => text.trim().replace(/\s+/g, " ").slice(0, MAX_TAG_LENGTH).trim();

/**
 * What identifies a tag, so "Plat principal" and "plat-principal" are the same one.
 * Text with no Latin letters or digits (e.g. "日本") keeps its lowercase form.
 */
export const tagSlug = (name: string) => slugify(name) || cleanTag(name).toLowerCase();

/** Cleans tags and drops empty ones and duplicates, reusing the spelling of `existing` tags with the same slug. */
export function canonicalTags(names: string[], existing: string[] = []) {
  const known = new Map(existing.map((name) => [tagSlug(name), name]));
  const tags = new Map<string, string>();
  for (const raw of names) {
    const name = cleanTag(raw);
    if (!name) continue;
    const slug = tagSlug(name);
    if (!tags.has(slug)) tags.set(slug, known.get(slug) ?? name);
  }
  return [...tags.values()];
}

/** Tags matching the search text (ignoring case, accents and punctuation): those starting with it first, then the rest in order. */
export function suggestTags<T extends { name: string }>(tags: T[], query: string) {
  const q = tagSlug(query);
  const starts: T[] = [];
  const contains: T[] = [];
  for (const tag of tags) {
    const slug = tagSlug(tag.name);
    if (slug.startsWith(q)) starts.push(tag);
    else if (slug.includes(q)) contains.push(tag);
  }
  return [...starts, ...contains];
}
