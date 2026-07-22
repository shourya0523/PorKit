import { NextResponse } from "next/server";
import { getStore } from "@/lib/content/store";

export async function POST(req: Request) {
  const body = (await req.json()) as { clerkUserId?: string };
  const clerkUserId = body.clerkUserId ?? "local-dev-user";
  const portfolio = getStore().confirmImportReview(clerkUserId);
  return NextResponse.json({
    importReviewedAt: portfolio.importReviewedAt,
  });
}
