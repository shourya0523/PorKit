import { describe, expect, it } from "vitest";
import { evaluateConfidence } from "./confidence.js";
import { canRunAiEnrichment, getEntitlements } from "./entitlements.js";
import { experienceSchema, projectSchema } from "./content-schema.js";

describe("evaluateConfidence", () => {
  it("returns high when README plus language present", () => {
    expect(
      evaluateConfidence({
        readme: "# Cool project",
        description: "",
        language: "TypeScript",
        topics: [],
        stars: 0,
        url: "",
      }),
    ).toBe("high");
  });

  it("returns low when only a short description with no corroboration", () => {
    expect(
      evaluateConfidence({
        readme: "",
        description: "A thing",
        language: "",
        topics: [],
        stars: 0,
        url: "",
      }),
    ).toBe("low");
  });
});

describe("entitlements", () => {
  it("blocks free plan when AI cap exceeded", () => {
    const free = getEntitlements("free");
    expect(canRunAiEnrichment(free, free.aiEnrichmentsPerMonth).allowed).toBe(
      false,
    );
  });

  it("allows paid plan under high cap", () => {
    const paid = getEntitlements("paid");
    expect(canRunAiEnrichment(paid, 5).allowed).toBe(true);
    expect(paid.syncCadenceHours).toBe(1);
  });
});

describe("content schemas", () => {
  it("parses experience and project drafts", () => {
    expect(
      experienceSchema.parse({
        company: "Acme",
        title: "Engineer",
      }).status,
    ).toBe("draft");
    expect(
      projectSchema.parse({
        name: "PorKit",
      }).topics,
    ).toEqual([]);
  });
});
