import { expect, it } from "vitest";
import en from "../messages/en.json";
import fr from "../messages/fr.json";

const keys = (o: object, prefix = ""): string[] =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));

it("French and English define the same messages", () => {
  expect(keys(fr).sort()).toEqual(keys(en).sort());
});
