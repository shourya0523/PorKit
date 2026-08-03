import { describe, expect, it, beforeEach } from "vitest";
import { canRunAiEnrichment, getEntitlements } from "@porkit/shared";
import { createMemoryStore } from "@/lib/content/store";

describe("entitlements", () => {
  let store: ReturnType<typeof createMemoryStore>;

  beforeEach(() => {
    store = createMemoryStore();
  });

  it("free plan exceeding AI cap blocks enrichment with upgrade signal", () => {
    const free = getEntitlements("free");
    store.setPlan("user_a", "free");
    const user = store.ensureUser("user_a");
    user.aiEnrichmentsUsedMonth = free.aiEnrichmentsPerMonth;

    const project = store.createProject("user_a", {
      name: "X",
      description: "d",
      status: "published",
    });
    const result = store.enrichProject(
      "user_a",
      project.id,
      {
        readme: "# x",
        description: "d",
        language: "TS",
        topics: [],
        stars: 1,
        url: "https://github.com/a/x",
      },
      "new",
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.upgradeRequired).toBe(true);
    expect(result.reason).toMatch(/upgrade/i);
  });

  it("paid plan enables hourly sync cadence entitlement", () => {
    expect(getEntitlements("paid").syncCadenceHours).toBe(1);
    expect(canRunAiEnrichment(getEntitlements("paid"), 0).allowed).toBe(true);
  });

  it("Stripe webhook upgrades plan and gated action succeeds", () => {
    store.setPlan("user_a", "free");
    const free = getEntitlements("free");
    store.ensureUser("user_a").aiEnrichmentsUsedMonth = free.aiEnrichmentsPerMonth;

    store.applyStripeWebhook({
      type: "customer.subscription.updated",
      clerkUserId: "user_a",
      planId: "paid",
      customerId: "cus_123",
    });

    const project = store.createProject("user_a", {
      name: "X",
      description: "d",
      status: "published",
    });
    // reset counter still at free cap but paid allows more
    const result = store.enrichProject(
      "user_a",
      project.id,
      {
        readme: "# x",
        description: "d",
        language: "TS",
        topics: ["a"],
        stars: 1,
        url: "https://github.com/a/x",
      },
      "new",
    );
    expect(result.ok).toBe(true);
    expect(store.ensureUser("user_a").planId).toBe("paid");
  });
});
