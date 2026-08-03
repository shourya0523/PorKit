import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStore } from "@/lib/content/store";
import {
  constructStripeEvent,
  getStripeWebhookSecret,
} from "@/lib/stripe";
import type { PlanId } from "@porkit/shared";

function planFromSubscription(sub: Stripe.Subscription): PlanId {
  const status = sub.status;
  if (status === "active" || status === "trialing") {
    return "paid";
  }
  return "free";
}

function clerkUserIdFromCustomer(
  customer: Stripe.Customer | Stripe.DeletedCustomer | string | null,
): string | undefined {
  if (!customer || typeof customer === "string") return undefined;
  if ("deleted" in customer && customer.deleted) return undefined;
  return customer.metadata?.clerkUserId;
}

export async function POST(req: Request) {
  const secret = getStripeWebhookSecret();
  const rawBody = await req.text();

  // Production / paid claims: signature verification is mandatory.
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "STRIPE_WEBHOOK_SECRET is not configured" },
        { status: 500 },
      );
    }
    // Local/test stub only — never used when secret is set.
    let body: {
      type?: string;
      data?: { clerkUserId?: string; planId?: PlanId; customerId?: string };
    };
    try {
      body = JSON.parse(rawBody) as typeof body;
    } catch {
      return NextResponse.json({ error: "invalid json" }, { status: 400 });
    }
    const user = await Promise.resolve(
      getStore().applyStripeWebhook({
        type: body.type ?? "customer.subscription.updated",
        clerkUserId: body.data?.clerkUserId,
        planId: body.data?.planId,
        customerId: body.data?.customerId,
      }),
    );
    return NextResponse.json({ received: true, user });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "missing stripe-signature" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    event = constructStripeEvent(rawBody, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  let clerkUserId: string | undefined;
  let planId: PlanId | undefined;
  let customerId: string | undefined;

  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.deleted"
  ) {
    const sub = event.data.object as Stripe.Subscription;
    customerId =
      typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    planId =
      event.type === "customer.subscription.deleted"
        ? "free"
        : planFromSubscription(sub);
    clerkUserId =
      sub.metadata?.clerkUserId ??
      (typeof sub.customer !== "string"
        ? clerkUserIdFromCustomer(sub.customer)
        : undefined);
  } else if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    clerkUserId = session.metadata?.clerkUserId ?? undefined;
    customerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id;
    planId = "paid";
  }

  const user = await Promise.resolve(
    getStore().applyStripeWebhook({
      type: "customer.subscription.updated",
      clerkUserId,
      planId,
      customerId,
    }),
  );

  return NextResponse.json({ received: true, user });
}
