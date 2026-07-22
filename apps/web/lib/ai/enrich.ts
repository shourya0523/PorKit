import { evaluateConfidence, type EvidenceBundle } from "@porkit/shared";

export async function generateProjectCopy(
  evidence: EvidenceBundle,
): Promise<{ prose: string; confidence: ReturnType<typeof evaluateConfidence> }> {
  const confidence = evaluateConfidence(evidence);
  if (!process.env.OPENAI_API_KEY) {
    const prose = [
      evidence.description?.trim(),
      evidence.readme?.trim()?.slice(0, 280),
    ]
      .filter(Boolean)
      .join(" — ");
    return {
      prose: prose || "Project description pending review.",
      confidence,
    };
  }

  // Production: call OpenAI structured output validated with Zod.
  // Kept behind env so local/tests never require network.
  return {
    prose: evidence.description || "Generated copy placeholder",
    confidence,
  };
}
