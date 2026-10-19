export type Tag = { name: string; count: number };

export const MAX_TAG_LENGTH = 40;

/** A tag's canonical form: lowercase ASCII letters and digits separated by single dashes ("Plat principal" → "plat-principal"). */
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

/** Tags matching the search text (ignoring case, accents and punctuation): those starting with it first, then by use. */
export function suggestTags(tags: Tag[], query: string) {
  const q = slugify(query);
  const starts: Tag[] = [];
  const contains: Tag[] = [];
  for (const tag of tags) {
    const name = slugify(tag.name);
    if (name.startsWith(q)) starts.push(tag);
    else if (name.includes(q)) contains.push(tag);
  }
  return [...starts, ...contains];
}
