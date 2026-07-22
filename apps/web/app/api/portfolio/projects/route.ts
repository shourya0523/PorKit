import { NextResponse } from "next/server";
import { getStore } from "@/lib/content/store";

export async function POST(req: Request) {
  const body = await req.json();
  const clerkUserId = body.clerkUserId ?? "local-dev-user";
  const row = getStore().createProject(clerkUserId, body);
  return NextResponse.json(row);
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const clerkUserId = body.clerkUserId ?? "local-dev-user";
  const { id, ...patch } = body;
  const row = getStore().updateProject(clerkUserId, id, patch);
  return NextResponse.json(row);
}

export async function DELETE(req: Request) {
  const body = await req.json();
  const clerkUserId = body.clerkUserId ?? "local-dev-user";
  getStore().deleteProject(clerkUserId, body.id);
  return NextResponse.json({ ok: true });
}
