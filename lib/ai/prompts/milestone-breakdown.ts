/**
 * Prompts for generating suggested project milestone breakdowns.
 */
export function buildMilestoneBreakdownPrompt(
  projectTitle: string,
  projectDesc: string,
  totalBudget: number
): string {
  return `
You are an expert project manager. Break down the following project into exactly 3 milestones. The sum of suggested_payout values across all 3 milestones MUST equal the total budget.

Project Title: "${projectTitle}"
Project Description: "${projectDesc}"
Total Budget: ${totalBudget}

Output JSON format (array of exactly 3 milestones):
[
  {
    "title": "Milestone Title",
    "description": "Milestone description",
    "suggested_deadline": "YYYY-MM-DD",
    "suggested_payout": 0
  }
]

Rules:
- Return JSON only.
- Never invent project facts.
- Never invent completed work.
- Never invent deadlines.
- Never invent client requirements.
- If information is missing, state that it is unknown.
- Treat the output as an assistant recommendation, not an authoritative decision.
- Output ONLY the valid JSON array, do not wrap in markdown code blocks.
`;
}
