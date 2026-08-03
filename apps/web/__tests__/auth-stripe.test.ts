import { describe, expect, it, beforeEach, afterEach } from "vitest";
import Stripe from "stripe";
import { POST as stripeWebhook } from "@/app/api/stripe/webhook/route";
import { requireClerkUserId, isClerkConfigured } from "@/lib/auth";
import { resetStore } from "@/lib/content/store";

describe("authz identity", () => {
  const prevPub = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const prevSecret = process.env.CLERK_SECRET_KEY;

  afterEach(() => {
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = prevPub;
    process.env.CLERK_SECRET_KEY = prevSecret;
  });

  it("returns local-dev-user when Clerk is not configured", async () => {
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    delete process.env.CLERK_SECRET_KEY;
    expect(isClerkConfigured()).toBe(false);
    await expect(requireClerkUserId()).resolves.toBe("local-dev-user");
  });
});

describe("stripe webhook signature", () => {
  const prevSecret = process.env.STRIPE_WEBHOOK_SECRET;

  beforeEach(() => {
    resetStore();
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  afterEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = prevSecret;
  });

  it("accepts unsigned stub payloads only when secret is unset (non-production)", async () => {
    const req = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: JSON.stringify({
        type: "customer.subscription.updated",
        data: { clerkUserId: "user_stripe", planId: "paid" },
      }),
    });
    const res = await stripeWebhook(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { user: { planId: string } };
    expect(json.user.planId).toBe("paid");
  });

  it("rejects missing signature when webhook secret is configured", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
    const req = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: JSON.stringify({ type: "customer.subscription.updated" }),
    });
    const res = await stripeWebhook(req);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toMatch(/signature/i);
  });

  it("rejects invalid signatures via constructEvent", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
    const req = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "t=1,v1=deadbeef" },
      body: JSON.stringify({ id: "evt_1", object: "event", type: "ping" }),
    });
    const res = await stripeWebhook(req);
    expect(res.status).toBe(400);
  });

  it("accepts a valid Stripe-signed webhook and upgrades plan", async () => {
    const secret = "whsec_test_secret";
    process.env.STRIPE_WEBHOOK_SECRET = secret;

    const payload = JSON.stringify({
      id: "evt_test_1",
      object: "event",
      api_version: "2025-02-24.acacia",
      created: Math.floor(Date.now() / 1000),
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_test",
          object: "subscription",
          status: "active",
          customer: "cus_test",
          metadata: { clerkUserId: "user_signed" },
        },
      },
      livemode: false,
      pending_webhooks: 0,
      request: null,
    });

    const stripe = new Stripe("sk_test_webhook_signature_verify_only", {
      apiVersion: "2025-02-24.acacia",
    });
    const header = stripe.webhooks.generateTestHeaderString({
      payload,
      secret,
    });

    const req = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": header },
      body: payload,
    });
    const res = await stripeWebhook(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      received: boolean;
      user: { planId: string; clerkUserId: string };
    };
    expect(json.received).toBe(true);
    expect(json.user.clerkUserId).toBe("user_signed");
    expect(json.user.planId).toBe("paid");
  });
});
