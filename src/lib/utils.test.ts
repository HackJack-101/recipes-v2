import { describe, expect, it } from "vitest";
import { safeNext } from "./utils";

describe("safeNext", () => {
  it("keeps local paths", () => {
    expect(safeNext("/invite/abc")).toBe("/invite/abc");
    expect(safeNext("/kitchens/1?q=x")).toBe("/kitchens/1?q=x");
  });

  it("falls back to the home page for anything that could leave the site", () => {
    for (const bad of ["https://evil.test", "//evil.test", "/\\evil.test", "evil", "", null, undefined]) {
      expect(safeNext(bad)).toBe("/");
    }
  });
});
