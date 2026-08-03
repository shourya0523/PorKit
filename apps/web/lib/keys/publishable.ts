import { createHash, randomBytes } from "node:crypto";

export function generatePublishableKey(): { raw: string; prefix: string; hash: string } {
  const raw = `pk_${randomBytes(24).toString("hex")}`;
  return {
    raw,
    prefix: raw.slice(0, 10),
    hash: hashPublishableKey(raw),
  };
}

export function hashPublishableKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function originAllowed(
  allowedOrigins: string[],
  origin: string | null,
): boolean {
  if (!origin) return false;
  return allowedOrigins.includes(origin);
}
