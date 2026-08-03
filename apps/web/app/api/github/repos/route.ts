import { NextResponse } from "next/server";
import { authErrorResponse, requireClerkUserId } from "@/lib/auth";
import { getStore } from "@/lib/content/store";

export async function PUT(req: Request) {
  try {
    const clerkUserId = await requireClerkUserId();
    const body = (await req.json()) as {
      repos?: { githubRepoId: string; fullName: string }[];
    };
    const selected = await Promise.resolve(
      getStore().selectRepos(clerkUserId, body.repos ?? []),
    );
    return NextResponse.json({ selected });
  } catch (error) {
    return authErrorResponse(error);
  }
}
