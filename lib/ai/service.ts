import { AIProviderConfig, MilestoneSuggestion, StatusUpdateDraft, ScopeCreepAnalysis, AILogMetrics } from "./types";
import { AIProvider, GeminiProvider, OpenAIProvider, MockProvider } from "./provider";
import { ScopeCreepContext } from "./prompts/scope-creep";

/**
 * Helper to truncate text to safety limits to prevent runaway token usage.
 */
function truncateText(text: string, maxLength = 4000): string {
  if (!text) return "";
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
}

/**
 * Safe JSON parser that handles potential markdown block formatting (e.g. ```json ... ```).
 */
function safeJsonParse(rawText: string): unknown {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```")) {
    // Remove opening code fence
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, "");
    // Remove closing code fence
    cleaned = cleaned.replace(/\n?```$/, "");
    cleaned = cleaned.trim();
  }
  return JSON.parse(cleaned);
}

/**
 * Unified AIService orchestrator. Handles fallback configurations, schema validations,
 * request timeouts, input sanitization, and metrics logging.
 */
export class AIService {
  private static resolveConfig(): AIProviderConfig {
    const providerEnv = (process.env.AI_PROVIDER || "gemini").toLowerCase();
    const apiKey = process.env.AI_API_KEY || "";
    
    // Auto-fallback to mock if API key is missing and provider is not 'mock'
    let provider: "gemini" | "openai" | "mock" = "mock";
    if (providerEnv === "gemini" && apiKey) {
      provider = "gemini";
    } else if (providerEnv === "openai" && apiKey) {
      provider = "openai";
    }

    const defaultModel = provider === "openai" ? "gpt-4o" : "gemini-2.5-flash";
    const model = process.env.AI_MODEL || defaultModel;
    const timeoutMs = parseInt(process.env.AI_TIMEOUT_MS || "10000", 10);

    return { provider, apiKey, model, timeoutMs };
  }

  private static getProvider(config: AIProviderConfig): AIProvider {
    switch (config.provider) {
      case "gemini":
        return new GeminiProvider(config);
      case "openai":
        return new OpenAIProvider(config);
      case "mock":
      default:
        return new MockProvider();
    }
  }

  /**
   * Log observability metrics to system stdout (ensuring no leak of tokens/keys).
   */
  private static logMetrics(metrics: AILogMetrics) {
    console.log(
      `[AI_METRICS] Feature: ${metrics.feature} | Provider: ${metrics.provider} | Success: ${metrics.success} | Latency: ${metrics.latencyMs}ms${
        metrics.errorCategory ? ` | ErrorCategory: ${metrics.errorCategory}` : ""
      }`
    );
  }

