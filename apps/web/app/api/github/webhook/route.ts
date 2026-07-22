import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getStore } from "@/lib/content/store";
import { inngest } from "@/inngest/client";

function verifyGithubSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = signatureHeader.slice("sha256=".length);
  try {
    return timingSafeEqual(
      Buffer.from(expected, "utf8"),
      Buffer.from(received, "utf8"),
    );
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const secret = process.env.GITHUB_APP_WEBHOOK_SECRET;

  if (secret) {
    const signature = req.headers.get("x-hub-signature-256");
    if (!verifyGithubSignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "GITHUB_APP_WEBHOOK_SECRET is not configured" },
      { status: 500 },
    );
  }

  let body: {
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
  try {
    body = JSON.parse(rawBody) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!body.portfolioId || !body.githubRepoId) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const result = await Promise.resolve(
    getStore().syncGithubRepoChange(body.portfolioId, body.githubRepoId, {
      name: body.name ?? body.fullName?.split("/")[1] ?? "repo",
      url: body.url ?? `https://github.com/${body.fullName}`,
      language: body.language ?? "",
      topics: body.topics ?? [],
      description: body.description ?? "",
      stars: body.stars ?? 0,
      fullName: body.fullName ?? "",
    }),
  );

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
