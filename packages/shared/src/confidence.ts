import { z } from "zod";

export const evidenceBundleSchema = z.object({
  readme: z.string().optional().default(""),
  description: z.string().optional().default(""),
  language: z.string().optional().default(""),
  topics: z.array(z.string()).default([]),
  stars: z.number().int().nonnegative().optional().default(0),
  url: z.string().optional().default(""),
});
export type EvidenceBundle = z.infer<typeof evidenceBundleSchema>;

export type ConfidenceOutcome = "high" | "low";

/**
 * Publish generated prose only when source evidence includes a README or
 * description plus at least one corroborating factual field.
 */
export function evaluateConfidence(evidence: EvidenceBundle): ConfidenceOutcome {
  const hasProseSource =
    Boolean(evidence.readme?.trim()) || Boolean(evidence.description?.trim());
  const corroborating = [
    evidence.language?.trim(),
    evidence.url?.trim(),
    evidence.topics.length > 0 ? "topics" : "",
    evidence.stars && evidence.stars > 0 ? "stars" : "",
  ].filter(Boolean);

  if (hasProseSource && corroborating.length >= 1) {
    return "high";
  }
  return "low";
}
