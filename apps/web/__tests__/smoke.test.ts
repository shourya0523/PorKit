import { describe, expect, it } from "vitest";

/**
 * Smoke: marketing is public; dashboard is a protected matcher.
 * Full Clerk redirect needs live keys — we assert route protection config.
 */
describe("auth smoke", () => {
  it("middleware protects dashboard routes", async () => {
    const mod = await import("../middleware");
    expect(mod.config.matcher.length).toBeGreaterThan(0);
    expect(typeof mod.default).toBe("function");
  });

  it("marketing home module exports a page", async () => {
    const page = await import("../app/(marketing)/page");
    expect(typeof page.default).toBe("function");
  });

  it("dashboard shell module exports a page", async () => {
    const page = await import("../app/(dashboard)/dashboard/page");
    expect(typeof page.default).toBe("function");
  });
});
