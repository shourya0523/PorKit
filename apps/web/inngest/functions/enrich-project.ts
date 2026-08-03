import { inngest } from "@/inngest/client";
import { evaluateConfidence, type EvidenceBundle } from "@porkit/shared";

export const enrichProject = inngest.createFunction(
  { id: "enrich-project" },
  { event: "porkit/project.enrich" },
  async ({ event, step }) => {
    const evidence = await step.run("build-evidence", async () => {
      const bundle: EvidenceBundle = {
        readme: event.data.readme ?? "",
        description: event.data.description ?? "",
        language: event.data.language ?? "",
        topics: event.data.topics ?? [],
        stars: event.data.stars ?? 0,
        url: event.data.url ?? "",
      };
      return bundle;
    });

    const confidence = await step.run("evaluate-confidence", async () => {
      return evaluateConfidence(evidence);
    });

    return {
      projectId: event.data.projectId,
      confidence,
      publishProse: confidence === "high",
    };
  },
);
