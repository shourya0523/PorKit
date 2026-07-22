import { NextResponse } from "next/server";
import { getStore } from "@/lib/content/store";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    clerkUserId?: string;
    allowedOrigins?: string[];
    name?: string;
  };
  const clerkUserId = body.clerkUserId ?? "local-dev-user";
  const created = getStore().createPublishableKey(
    clerkUserId,
    body.allowedOrigins ?? [],
    body.name,
  );
  return NextResponse.json({
    id: created.id,
    key: created.key,
    keyPrefix: created.keyPrefix,
    allowedOrigins: created.allowedOrigins,
    name: created.name,
  });
}

export async function DELETE(req: Request) {
  const body = (await req.json()) as {
    clerkUserId?: string;
    keyId?: string;
  };
  if (!body.keyId) {
    return NextResponse.json({ error: "keyId required" }, { status: 400 });
  }
  const clerkUserId = body.clerkUserId ?? "local-dev-user";
  const revoked = getStore().revokeKey(clerkUserId, body.keyId);
  return NextResponse.json({ id: revoked.id, revokedAt: revoked.revokedAt });
}
