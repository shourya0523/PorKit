import { NextResponse } from "next/server";
import { getStore } from "@/lib/content/store";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    clerkUserId?: string;
    installationId?: string;
  };
  const clerkUserId = body.clerkUserId ?? "local-dev-user";
  if (!body.installationId) {
    return NextResponse.json(
      { error: "installationId required" },
      { status: 400 },
    );
  }
  const installation = getStore().connectGithub(
    clerkUserId,
    body.installationId,
  );
  return NextResponse.json(installation);
}

export async function DELETE(req: Request) {
  const body = (await req.json()) as { clerkUserId?: string };
  const clerkUserId = body.clerkUserId ?? "local-dev-user";
  getStore().disconnectGithub(clerkUserId);
  return NextResponse.json({ ok: true });
}
