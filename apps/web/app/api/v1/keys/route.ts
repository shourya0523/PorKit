import { NextResponse } from "next/server";
import { authErrorResponse, requireClerkUserId } from "@/lib/auth";
import { getStore } from "@/lib/content/store";

export async function POST(req: Request) {
  try {
    const clerkUserId = await requireClerkUserId();
    const body = (await req.json()) as {
      allowedOrigins?: string[];
      name?: string;
    };
    const created = await Promise.resolve(
      getStore().createPublishableKey(
        clerkUserId,
        body.allowedOrigins ?? [],
        body.name,
      ),
    );
    return NextResponse.json({
      id: created.id,
      key: created.key,
      keyPrefix: created.keyPrefix,
      allowedOrigins: created.allowedOrigins,
      name: created.name,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(req: Request) {
  try {
    const clerkUserId = await requireClerkUserId();
    const body = (await req.json()) as { keyId?: string };
    if (!body.keyId) {
      return NextResponse.json({ error: "keyId required" }, { status: 400 });
    }
    const revoked = await Promise.resolve(
      getStore().revokeKey(clerkUserId, body.keyId),
    );
    return NextResponse.json({ id: revoked.id, revokedAt: revoked.revokedAt });
  } catch (error) {
    return authErrorResponse(error);
  }
}
