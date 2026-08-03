import { NextResponse } from "next/server";
import { authErrorResponse, requireClerkUserId } from "@/lib/auth";
import { getStore } from "@/lib/content/store";

export async function POST(req: Request) {
  try {
    const clerkUserId = await requireClerkUserId();
    const body = (await req.json()) as { installationId?: string };
    if (!body.installationId) {
      return NextResponse.json(
        { error: "installationId required" },
        { status: 400 },
      );
    }
    const installation = await Promise.resolve(
      getStore().connectGithub(clerkUserId, body.installationId),
    );
    return NextResponse.json(installation);
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE() {
  try {
    const clerkUserId = await requireClerkUserId();
    await Promise.resolve(getStore().disconnectGithub(clerkUserId));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
