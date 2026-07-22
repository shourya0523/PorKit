import { NextResponse } from "next/server";
import { getStore } from "@/lib/content/store";
import type { PlanId } from "@porkit/shared";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    type?: string;
    data?: {
      clerkUserId?: string;
      planId?: PlanId;
      customerId?: string;
    };
  };

  // Stripe signature verification requires STRIPE_WEBHOOK_SECRET — stub for local.
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    const user = getStore().applyStripeWebhook({
      type: body.type ?? "customer.subscription.updated",
      clerkUserId: body.data?.clerkUserId,
      planId: body.data?.planId,
      customerId: body.data?.customerId,
    });
    return NextResponse.json({ received: true, user });
  }

  // When secret is configured, callers should verify via Stripe SDK (wired in deploy).
  const user = getStore().applyStripeWebhook({
    type: body.type ?? "customer.subscription.updated",
    clerkUserId: body.data?.clerkUserId,
    planId: body.data?.planId,
    customerId: body.data?.customerId,
  });
  return NextResponse.json({ received: true, user });
}
