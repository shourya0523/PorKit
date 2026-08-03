import { NextResponse } from "next/server";
import { authErrorResponse, requireClerkUserId } from "@/lib/auth";
import { getStore } from "@/lib/content/store";

export async function GET() {
  try {
    const clerkUserId = await requireClerkUserId();
    const content = await Promise.resolve(
      getStore().listPortfolioContent(clerkUserId),
    );
    return NextResponse.json(content);
  } catch (error) {
    return authErrorResponse(error);
  }
}
