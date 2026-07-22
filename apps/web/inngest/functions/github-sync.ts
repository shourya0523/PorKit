import { inngest } from "@/inngest/client";
import { getEntitlements, type PlanId } from "@porkit/shared";

export const githubSync = inngest.createFunction(
  { id: "github-sync" },
  { event: "porkit/github.synced" },
  async ({ event, step }) => {
    await step.run("refresh-selected-repo", async () => {
      return {
        portfolioId: event.data.portfolioId,
        projectId: event.data.projectId,
        githubRepoId: event.data.githubRepoId,
      };
    });

    await step.sendEvent("enqueue-enrichment", {
      name: "porkit/project.enrich",
      data: {
        projectId: event.data.projectId,
        portfolioId: event.data.portfolioId,
      },
    });
  },
);

export function syncCadenceCron(planId: PlanId): string {
  const hours = getEntitlements(planId).syncCadenceHours;
  if (hours <= 1) return "0 * * * *";
  return `0 */${Math.round(hours)} * * *`;
}
