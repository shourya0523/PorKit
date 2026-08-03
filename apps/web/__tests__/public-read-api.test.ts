import { describe, expect, it, beforeEach } from "vitest";
import { createMemoryStore } from "@/lib/content/store";

describe("public read API AE4", () => {
  let store: ReturnType<typeof createMemoryStore>;

  beforeEach(() => {
    store = createMemoryStore();
  });

  it("valid key + allowed Origin returns published projects/experience", () => {
    const exp = store.createExperience("user_a", {
      company: "Acme",
      title: "Dev",
      status: "published",
    });
    store.publishExperience("user_a", exp.id);
    store.createProject("user_a", {
      name: "DraftOnly",
      status: "draft",
    });
    const published = store.createProject("user_a", {
      name: "Live",
      description: "Shown",
      status: "published",
    });
    store.publishProject("user_a", published.id);

    const { key } = store.createPublishableKey("user_a", [
      "https://portfolio.example",
    ]);

    const result = store.readPublishedPortfolio(
      key,
      "https://portfolio.example",
      { isBrowser: true },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.projects.map((p) => p.name)).toEqual(["Live"]);
    expect(result.data.experience).toHaveLength(1);
    expect(result.data.projects.find((p) => p.name === "DraftOnly")).toBeUndefined();
  });

  it("valid key + disallowed Origin is rejected", () => {
    const { key } = store.createPublishableKey("user_a", [
      "https://allowed.example",
    ]);
    const result = store.readPublishedPortfolio(
      key,
      "https://evil.example",
      { isBrowser: true },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(403);
  });

  it("revoked key is rejected", () => {
    const created = store.createPublishableKey("user_a", [
      "https://portfolio.example",
    ]);
    store.revokeKey("user_a", created.id);
    const result = store.readPublishedPortfolio(
      created.key,
      "https://portfolio.example",
      { isBrowser: true },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(401);
  });
});
