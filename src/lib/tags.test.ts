import { expect, it } from "vitest";
import { emptyRecipe, recipeInput } from "./recipe-input";
import { slugify, suggestTags } from "./tags";

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

it("suggests dashed tags from text typed with spaces", () => {
  const dashed = [{ name: "plat-principal", count: 2 }, { name: "plat-du-jour", count: 1 }];
  expect(suggestTags(dashed, "plat p").map((t) => t.name)).toEqual(["plat-principal"]);
  expect(suggestTags(dashed, "PLAT ").map((t) => t.name)).toEqual(["plat-principal", "plat-du-jour"]);
});

it("slugifies tags", () => {
  expect(slugify("Végétarien")).toBe("vegetarien");
  expect(slugify("  Plat principal ")).toBe("plat-principal");
  expect(slugify("Œufs & crème")).toBe("oeufs-creme");
  expect(slugify("--sans_gluten!!")).toBe("sans-gluten");
  expect(slugify("Noël 2025")).toBe("noel-2025");
  expect(slugify("¡!")).toBe("");
  expect(slugify(`${"a".repeat(39)} b`)).toBe("a".repeat(39));
});

it("stores recipe tags as unique slugs", () => {
  const { tags } = recipeInput.parse({ ...emptyRecipe(), title: "Tarte", tags: ["Végétarien", "vegetarien", "Plat principal", "!!"] });
  expect(tags).toEqual(["vegetarien", "plat-principal"]);
});
