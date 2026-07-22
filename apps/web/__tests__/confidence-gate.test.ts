import { describe, expect, it, beforeEach } from "vitest";
import { createMemoryStore } from "@/lib/content/store";

describe("confidence gate AE3", () => {
  let store: ReturnType<typeof createMemoryStore>;

  beforeEach(() => {
    store = createMemoryStore();
  });

  it("low-evidence refresh keeps prior published prose and flags needs_review", () => {
    const project = store.createProject("user_a", {
      name: "Trusted",
      description: "Trusted published copy",
      status: "published",
    });

    const result = store.enrichProject(
      "user_a",
      project.id,
      {
        readme: "",
        description: "vague",
        language: "",
        topics: [],
        stars: 0,
        url: "",
      },
      "Unsupported hallucinated claim",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.confidence).toBe("low");
    expect(result.project.description).toBe("Trusted published copy");
    expect(result.project.status).toBe("needs_review");
  });

  it("high-evidence refresh replaces prose and clears needs_review", () => {
    const project = store.createProject("user_a", {
      name: "Trusted",
      description: "Old copy",
      status: "needs_review",
    });

    const result = store.enrichProject(
      "user_a",
      project.id,
      {
        readme: "# Solid readme with details",
        description: "CLI toolkit",
        language: "TypeScript",
        topics: ["cli"],
        stars: 40,
        url: "https://github.com/a/b",
      },
      "Fresh high-confidence prose",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.confidence).toBe("high");
    expect(result.project.description).toBe("Fresh high-confidence prose");
    expect(result.project.status).toBe("published");
  });

  it("owner accepting flagged draft publishes new prose", () => {
    const project = store.createProject("user_a", {
      name: "Trusted",
      description: "Old",
      status: "needs_review",
    });
    const accepted = store.acceptFlaggedProse(
      "user_a",
      project.id,
      "Owner-approved prose",
    );
    expect(accepted.status).toBe("published");
    expect(accepted.description).toBe("Owner-approved prose");
  });

  it("free plan skips history; paid plan stores snapshot on publish", () => {
    const freeProject = store.createProject("user_free", {
      name: "A",
      description: "v1",
      status: "published",
    });
    store.enrichProject(
      "user_free",
      freeProject.id,
      {
        readme: "# x",
        description: "d",
        language: "Go",
        topics: [],
        stars: 1,
        url: "https://github.com/a/a",
      },
      "v2",
    );
    const freePortfolio = store.ensurePortfolio("user_free");
    expect(store.listRevisions(freePortfolio.id)).toHaveLength(0);

    store.setPlan("user_paid", "paid");
    const paidProject = store.createProject("user_paid", {
      name: "B",
      description: "paid-v1",
      status: "published",
    });
    store.enrichProject(
      "user_paid",
      paidProject.id,
      {
        readme: "# x",
        description: "d",
        language: "Rust",
        topics: ["x"],
        stars: 2,
        url: "https://github.com/b/b",
      },
      "paid-v2",
    );
    const paidPortfolio = store.ensurePortfolio("user_paid");
    expect(store.listRevisions(paidPortfolio.id).length).toBeGreaterThan(0);
  });
});