  /**
   * 1. Milestone Breakdown AI Flow
   */
  static async getMilestoneBreakdown(
    projectTitle: string,
    projectDesc: string,
    totalBudget: number
  ): Promise<MilestoneSuggestion[]> {
    const config = this.resolveConfig();
    const provider = this.getProvider(config);

    const sanitizedTitle = truncateText(projectTitle, 200);
    const sanitizedDesc = truncateText(projectDesc, 3800);
    const startTime = Date.now();

    try {
      const responseText = await provider.generateMilestones(sanitizedTitle, sanitizedDesc, totalBudget);
      const parsed = safeJsonParse(responseText);

      // Handle both raw arrays and OpenAI wrapper format {"milestones": [...]}
      let rawList: unknown = null;
      if (Array.isArray(parsed)) {
        rawList = parsed;
      } else if (parsed && typeof parsed === "object" && "milestones" in parsed && Array.isArray((parsed as Record<string, unknown>).milestones)) {
        rawList = (parsed as Record<string, unknown>).milestones;
      }

      if (!Array.isArray(rawList)) {
        throw new Error("Parsed JSON response does not contain a list of milestones.");
      }

      const suggestions: MilestoneSuggestion[] = [];
      let sumPayout = 0;

      for (const item of rawList) {
        if (!item || typeof item !== "object") {
          throw new Error("Invalid milestone item structure.");
        }
        
        const obj = item as Record<string, unknown>;
        if (
          typeof obj.title !== "string" || 
          typeof obj.description !== "string" || 
          typeof obj.suggested_deadline !== "string" ||
          (typeof obj.suggested_payout !== "number" && typeof obj.suggested_payout !== "string")
        ) {
          throw new Error("Milestone item is missing required structured fields.");
        }

        const payout = typeof obj.suggested_payout === "string" ? parseFloat(obj.suggested_payout) : obj.suggested_payout;
        if (isNaN(payout) || payout < 0) {
          throw new Error("Milestone payout must be a non-negative number.");
        }

        suggestions.push({
          title: obj.title,
          description: obj.description,
          suggested_deadline: obj.suggested_deadline,
          suggested_payout: payout
        });

        sumPayout += payout;
      }

      // Safeguard: Adjust budget delta on the final item to match total budget if slightly off due to rounding
      if (suggestions.length > 0 && Math.abs(sumPayout - totalBudget) > 0.01) {
        const diff = totalBudget - sumPayout;
        suggestions[suggestions.length - 1].suggested_payout = Math.max(0, suggestions[suggestions.length - 1].suggested_payout + diff);
      }

      this.logMetrics({
        feature: "milestone-breakdown",
        provider: config.provider,
        success: true,
        latencyMs: Date.now() - startTime,
      });

      return suggestions;
    } catch (err: unknown) {
      const latencyMs = Date.now() - startTime;
      const message = err instanceof Error ? err.message : "";
      
      let errorCategory: AILogMetrics["errorCategory"] = "API_ERROR";
      if (message.includes("abort") || message.includes("timeout")) {
        errorCategory = "TIMEOUT";
      } else if (message.includes("Unexpected token") || message.includes("JSON")) {
        errorCategory = "MALFORMED_JSON";
      } else if (message.includes("429") || message.includes("quota")) {
        errorCategory = "RATE_LIMIT";
      }

      this.logMetrics({
        feature: "milestone-breakdown",
        provider: config.provider,
        success: false,
        latencyMs,
        errorCategory,
      });

      throw new Error("AI assistance is temporarily unavailable. You can continue manually.");
    }
  }

  /**
   * 2. Status Update Draft AI Flow
   */
  static async getStatusUpdateDraft(
    milestoneTitle: string,
    milestoneSpec: string,
    updateInput: string
  ): Promise<StatusUpdateDraft> {
    const config = this.resolveConfig();
    const provider = this.getProvider(config);

    const sanitizedTitle = truncateText(milestoneTitle, 200);
    const sanitizedSpec = truncateText(milestoneSpec, 1800);
    const sanitizedInput = truncateText(updateInput, 2000);
    const startTime = Date.now();

    try {
      const responseText = await provider.generateStatusUpdate(sanitizedTitle, sanitizedSpec, sanitizedInput);
      const parsed = safeJsonParse(responseText);

      if (
        !parsed ||
        typeof parsed !== "object" ||
        !("title" in parsed) ||
        typeof (parsed as Record<string, unknown>).title !== "string" ||
        !("message" in parsed) ||
        typeof (parsed as Record<string, unknown>).message !== "string" ||
        !("progressSummary" in parsed) ||
        typeof (parsed as Record<string, unknown>).progressSummary !== "string"
      ) {
        throw new Error("Parsed JSON draft is missing required fields (title, message, progressSummary).");
      }

      const obj = parsed as Record<string, unknown>;
      const result: StatusUpdateDraft = {
        title: obj.title as string,
        message: obj.message as string,
        progressSummary: obj.progressSummary as string,
        blockers: typeof obj.blockers === "string" ? obj.blockers : null,
        nextSteps: typeof obj.nextSteps === "string" ? obj.nextSteps : null,
      };

      this.logMetrics({
        feature: "status-update",
        provider: config.provider,
        success: true,
        latencyMs: Date.now() - startTime,
      });

      return result;
    } catch (err: unknown) {
      const latencyMs = Date.now() - startTime;
      const message = err instanceof Error ? err.message : "";
      
      let errorCategory: AILogMetrics["errorCategory"] = "API_ERROR";
      if (message.includes("abort") || message.includes("timeout")) {
        errorCategory = "TIMEOUT";
      } else if (message.includes("Unexpected token") || message.includes("JSON")) {
        errorCategory = "MALFORMED_JSON";
      } else if (message.includes("429") || message.includes("quota")) {
        errorCategory = "RATE_LIMIT";
      }

      this.logMetrics({
        feature: "status-update",
        provider: config.provider,
        success: false,
        latencyMs,
        errorCategory,
      });

      throw new Error("AI assistance is temporarily unavailable. You can continue manually.");
    }
  }

