import { describe, expect, it } from "vitest";
import {
  assertNoPigBranding,
  renderExperienceWidget,
  renderProjectsWidget,
} from "../src/index";

describe("widget branding AE5", () => {
  it("default markup/CSS contains no pig/barnyard brand tokens", () => {
    const markup =
      renderProjectsWidget([
        { name: "Demo", description: "A demo project", url: "https://example.com" },
      ]) +
      renderExperienceWidget([
        { company: "Acme", title: "Engineer", summary: "Shipped things" },
      ]);

    expect(assertNoPigBranding(markup)).toBe(true);
    expect(markup).toContain("Projects");
    expect(markup).toContain("Experience");
    expect(markup.toLowerCase()).not.toMatch(/\bpig\b/);
    expect(markup.toLowerCase()).not.toContain("barnyard");
    expect(markup.toLowerCase()).not.toContain("por-kit");
  });
});
