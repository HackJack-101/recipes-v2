import { describe, expect, it } from "vitest";
import { recipeToMarkdown, slugify } from "./markdown";

const labels = {
  servings: "Servings",
  prep: "Prep",
  cook: "Cook",
  ingredients: "Ingredients",
  steps: "Steps",
  tags: "Tags",
  minutes: "min",
};

describe("recipeToMarkdown", () => {
  it("renders a full recipe", () => {
    const md = recipeToMarkdown(
      {
        title: "Crêpes",
        description: "Classic French crêpes.",
        servings: 4,
        prepMinutes: 10,
        cookMinutes: 20,
        tags: ["dessert", "french"],
        ingredients: [
          { quantity: 250, unit: "g", name: "flour" },
          { quantity: 0.5, unit: "l", name: "milk" },
          { quantity: null, unit: "", name: "salt" },
        ],
        steps: ["Mix everything.", "Cook in a hot pan."],
      },
      labels,
    );
    expect(md).toContain("# Crêpes");
    expect(md).toContain("**Servings:** 4");
    expect(md).toContain("**Tags:** dessert, french");
    expect(md).toContain("- 250 g flour");
    expect(md).toContain("- ½ l milk");
    expect(md).toContain("- salt");
    expect(md).toContain("2. Cook in a hot pan.");
  });
});

describe("slugify", () => {
  it("strips accents and punctuation", () => {
    expect(slugify("Crème brûlée à l'orange !")).toBe("creme-brulee-a-l-orange");
    expect(slugify("???")).toBe("recipe");
  });
});
