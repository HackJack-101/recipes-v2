import { describe, expect, it } from "vitest";
import { formatQuantity, parseQuantity, scaleFactor, scaleQuantity } from "./scaler";

describe("formatQuantity", () => {
  it.each([
    [0.5, "½"],
    [0.25, "¼"],
    [0.333, "⅓"],
    [0.66, "⅔"],
    [1.5, "1½"],
    [2, "2"],
    [2.75, "2¾"],
    [3.98, "4"],
    [12.3, "12.5"],
    [250, "250"],
    [0.05, "0.05"],
  ])("%s → %s", (value, expected) => {
    expect(formatQuantity(value)).toBe(expected);
  });

  it("falls back to a rounded decimal when no fraction is close", () => {
    expect(formatQuantity(1.42)).toBe("1.4");
    expect(formatQuantity(1.42, "fr")).toBe("1,4");
  });

  it("returns an empty string for invalid values", () => {
    expect(formatQuantity(0)).toBe("");
    expect(formatQuantity(Number.NaN)).toBe("");
  });
});

describe("scaling", () => {
  it("scales by guests over servings", () => {
    expect(scaleFactor(4, 6)).toBe(1.5);
    expect(scaleQuantity(1, scaleFactor(4, 2))).toBe("½");
    expect(scaleQuantity(200, scaleFactor(4, 6))).toBe("300");
  });

  it("uses the guest value as a free multiplier when servings is unknown", () => {
    expect(scaleFactor(null, 2)).toBe(2);
  });

  it("leaves quantity-less ingredients empty", () => {
    expect(scaleQuantity(null, 2)).toBe("");
  });
});

describe("parseQuantity", () => {
  it.each([
    ["2", 2],
    ["1,5", 1.5],
    ["0.25", 0.25],
    ["1/2", 0.5],
    ["1 1/2", 1.5],
    ["½", 0.5],
    ["1½", 1.5],
    ["2 ¾", 2.75],
    ["", null],
    ["abc", null],
    ["1/0", null],
    ["0", null],
  ])("%j → %s", (input, expected) => {
    expect(parseQuantity(input)).toBe(expected);
  });
});
