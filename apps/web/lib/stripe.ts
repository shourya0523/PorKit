import Stripe from "stripe";

const API_VERSION = "2025-02-24.acacia" as const;

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  if (!stripe) {
    stripe = new Stripe(key, { apiVersion: API_VERSION });
  }
  return stripe;
}

export function getStripeWebhookSecret(): string | undefined {
  return process.env.STRIPE_WEBHOOK_SECRET || undefined;
}

/** Verify Stripe webhook signatures (uses secret key only to construct the client). */
export function constructStripeEvent(
  rawBody: string,
  signature: string,
  webhookSecret: string,
): Stripe.Event {
  const key =
    process.env.STRIPE_SECRET_KEY ?? "sk_test_webhook_signature_verify_only";
  const client = stripe ?? new Stripe(key, { apiVersion: API_VERSION });
  return client.webhooks.constructEvent(rawBody, signature, webhookSecret);
}
