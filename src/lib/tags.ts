export type Tag = { name: string; count: number };

const normalize = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Tags matching the search text (ignoring case and accents): those starting with it first, then by use. */
export function suggestTags(tags: Tag[], query: string) {
  const q = normalize(query.trim());
  const starts: Tag[] = [];
  const contains: Tag[] = [];
  for (const tag of tags) {
    const name = normalize(tag.name);
    if (name.startsWith(q)) starts.push(tag);
    else if (name.includes(q)) contains.push(tag);
  }
  return [...starts, ...contains];
}
