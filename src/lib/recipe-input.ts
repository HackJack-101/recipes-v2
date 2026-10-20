import { z } from "zod";
import { canonicalTags } from "./tags";

const optionalInt = z.number().int().min(0).max(100000).nullable();

export const ingredientInput = z.object({
  quantity: z.number().positive().max(1e6).nullable(),
  unit: z.string().trim().max(40),
  name: z.string().trim().min(1).max(200),
});

export const recipeInput = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000),
  servings: z.number().int().min(1).max(1000).nullable(),
  prepMinutes: optionalInt,
  cookMinutes: optionalInt,
  tags: z
    .array(z.string().max(200))
    .max(30)
    .transform((tags) => canonicalTags(tags)),
  ingredients: z.array(ingredientInput).max(200),
  steps: z.array(z.string().trim().min(1).max(5000)).max(100),
});

export type RecipeInput = z.infer<typeof recipeInput>;
export type IngredientInput = z.infer<typeof ingredientInput>;

export const emptyRecipe = (): RecipeInput => ({
  title: "",
  description: "",
  servings: 4,
  prepMinutes: null,
  cookMinutes: null,
  tags: [],
  ingredients: [],
  steps: [],
});
