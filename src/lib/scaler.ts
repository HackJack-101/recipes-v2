const FRACTIONS: [number, string][] = [
  [1 / 8, "⅛"],
  [1 / 4, "¼"],
  [1 / 3, "⅓"],
  [3 / 8, "⅜"],
  [1 / 2, "½"],
  [5 / 8, "⅝"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"],
  [7 / 8, "⅞"],
];

/** Scale factor between the recipe's servings and the guests being cooked for. */
export function scaleFactor(servings: number | null, guests: number) {
  return servings ? guests / servings : guests;
}

/**
 * Formats a quantity the way a cook reads it: small values as vulgar fractions
 * (1½, ⅔), larger ones rounded to something measurable.
 */
export function formatQuantity(value: number, locale = "en"): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  if (value >= 20) return String(Math.round(value));
  if (value >= 10) return formatDecimal(Math.round(value * 2) / 2, locale);

  const whole = Math.floor(value);
  const rest = value - whole;
  if (rest < 0.06) return String(whole || formatDecimal(value, locale));
  if (rest > 0.94) return String(whole + 1);

  const [frac, glyph] = FRACTIONS.reduce((best, f) =>
    Math.abs(f[0] - rest) < Math.abs(best[0] - rest) ? f : best,
  );
  if (Math.abs(frac - rest) <= 0.04) return whole ? `${whole}${glyph}` : glyph;
  return formatDecimal(Math.round(value * 10) / 10, locale);
}

function formatDecimal(value: number, locale: string) {
  return value.toLocaleString(locale, { maximumFractionDigits: 2 });
}

export function scaleQuantity(quantity: number | null, factor: number, locale = "en") {
  return quantity == null ? "" : formatQuantity(quantity * factor, locale);
}

export const MULTIPLIERS = [0.5, 1, 1.5, 2, 3, 4];

const GLYPHS: Record<string, number> = Object.fromEntries(FRACTIONS.map(([v, g]) => [g, v]));

/** Parses what people type in a quantity box: "2", "1,5", "1/2", "1 1/2", "1½", "½". */
export function parseQuantity(input: string): number | null {
  let s = input.trim().replace(",", ".");
  if (!s) return null;
  let total = 0;
  const glyph = s.at(-1)!;
  if (glyph in GLYPHS) {
    total += GLYPHS[glyph];
    s = s.slice(0, -1).trim();
    if (!s) return total;
  }
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]) || null;
  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[2]) ? Number(frac[1]) / Number(frac[2]) : null;
  const n = Number(s);
  return Number.isFinite(n) && n + total > 0 ? n + total : null;
}
