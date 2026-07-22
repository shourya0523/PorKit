import { inngest } from "@/inngest/client";

/**
 * Durable import job. Upload route enqueues; this step would extract PDF/DOCX
 * and call the LLM. Local memory store already structures text synchronously
 * for offline tests — this function is the production hook.
 */
export const importResume = inngest.createFunction(
  { id: "import-resume" },
  { event: "porkit/import.requested" },
  async ({ event, step }) => {
    await step.run("structure-import", async () => {
      return {
        jobId: event.data.jobId,
        portfolioId: event.data.portfolioId,
        sourceType: event.data.sourceType,
        note: "Structured via store or LLM when OPENAI_API_KEY is set",
      };
    });
  },
);
