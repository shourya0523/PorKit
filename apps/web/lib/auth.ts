import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export class AuthError extends Error {
  status: number;

  constructor(message = "UNAUTHORIZED", status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export function isClerkConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      process.env.CLERK_SECRET_KEY,
  );
}

/**
 * Resolve the acting user from the Clerk session.
 * Never trusts body/query `clerkUserId`.
 * When Clerk env is absent (local smoke), returns the fixed local-dev identity.
 */
export async function requireClerkUserId(): Promise<string> {
  if (!isClerkConfigured()) {
    return "local-dev-user";
  }

  const session = await auth();
  if (!session.userId) {
    throw new AuthError("UNAUTHORIZED", 401);
  }
  return session.userId;
}

export function authErrorResponse(error: unknown): Response {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }
  throw error;
}
