import { NextResponse } from "next/server";
import { getStore } from "@/lib/content/store";

export async function PUT(req: Request) {
  const body = (await req.json()) as {
    clerkUserId?: string;
    repos?: { githubRepoId: string; fullName: string }[];
  };
  const clerkUserId = body.clerkUserId ?? "local-dev-user";
  const selected = getStore().selectRepos(clerkUserId, body.repos ?? []);
  return NextResponse.json({ selected });
}
