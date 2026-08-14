import { AIProviderConfig } from "./types";
import { buildMilestoneBreakdownPrompt } from "./prompts/milestone-breakdown";
import { buildStatusUpdatePrompt } from "./prompts/status-update";
import { buildScopeCreepPrompt, ScopeCreepContext } from "./prompts/scope-creep";

/**
 * Base provider interface for sending prompts and receiving stringified JSON responses.
 */
export interface AIProvider {
  generateMilestones(projectTitle: string, projectDesc: string, totalBudget: number): Promise<string>;
  generateStatusUpdate(milestoneTitle: string, milestoneSpec: string, updateInput: string): Promise<string>;
  analyzeScopeCreep(ctx: ScopeCreepContext): Promise<string>;
}

/**
 * Helper to wrap native fetch requests with AbortController for timeouts.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Gemini Developer REST API Provider
 */
export class GeminiProvider implements AIProvider {
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  private async callGemini(prompt: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`;
    const payload = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    const response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      this.config.timeoutMs
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => "Unknown Gemini error");
      throw new Error(`Gemini API returned status ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Gemini returned an empty candidate list or missing text parts.");
    }

    return text;
  }

  async generateMilestones(projectTitle: string, projectDesc: string, totalBudget: number): Promise<string> {
    const prompt = buildMilestoneBreakdownPrompt(projectTitle, projectDesc, totalBudget);
    return this.callGemini(prompt);
  }

  async generateStatusUpdate(milestoneTitle: string, milestoneSpec: string, updateInput: string): Promise<string> {
    const prompt = buildStatusUpdatePrompt(milestoneTitle, milestoneSpec, updateInput);
    return this.callGemini(prompt);
  }

  async analyzeScopeCreep(ctx: ScopeCreepContext): Promise<string> {
    const prompt = buildScopeCreepPrompt(ctx);
    return this.callGemini(prompt);
  }
}

/**
 * OpenAI Chat Completions REST API Provider
 */
export class OpenAIProvider implements AIProvider {
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  private async callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
    const url = "https://api.openai.com/v1/chat/completions";
    const payload = {
      model: this.config.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    };

    const response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(payload),
      },
      this.config.timeoutMs
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => "Unknown OpenAI error");
      throw new Error(`OpenAI API returned status ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error("OpenAI returned an empty choice list or missing content.");
    }

    return text;
  }

  async generateMilestones(projectTitle: string, projectDesc: string, totalBudget: number): Promise<string> {
    const systemPrompt = "You are an expert project manager. Break down projects into exactly 3 milestones. Respond only in valid JSON.";
    const userPrompt = buildMilestoneBreakdownPrompt(projectTitle, projectDesc, totalBudget);
    return this.callOpenAI(systemPrompt, userPrompt);
  }

  async generateStatusUpdate(milestoneTitle: string, milestoneSpec: string, updateInput: string): Promise<string> {
    const systemPrompt = "You write professional, concise status updates. Respond only in valid JSON.";
    const userPrompt = buildStatusUpdatePrompt(milestoneTitle, milestoneSpec, updateInput);
    return this.callOpenAI(systemPrompt, userPrompt);
  }

  async analyzeScopeCreep(ctx: ScopeCreepContext): Promise<string> {
    const systemPrompt = "You audit milestone descriptions to detect scope creep. Respond only in valid JSON.";
    const userPrompt = buildScopeCreepPrompt(ctx);
    return this.callOpenAI(systemPrompt, userPrompt);
  }
}

/**
 * Mock AI Provider for local testing/credentials-missing state
 */
export class MockProvider implements AIProvider {
  async generateMilestones(projectTitle: string, projectDesc: string, totalBudget: number): Promise<string> {
    const oneThird = Math.round(totalBudget / 3);
    const balance = totalBudget - oneThird * 2;
    const dateOffset = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const mockData = [
      {
        title: `Phase 1: Planning & Setup for ${projectTitle}`,
        description: `Initialize base configurations, research requirements, and setup foundations for: ${projectDesc.substring(0, 100)}...`,
        suggested_deadline: dateOffset(14),
        suggested_payout: oneThird,
      },
      {
        title: "Phase 2: Core Engineering & Implementation",
        description: "Develop the core functions, integrate logic, and complete basic feature sets.",
        suggested_deadline: dateOffset(30),
        suggested_payout: oneThird,
      },
      {
        title: "Phase 3: QA testing & Production Delivery",
        description: "Perform end-to-end integration test validations, clean code, and release final artifacts.",
        suggested_deadline: dateOffset(45),
        suggested_payout: balance,
      }
    ];

    return JSON.stringify(mockData);
  }

  async generateStatusUpdate(milestoneTitle: string, milestoneSpec: string, updateInput: string): Promise<string> {
    const mockData = {
      title: "Core Implementation Complete",
      message: `I have completed the core implementation matching your rough notes: "${updateInput}". The deliverables fully align with the milestone specification details.`,
      progressSummary: `Core engineering work finished for milestone: "${milestoneTitle}".`,
      blockers: null,
      nextSteps: `Conduct final mobile testing and layout validation.`
    };

    return JSON.stringify(mockData);
  }

  async analyzeScopeCreep(ctx: ScopeCreepContext): Promise<string> {
    const hasOverlap = ctx.projectDesc.toLowerCase().includes(ctx.proposedDesc.split(" ")[0].toLowerCase());
    const mockData = {
      isScopeCreep: !hasOverlap,
      confidence: 0.85,
      classification: hasOverlap ? "WITHIN_SCOPE" : "LIKELY_SCOPE_CREEP",
      explanation: `Analysis completed for project "${ctx.projectTitle}". The proposed work "${ctx.proposedTitle}" appears to be ${hasOverlap ? 'within' : 'outside'} the original description constraints.`,
      matchedExistingScope: hasOverlap ? `Matched existing milestone task: "${ctx.existingMilestones[0]?.title || 'Core deliverables'}"` : null,
      recommendedAction: hasOverlap 
        ? "Proceed with proposal as it is within the current scope description." 
        : "Discuss and create a separate milestone before proceeding."
    };

    return JSON.stringify(mockData);
  }
}
