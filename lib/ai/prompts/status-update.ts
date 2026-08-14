/**
 * Prompts for generating freelancer status update drafts.
 */
export function buildStatusUpdatePrompt(
  milestoneTitle: string,
  milestoneSpec: string,
  updateInput: string
): string {
  return `
Write a professional, structured status update draft for a milestone based on the inputs below:

Milestone Title: "${milestoneTitle}"
Specification: "${milestoneSpec}"
Freelancer Notes: "${updateInput}"

Output JSON format:
{
  "title": "Concise Update Title",
  "message": "Professional client-facing message summarizing progress...",
  "progressSummary": "Brief current progress summary...",
  "blockers": "Blockers if present, or null if none...",
  "nextSteps": "Next steps if present, or null if none..."
}

Rules:
- Return JSON only.
- Preserves factual info from the freelancer's notes.
- Avoid inventing completed work.
- Avoid inventing deadlines.
- Avoid inventing metrics.
- Avoid claiming something is finished unless the notes indicate it.
- Produce concise professional communication.
- Maintain a helpful and neutral tone.
- If information is missing, state that it is unknown or null.
- Treat the output as an assistant recommendation, not an authoritative decision.
- Output ONLY the valid JSON object, do not wrap in markdown code blocks.
`;
}
