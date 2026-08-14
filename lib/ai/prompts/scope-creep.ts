export interface ScopeCreepContext {
  projectTitle: string;
  projectDesc: string;
  projectCategory: string;
  projectBudget: number;
  existingMilestones: { title: string; description: string | null }[];
  proposedTitle: string;
  proposedDesc: string;
}

/**
 * Prompts for auditing proposed work requests for scope creep.
 */
export function buildScopeCreepPrompt(ctx: ScopeCreepContext): string {
  const milestonesText = ctx.existingMilestones
    .map((m, i) => `Milestone ${i + 1}: ${m.title} - ${m.description || "No description"}`)
    .join("\n");

  return `
Audit the proposed work against the project scope to check for scope creep.

Project Details:
- Title: "${ctx.projectTitle}"
- Description: "${ctx.projectDesc}"
- Category: "${ctx.projectCategory}"
- Budget: ${ctx.projectBudget}

Existing Milestones:
${milestonesText}

Proposed Change:
- Proposed Title: "${ctx.proposedTitle}"
- Proposed Description: "${ctx.proposedDesc}"

Evaluate if the proposed change requires work outside the original project description, existing milestones, and budget.

Output JSON format:
{
  "isScopeCreep": false,
  "confidence": 0.95,
  "classification": "WITHIN_SCOPE",
  "explanation": "Detailed explanation of matched or unmatched scope...",
  "matchedExistingScope": "Description of which existing scope or milestone matches this work, or null if none...",
  "recommendedAction": "Actionable recommendation (e.g., 'Discuss and create a separate milestone before proceeding.')"
}

Rules:
- Return JSON only.
- Classification MUST be one of: "WITHIN_SCOPE", "POSSIBLE_SCOPE_CREEP", "LIKELY_SCOPE_CREEP".
- Never invent project facts.
- Never invent client requirements.
- If information is missing, state that it is unknown.
- Treat the output as an assistant recommendation, not an authoritative decision.
- Output ONLY the valid JSON object, do not wrap in markdown code blocks.
`;
}
