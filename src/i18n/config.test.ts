import { describe, expect, it } from "vitest";
import { negotiateLocale } from "./config";

describe("negotiateLocale", () => {
  it("picks the first supported language", () => {
    expect(negotiateLocale("fr-FR,fr;q=0.9,en;q=0.8")).toBe("fr");
    expect(negotiateLocale("de-DE,en-US;q=0.7")).toBe("en");
  });
  it("defaults to English", () => {
    expect(negotiateLocale(null)).toBe("en");
    expect(negotiateLocale("es")).toBe("en");
  });
});
