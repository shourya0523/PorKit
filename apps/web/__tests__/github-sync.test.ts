import { describe, expect, it, beforeEach } from "vitest";
import { createMemoryStore } from "@/lib/content/store";

describe("github sync AE2", () => {
  let store: ReturnType<typeof createMemoryStore>;

  beforeEach(() => {
    store = createMemoryStore();
  });

  it("syncs selected repo changes and ignores unselected siblings", () => {
    const portfolio = store.ensurePortfolio("user_a");
    store.connectGithub("user_a", "inst_1");
    store.selectRepos("user_a", [
      { githubRepoId: "1", fullName: "ada/selected" },
    ]);

    const selected = store.syncGithubRepoChange(portfolio.id, "1", {
      name: "selected",
      url: "https://github.com/ada/selected",
      language: "TypeScript",
      topics: ["portfolio"],
      description: "Selected repo",
      stars: 12,
      fullName: "ada/selected",
    });
    expect(selected.synced).toBe(true);

    const ignored = store.syncGithubRepoChange(portfolio.id, "2", {
      name: "other",
      url: "https://github.com/ada/other",
      language: "Go",
      topics: [],
      description: "Unselected",
      stars: 99,
      fullName: "ada/other",
    });
    expect(ignored.synced).toBe(false);
    expect(ignored.reason).toBe("not_selected");

    const projects = store.listPortfolioContent("user_a").projects;
    expect(projects).toHaveLength(1);
    expect(projects[0]?.githubRepoId).toBe("1");
  });

  it("disconnecting GitHub stops further sync", () => {
    const portfolio = store.ensurePortfolio("user_a");
    store.connectGithub("user_a", "inst_1");
    store.selectRepos("user_a", [
      { githubRepoId: "1", fullName: "ada/selected" },
    ]);
    store.disconnectGithub("user_a");
    const result = store.syncGithubRepoChange(portfolio.id, "1", {
      name: "selected",
      url: "https://github.com/ada/selected",
      language: "TS",
      topics: [],
      description: "x",
      stars: 1,
      fullName: "ada/selected",
    });
    expect(result.synced).toBe(false);
    expect(result.reason).toBe("disconnected");
  });

  it("webhook for non-selected repo is ignored", () => {
    const portfolio = store.ensurePortfolio("user_a");
    store.connectGithub("user_a", "inst_1");
    store.selectRepos("user_a", []);
    const result = store.syncGithubRepoChange(portfolio.id, "99", {
      name: "nope",
      url: "https://github.com/x/nope",
      language: "",
      topics: [],
      description: "",
      stars: 0,
      fullName: "x/nope",
    });
    expect(result.reason).toBe("not_selected");
  });
});
