import { NextResponse } from "next/server";
import { authErrorResponse, requireClerkUserId } from "@/lib/auth";
import { getStore } from "@/lib/content/store";
import { inngest } from "@/inngest/client";
import mammoth from "mammoth";

async function extractUploadText(body: {
  text?: string;
  fileBase64?: string;
  fileName?: string;
}): Promise<string> {
  if (body.text) return body.text;
  if (!body.fileBase64) return "";

  const buffer = Buffer.from(body.fileBase64, "base64");
  const name = (body.fileName ?? "").toLowerCase();

  if (name.endsWith(".docx") || name.endsWith(".doc")) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  // Plain text / markdown uploads
  if (
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    name.endsWith(".markdown") ||
    !name
  ) {
    return buffer.toString("utf8");
  }

  // PDF extract needs a PDF library in production; fail clearly for now.
  if (name.endsWith(".pdf")) {
    throw new Error("PDF_EXTRACT_NOT_CONFIGURED");
  }

  return buffer.toString("utf8");
}

export async function POST(req: Request) {
  try {
    const clerkUserId = await requireClerkUserId();
    const body = (await req.json()) as {
      sourceType?: "resume" | "linkedin";
      text?: string;
      fileBase64?: string;
      fileName?: string;
      corrupt?: boolean;
    };

    const sourceType = body.sourceType ?? "resume";
    let text: string;
    try {
      text = await extractUploadText(body);
    } catch (err) {
      if (err instanceof Error && err.message === "PDF_EXTRACT_NOT_CONFIGURED") {
        return NextResponse.json(
          {
            error:
              "PDF extract not configured yet — upload .docx/.txt or paste text",
          },
          { status: 400 },
        );
      }
      throw err;
    }

    const store = getStore();
    const job = await Promise.resolve(
      store.startImport(clerkUserId, sourceType, {
        text,
        corrupt: body.corrupt,
      }),
    );

    if (job.status === "pending") {
      await inngest.send({
        name: "porkit/import.requested",
        data: { jobId: job.id, portfolioId: job.portfolioId, sourceType },
      });
    }

    return NextResponse.json(job, {
      status: job.status === "failed" ? 400 : 200,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
