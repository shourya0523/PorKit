import { NextResponse } from "next/server";
import { getStore } from "@/lib/content/store";
import { inngest } from "@/inngest/client";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    clerkUserId?: string;
    sourceType?: "resume" | "linkedin";
    text?: string;
    corrupt?: boolean;
  };

  // Auth: prefer Clerk in production; accept clerkUserId for local/tests.
  const clerkUserId = body.clerkUserId ?? "local-dev-user";
  const sourceType = body.sourceType ?? "resume";

  const store = getStore();
  const job = store.startImport(clerkUserId, sourceType, {
    text: body.text,
    corrupt: body.corrupt,
  });

  if (job.status === "pending") {
    await inngest.send({
      name: "porkit/import.requested",
      data: { jobId: job.id, portfolioId: job.portfolioId, sourceType },
    });
  }

  return NextResponse.json(job, {
    status: job.status === "failed" ? 400 : 200,
  });
}
