import { NextResponse } from "next/server";
import { authErrorResponse, requireClerkUserId } from "@/lib/auth";
import { getStore } from "@/lib/content/store";

export async function POST() {
  try {
    const clerkUserId = await requireClerkUserId();
    const portfolio = await Promise.resolve(
      getStore().confirmImportReview(clerkUserId),
    );
    return NextResponse.json({
      importReviewedAt: portfolio.importReviewedAt,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
