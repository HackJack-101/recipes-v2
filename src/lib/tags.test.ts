import { expect, it } from "vitest";
import { suggestTags } from "./tags";

const tags = [
  { name: "dessert", count: 9 },
  { name: "végétarien", count: 5 },
  { name: "apéritif", count: 4 },
  { name: "légumes", count: 3 },
  { name: "vegan", count: 1 },
];

it("suggests tags starting with the text first, ignoring case and accents", () => {
  expect(suggestTags(tags, "VEG").map((t) => t.name)).toEqual(["végétarien", "vegan"]);
  expect(suggestTags(tags, "gu").map((t) => t.name)).toEqual(["légumes"]);
  expect(suggestTags(tags, "a").map((t) => t.name)).toEqual(["apéritif", "végétarien", "vegan"]);
  expect(suggestTags(tags, "e").map((t) => t.name)).toEqual(["dessert", "végétarien", "apéritif", "légumes", "vegan"]);
  expect(suggestTags(tags, " apé ").map((t) => t.name)).toEqual(["apéritif"]);
  expect(suggestTags(tags, "zzz")).toEqual([]);
});
