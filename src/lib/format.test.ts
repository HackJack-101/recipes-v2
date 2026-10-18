import { expect, it } from "vitest";
import { formatDuration } from "./format";

it("formats durations", () => {
  expect(formatDuration(45)).toBe("45 min");
  expect(formatDuration(60)).toBe("1 h");
  expect(formatDuration(95)).toBe("1 h 35");
  expect(formatDuration(125)).toBe("2 h 05");
});
