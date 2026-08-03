import { NextResponse } from "next/server";
import { authErrorResponse, requireClerkUserId } from "@/lib/auth";
import { getStore } from "@/lib/content/store";

export async function POST(req: Request) {
  try {
    const clerkUserId = await requireClerkUserId();
    const body = await req.json();
    const row = await Promise.resolve(
      getStore().createProject(clerkUserId, body),
    );
    return NextResponse.json(row);
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const clerkUserId = await requireClerkUserId();
    const body = await req.json();
    const { id, ...patch } = body;
    const row = await Promise.resolve(
      getStore().updateProject(clerkUserId, id, patch),
    );
    return NextResponse.json(row);
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(req: Request) {
  try {
    const clerkUserId = await requireClerkUserId();
    const body = await req.json();
    await Promise.resolve(getStore().deleteProject(clerkUserId, body.id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
