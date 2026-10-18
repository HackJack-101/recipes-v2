import { describe, expect, it } from "vitest";
import { canChangeRole, canManageKitchen, canUseKitchen } from "./permissions";

describe("permissions", () => {
  it("lets members use, and only owners manage, a kitchen", () => {
    expect(canUseKitchen({ isSuperAdmin: false, role: "member" })).toBe(true);
    expect(canUseKitchen({ isSuperAdmin: false, role: null })).toBe(false);
    expect(canManageKitchen({ isSuperAdmin: false, role: "member" })).toBe(false);
    expect(canManageKitchen({ isSuperAdmin: false, role: "owner" })).toBe(true);
  });

  it("lets super admins do everything", () => {
    expect(canUseKitchen({ isSuperAdmin: true, role: null })).toBe(true);
    expect(canManageKitchen({ isSuperAdmin: true, role: null })).toBe(true);
  });

  it("keeps at least one owner", () => {
    expect(canChangeRole(1, "owner", "member")).toBe(false);
    expect(canChangeRole(1, "owner", null)).toBe(false);
    expect(canChangeRole(2, "owner", null)).toBe(true);
    expect(canChangeRole(1, "member", null)).toBe(true);
    expect(canChangeRole(1, "owner", "owner")).toBe(true);
  });
});