  /**
   * 3. Scope Creep Auditor AI Flow
   */
  static async analyzeScopeCreep(ctx: ScopeCreepContext): Promise<ScopeCreepAnalysis> {
    const config = this.resolveConfig();
    const provider = this.getProvider(config);

    const sanitizedCtx: ScopeCreepContext = {
      projectTitle: truncateText(ctx.projectTitle, 200),
      projectDesc: truncateText(ctx.projectDesc, 1800),
      projectCategory: truncateText(ctx.projectCategory, 200),
      projectBudget: ctx.projectBudget,
      existingMilestones: ctx.existingMilestones.map(m => ({
        title: truncateText(m.title, 200),
        description: m.description ? truncateText(m.description, 1000) : null
      })),
      proposedTitle: truncateText(ctx.proposedTitle, 200),
      proposedDesc: truncateText(ctx.proposedDesc, 1800)
    };
    const startTime = Date.now();

    try {
      const responseText = await provider.analyzeScopeCreep(sanitizedCtx);
      const parsed = safeJsonParse(responseText);

      if (!parsed || typeof parsed !== "object") {
        throw new Error("Parsed JSON scope creep analysis is invalid.");
      }

      const obj = parsed as Record<string, unknown>;
      if (
        typeof obj.isScopeCreep !== "boolean" ||
        typeof obj.confidence !== "number" ||
        typeof obj.classification !== "string" ||
        typeof obj.explanation !== "string"
      ) {
        throw new Error("Scope creep analysis is missing required structured parameters.");
      }

      const result: ScopeCreepAnalysis = {
        isScopeCreep: obj.isScopeCreep,
        confidence: obj.confidence,
        classification: obj.classification as "WITHIN_SCOPE" | "POSSIBLE_SCOPE_CREEP" | "LIKELY_SCOPE_CREEP",
        explanation: obj.explanation,
        matchedExistingScope: typeof obj.matchedExistingScope === "string" ? obj.matchedExistingScope : null,
        recommendedAction: typeof obj.recommendedAction === "string" ? obj.recommendedAction : "Discuss and align scope before proceeding.",
      };

      this.logMetrics({
        feature: "scope-creep",
        provider: config.provider,
        success: true,
        latencyMs: Date.now() - startTime,
      });

      return result;
    } catch (err: unknown) {
      const latencyMs = Date.now() - startTime;
      const message = err instanceof Error ? err.message : "";
      
      let errorCategory: AILogMetrics["errorCategory"] = "API_ERROR";
      if (message.includes("abort") || message.includes("timeout")) {
        errorCategory = "TIMEOUT";
      } else if (message.includes("Unexpected token") || message.includes("JSON")) {
        errorCategory = "MALFORMED_JSON";
      } else if (message.includes("429") || message.includes("quota")) {
        errorCategory = "RATE_LIMIT";
      }

      this.logMetrics({
        feature: "scope-creep",
        provider: config.provider,
        success: false,
        latencyMs,
        errorCategory,
      });

      throw new Error("AI assistance is temporarily unavailable. You can continue manually.");
    }
  }
}
