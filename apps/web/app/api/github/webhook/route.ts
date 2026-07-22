import { NextResponse } from "next/server";
import { getStore } from "@/lib/content/store";
import { inngest } from "@/inngest/client";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    portfolioId?: string;
    githubRepoId?: string;
    fullName?: string;
    name?: string;
    url?: string;
    language?: string;
    topics?: string[];
    description?: string;
    stars?: number;
  };

  if (!body.portfolioId || !body.githubRepoId) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const result = getStore().syncGithubRepoChange(body.portfolioId, body.githubRepoId, {
    name: body.name ?? body.fullName?.split("/")[1] ?? "repo",
    url: body.url ?? `https://github.com/${body.fullName}`,
    language: body.language ?? "",
    topics: body.topics ?? [],
    description: body.description ?? "",
    stars: body.stars ?? 0,
    fullName: body.fullName ?? "",
  });

  if (result.synced && result.project) {
    await inngest.send({
      name: "porkit/github.synced",
      data: {
        portfolioId: body.portfolioId,
        projectId: result.project.id,
        githubRepoId: body.githubRepoId,
      },
    });
  }

  return NextResponse.json(result);
}
