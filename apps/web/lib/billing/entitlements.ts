import { getEntitlements, type PlanId } from "@porkit/shared";

export function checkAiCap(planId: PlanId, used: number) {
  return getEntitlements(planId).aiEnrichmentsPerMonth > used
    ? { allowed: true as const }
    : {
        allowed: false as const,
        upgradeCta: "Upgrade to Paid for higher AI enrichment limits",
      };
}

export function syncCronForPlan(planId: PlanId) {
  const hours = getEntitlements(planId).syncCadenceHours;
  return hours <= 1 ? "hourly" : "daily";
}
