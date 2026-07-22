import { describe, expect, it, beforeEach } from "vitest";
import { createMemoryStore } from "@/lib/content/store";

describe("content CRUD", () => {
  let store: ReturnType<typeof createMemoryStore>;

  beforeEach(() => {
    store = createMemoryStore();
  });

  it("creates experience and project and reloads them", () => {
    store.createExperience("user_a", {
      company: "Acme",
      title: "Engineer",
      summary: "Built things",
    });
    store.createProject("user_a", {
      name: "Cool App",
      description: "Does cool stuff",
    });

    const content = store.listPortfolioContent("user_a");
    expect(content.experience).toHaveLength(1);
    expect(content.experience[0]?.company).toBe("Acme");
    expect(content.projects).toHaveLength(1);
    expect(content.projects[0]?.name).toBe("Cool App");
  });

  it("edits draft then publish promotes status", () => {
    const exp = store.createExperience("user_a", {
      company: "Acme",
      title: "Engineer",
    });
    store.updateExperience("user_a", exp.id, { summary: "Updated draft" });
    const published = store.publishExperience("user_a", exp.id);
    expect(published.status).toBe("published");
    expect(published.summary).toBe("Updated draft");
  });

  it("deletes an item from subsequent reads", () => {
    const project = store.createProject("user_a", { name: "Temp" });
    store.deleteProject("user_a", project.id);
    expect(store.listPortfolioContent("user_a").projects).toHaveLength(0);
  });

  it("rejects unauthorized mutations", () => {
    const project = store.createProject("user_a", { name: "Mine" });
    expect(() =>
      store.updateProject("user_b", project.id, { name: "Stolen" }),
    ).toThrow("UNAUTHORIZED");
  });
});
