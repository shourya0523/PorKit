import { z } from "zod";

export const planIdSchema = z.enum(["free", "paid"]);
export type PlanId = z.infer<typeof planIdSchema>;

export const planEntitlementsSchema = z.object({
  planId: planIdSchema,
  syncCadenceHours: z.number().positive(),
  aiEnrichmentsPerMonth: z.number().int().nonnegative(),
  revisionHistoryDays: z.number().int().nonnegative(),
  advancedKeyCustomization: z.boolean(),
});
export type PlanEntitlements = z.infer<typeof planEntitlementsSchema>;

export const PLAN_ENTITLEMENTS: Record<PlanId, PlanEntitlements> = {
  free: {
    planId: "free",
    syncCadenceHours: 24,
    aiEnrichmentsPerMonth: 10,
    revisionHistoryDays: 0,
    advancedKeyCustomization: false,
  },
  paid: {
    planId: "paid",
    syncCadenceHours: 1,
    aiEnrichmentsPerMonth: 200,
    revisionHistoryDays: 30,
    advancedKeyCustomization: true,
  },
};

export function getEntitlements(planId: PlanId): PlanEntitlements {
  return PLAN_ENTITLEMENTS[planId];
}

export function canRunAiEnrichment(
  entitlements: PlanEntitlements,
  usedThisMonth: number,
): { allowed: boolean; reason?: string } {
  if (usedThisMonth >= entitlements.aiEnrichmentsPerMonth) {
    return {
      allowed: false,
      reason: `AI enrichment limit reached (${entitlements.aiEnrichmentsPerMonth}/month). Upgrade to continue.`,
    };
  }
  return { allowed: true };
}

export function retainsRevisionHistory(entitlements: PlanEntitlements): boolean {
  return entitlements.revisionHistoryDays > 0;
}
