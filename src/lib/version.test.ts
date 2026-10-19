import { expect, it } from "vitest";
import { appVersion } from "./version";

it("formats releases, branch builds and source runs", () => {
  expect(appVersion({ APP_VERSION: "1.2.0", APP_COMMIT: "abcdef1234" })).toBe("v1.2.0");
  expect(appVersion({ APP_VERSION: "1.3.0-rc.1" })).toBe("v1.3.0-rc.1");
  expect(appVersion({ APP_VERSION: "main", APP_COMMIT: "abcdef1234" })).toBe("main (abcdef1)");
  expect(appVersion({ APP_VERSION: "", APP_COMMIT: "" })).toBe("dev");
  expect(appVersion({})).toBe("dev");
});
