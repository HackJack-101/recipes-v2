import { expect, it } from "vitest";
import { emptyRecipe, recipeInput } from "./recipe-input";
import { canonicalTags, slugify, suggestTags, tagSlug } from "./tags";

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

it("suggests tags with spaces or dashes alike", () => {
  const spaced = [{ name: "Plat principal" }, { name: "plat du jour" }];
  expect(suggestTags(spaced, "plat-p").map((t) => t.name)).toEqual(["Plat principal"]);
  expect(suggestTags(spaced, "PLAT ").map((t) => t.name)).toEqual(["Plat principal", "plat du jour"]);
});

it("slugifies tags", () => {
  expect(slugify("Végétarien")).toBe("vegetarien");
  expect(slugify("  Plat principal ")).toBe("plat-principal");
  expect(slugify("Œufs & crème")).toBe("oeufs-creme");
  expect(slugify("--sans_gluten!!")).toBe("sans-gluten");
  expect(slugify("Noël 2025")).toBe("noel-2025");
  expect(slugify("¡!")).toBe("");
  expect(slugify(`${"a".repeat(39)} b`)).toBe("a".repeat(39));
  expect(tagSlug("Cuisine  du Monde")).toBe("cuisine-du-monde");
  expect(tagSlug(" 日本 料理 ")).toBe("日本 料理");
});

it("keeps tags as written, once per slug, reusing existing spellings", () => {
  expect(canonicalTags(["  Plat   principal ", "plat-principal", "Végé", "", "VEGE"])).toEqual(["Plat principal", "Végé"]);
  expect(canonicalTags(["plat principal", "Apéro !"], ["Plat principal", "dessert"])).toEqual(["Plat principal", "Apéro !"]);
});

it("validates recipe tags as unique display names", () => {
  const { tags } = recipeInput.parse({ ...emptyRecipe(), title: "Tarte", tags: ["Végétarien", "vegetarien", " Plat  principal", "  "] });
  expect(tags).toEqual(["Végétarien", "Plat principal"]);
});
