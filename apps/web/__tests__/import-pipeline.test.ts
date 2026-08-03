import { describe, expect, it, beforeEach } from "vitest";
import { createMemoryStore } from "@/lib/content/store";

describe("import pipeline AE1", () => {
  let store: ReturnType<typeof createMemoryStore>;

  beforeEach(() => {
    store = createMemoryStore();
  });

  it("valid résumé upload yields editable draft and blocks publish until review", () => {
    const job = store.startImport("user_a", "resume", {
      text: "Name: Ada Lovelace\nCompany: Analytical Engines\nTitle: Mathematician",
    });
    expect(job.status).toBe("completed");

    const content = store.listPortfolioContent("user_a");
    expect(content.portfolio.profileDraft.fullName).toBe("Ada Lovelace");
    expect(content.experience.length).toBeGreaterThan(0);
    expect(content.experience.every((e) => e.status === "draft")).toBe(true);
    expect(content.portfolio.importReviewedAt).toBeNull();

    const exp = content.experience[0]!;
    expect(() => store.publishExperience("user_a", exp.id)).toThrow(
      "IMPORT_REVIEW_REQUIRED",
    );

    store.confirmImportReview("user_a");
    const published = store.publishExperience("user_a", exp.id);
    expect(published.status).toBe("published");
  });

  it("corrupt file fails job and leaves content unchanged", () => {
    const before = store.listPortfolioContent("user_a");
    const job = store.startImport("user_a", "resume", { corrupt: true });
    expect(job.status).toBe("failed");
    expect(job.errorMessage).toMatch(/corrupt|unsupported/i);
    const after = store.listPortfolioContent("user_a");
    expect(after.experience).toHaveLength(before.experience.length);
    expect(after.projects).toHaveLength(before.projects.length);
  });

  it("LinkedIn export produces draft experience and profile", () => {
    store.startImport("user_a", "linkedin", {
      text: "Name: Grace Hopper\nCompany: Navy\nTitle: Rear Admiral",
    });
    const content = store.listPortfolioContent("user_a");
    expect(content.portfolio.profileDraft.fullName).toBe("Grace Hopper");
    expect(content.experience[0]?.company).toBe("Navy");
  });
});
