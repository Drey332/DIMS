// client/src/utils/ai-recommendations.ts

export interface IncidentInput {
  observationType: string[]; // e.g., ["Unsafe Act", "Near Miss"]
  description: string;
  files?: File[]; // for attachment gap check
  priorityLevel?: string; // "High", "Medium", "Low"
  observationFields?: Record<string, any>;
}

export interface AIRecommendations {
  correctiveActions: string[];
  nextSteps: string[];
  urgency: string;
  missingInfo: string[];
}

// Simulate a call to an AI service (replace with real OpenAI API call in production)
export async function getAIRecommendations(input: IncidentInput): Promise<AIRecommendations> {
  // 1. Corrective actions (simple rules + AI prompt can be merged)
  const correctiveActions: string[] = [];
  if (input.observationType.includes("Unsafe Act")) correctiveActions.push("Stop work and retrain personnel on safe procedures.");
  if (input.observationType.includes("Near Miss")) correctiveActions.push("Investigate root cause, implement preventative controls.");
  if (input.description?.toLowerCase().includes("fire")) correctiveActions.push("Ensure fire extinguishers are in place and staff are trained.");

  // 2. Next steps/escalation
  const nextSteps: string[] = [];
  if (input.priorityLevel === "High") nextSteps.push("Notify Silver Controller and HSE Manager immediately.");
  if (input.priorityLevel === "Medium") nextSteps.push("Assign to supervisor for follow-up within 24h.");

  // 3. Urgency (Tiering)
  let urgency = "Tier 00 (Business as Usual)";
  if (input.priorityLevel === "High") urgency = "Tier 2 or 3 (Requires full team mobilization and immediate action)";
  else if (input.priorityLevel === "Medium") urgency = "Tier 1 (Tactical Response)";

  // 4. Common gaps (compliance)
  const missingInfo: string[] = [];
  if (!input.files || input.files.length === 0) missingInfo.push("Missing photo evidence—attach at least one image.");
  if (!input.description || input.description.length < 10) missingInfo.push("Description is too short for compliance.");
  // Example: Check for required fields based on IMCA/FMECA
  if (input.observationType.includes("Unsafe Condition") && !input.observationFields?.location) missingInfo.push("Location not specified for Unsafe Condition.");

  // This can be extended with OpenAI or any LLM for richer output
  return { correctiveActions, nextSteps, urgency, missingInfo };
}
