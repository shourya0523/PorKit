import { NextResponse } from "next/server";
import { getStore } from "@/lib/content/store";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const clerkUserId =
    url.searchParams.get("clerkUserId") ?? "local-dev-user";
  const content = getStore().listPortfolioContent(clerkUserId);
  return NextResponse.json(content);
}
