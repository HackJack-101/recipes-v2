import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import * as cheerio from "cheerio";
import { z } from "zod";
import { recipeInput, type RecipeInput } from "./recipe-input";
import { slugify } from "./tags";

const MAX_SOURCE_CHARS = 120_000;

export const aiImportEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

// Every field is required and nullable so the model says "unknown" instead of guessing.
const extractedRecipe = z.object({
  found: z.boolean().describe("false when the source contains no recipe"),
  title: z.string(),
  description: z.string(),
  servings: z.number().int().nullable(),
  prepMinutes: z.number().int().nullable(),
  cookMinutes: z.number().int().nullable(),
  tags: z.array(z.string()),
  ingredients: z.array(
    z.object({
      quantity: z.number().nullable(),
      unit: z.string(),
      name: z.string(),
    }),
  ),
  steps: z.array(z.string()),
});

const SYSTEM = `You extract cooking recipes from web pages or text into structured data for a family cookbook.

Rules:
- Only use information present in the source. Never invent missing values: use null for unknown numbers and an empty string for unknown text.
- Keep the source language for the title, description, ingredients and steps.
- quantity is a number (convert fractions like "1 1/2" or "½" to 1.5); unit is the measure as written ("g", "ml", "tbsp", "cup", "pinch"...), or "" when the ingredient is counted ("3 eggs" → quantity 3, unit "", name "eggs").
- Split the method into clear, ordered steps without numbering prefixes.
- description is one or two sentences from the source introducing the dish, or "".
- Suggest 1 to 5 short tags (dish type, main ingredient, cuisine, diet), written lowercase without accents and with dashes instead of spaces (e.g. "plat-principal"). Prefer tags from the kitchen's existing list when they fit.
- If the source has no recipe, set found to false and leave the other fields empty.`;

/** Reduces an HTML page to the text that matters, keeping JSON-LD recipe data when present. */
export function htmlToText(html: string) {
  const $ = cheerio.load(html);
  const jsonLd = $('script[type="application/ld+json"]')
    .map((_, el) => $(el).text())
    .get()
    .filter((t) => /recipe/i.test(t))
    .join("\n");
  $("script, style, noscript, svg, iframe, nav, footer, header, form").remove();
  const title = $("title").text().trim();
  // Keep block boundaries, or "<h1>Crêpes</h1><p>250 g" reads as "Crêpes250 g".
  $("br, p, div, li, tr, h1, h2, h3, h4, h5, h6, section, article").after("\n");
  const body = $("body")
    .text()
    .replace(/[^\S\n]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
  return [title && `Title: ${title}`, jsonLd && `Structured data:\n${jsonLd}`, `Page text:\n${body}`]
    .filter(Boolean)
    .join("\n\n");
}

export async function fetchPage(url: string) {
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Only http(s) URLs are supported");
  const res = await fetch(parsed, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; RecipesImporter/1.0)", Accept: "text/html,*/*" },
    signal: AbortSignal.timeout(15_000),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`The page answered ${res.status}`);
  return res.text();
}

export type ImportSource = { kind: "url"; url: string } | { kind: "html"; html: string } | { kind: "text"; text: string };

export class NoRecipeFound extends Error {}

export async function extractRecipe(source: ImportSource, existingTags: string[]): Promise<RecipeInput> {
  let text: string;
  if (source.kind === "url") text = `Source URL: ${source.url}\n\n${htmlToText(await fetchPage(source.url))}`;
  else if (source.kind === "html") text = htmlToText(source.html);
  else text = source.text;
  text = text.slice(0, MAX_SOURCE_CHARS);

  const client = new Anthropic();
  const response = await client.messages.parse({
    model: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
    max_tokens: 16000,
    system: SYSTEM,
    output_config: { effort: "low", format: zodOutputFormat(extractedRecipe) },
    messages: [
      {
        role: "user",
        content: `Existing kitchen tags: ${existingTags.length ? existingTags.join(", ") : "(none)"}\n\n<source>\n${text}\n</source>`,
      },
    ],
  });

  if (response.stop_reason === "refusal") throw new NoRecipeFound("The AI declined this source");
  const out = response.parsed_output;
  if (!out || !out.found || !out.title.trim()) throw new NoRecipeFound("No recipe found");

  return recipeInput.parse({
    title: out.title.slice(0, 200),
    description: out.description.slice(0, 5000),
    servings: positiveOrNull(out.servings),
    prepMinutes: positiveOrNull(out.prepMinutes),
    cookMinutes: positiveOrNull(out.cookMinutes),
    tags: [...new Set(out.tags.map(slugify).filter(Boolean))].slice(0, 10),
    ingredients: out.ingredients
      .filter((i) => i.name.trim())
      .map((i) => ({ quantity: i.quantity && i.quantity > 0 ? i.quantity : null, unit: i.unit.slice(0, 40), name: i.name.slice(0, 200) })),
    steps: out.steps.map((s) => s.trim()).filter(Boolean),
  });
}

const positiveOrNull = (n: number | null) => (n && n > 0 ? n : null);
