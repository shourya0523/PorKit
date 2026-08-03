import { NextResponse } from "next/server";
import { getStore } from "@/lib/content/store";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key =
    req.headers.get("x-porkit-key") ??
    url.searchParams.get("key") ??
    "";
  const origin = req.headers.get("origin");
  const isBrowser =
    Boolean(origin) || req.headers.get("sec-fetch-mode") === "cors";

  const result = await Promise.resolve(
    getStore().readPublishedPortfolio(key, origin, { isBrowser }),
  );
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }
  return NextResponse.json(result.data, {
    headers: {
      "Access-Control-Allow-Origin": origin ?? "*",
      Vary: "Origin",
    },
  });
}

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin") ?? "*";
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "x-porkit-key, content-type",
    },
  });
}
