"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { saveAIConfigAction } from "@/app/admin/actions";

interface AiConfigClientProps {
  initialConfig: {
    provider: "gemini" | "openai" | "mock";
    model: string;
    fallbackProvider: "gemini" | "openai" | "mock" | "none";
    timeout: number;
  };
}

export default function AiConfigClient({ initialConfig }: AiConfigClientProps) {
  const [provider, setProvider] = React.useState(initialConfig.provider);
  const [model, setModel] = React.useState(initialConfig.model);
  const [fallbackProvider, setFallbackProvider] = React.useState(initialConfig.fallbackProvider);
  const [timeout, setTimeoutVal] = React.useState(initialConfig.timeout);
  
  const [isSaving, setIsSaving] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await saveAIConfigAction({
        provider,
        model,
        fallbackProvider,
        timeout: Number(timeout),
      });

      if (res.success) {
        setSuccessMsg("AI Engine configuration saved successfully! Platform resolvers re-cached.");
      } else {
        setErrorMsg(res.error || "Failed to save AI configuration settings.");
      }
    } catch {
      setErrorMsg("An unexpected client error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      {/* Informational security banner */}
      <div className="p-4 rounded-xl bg-[#e8def8] border border-[#cfbcff] flex items-start gap-3 text-xs text-[#4f378b]">
        <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5 select-none">
          lock
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="font-bold uppercase tracking-wider text-[10px]">
            API Key Credentials Protected
          </span>
          <p className="leading-relaxed text-[11px]">
            API keys (e.g. `GEMINI_API_KEY`, `OPENAI_API_KEY`) are stored as secure, read-only environment variables on the hosting server. They are **never** returned to the browser or stored as plain text database tables.
          </p>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 text-xs">
          {/* Active provider */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-secondary uppercase">
              Primary AI Provider
            </label>
            <select
              value={provider}
              onChange={(e) => {
                const val = e.target.value as "gemini" | "openai" | "mock";
                setProvider(val);
                if (val === "openai") {
                  setModel("gpt-4o");
                } else if (val === "gemini") {
                  setModel("gemini-2.5-flash");
                } else {
                  setModel("mock-model-v1");
                }
              }}
              className="h-10 px-3 rounded-lg border border-outline-variant bg-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-medium"
            >
              <option value="gemini">Google Gemini Developer API</option>
              <option value="openai">OpenAI (GPT Engine)</option>
              <option value="mock">Simulated Mock Engine (Default offline)</option>
            </select>
          </div>

          {/* Model Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-secondary uppercase">
              Model Identifier Name
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. gemini-2.5-flash"
              className="h-10 px-3 rounded-lg border border-outline-variant bg-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-semibold"
              required
            />
          </div>

          {/* Fallback Provider */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-secondary uppercase">
              Failover Provider
            </label>
            <select
              value={fallbackProvider}
              onChange={(e) => setFallbackProvider(e.target.value as "gemini" | "openai" | "mock" | "none")}
              className="h-10 px-3 rounded-lg border border-outline-variant bg-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-medium"
            >
              <option value="none">No Fallback (Error immediately)</option>
              <option value="gemini">Google Gemini</option>
              <option value="openai">OpenAI</option>
              <option value="mock">Mock Simulator</option>
            </select>
          </div>

          {/* Timeout */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-secondary uppercase">
              API Connection Timeout (ms)
            </label>
            <input
              type="number"
              value={timeout}
              onChange={(e) => setTimeoutVal(Number(e.target.value))}
              placeholder="e.g. 10000"
              className="h-10 px-3 rounded-lg border border-outline-variant bg-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-semibold"
              required
            />
          </div>

          {errorMsg && (
            <div className="p-3 text-[10px] font-semibold text-error bg-error-container/10 border border-error/20 rounded-lg">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 text-[10px] font-semibold text-success bg-success-container/10 border border-success/20 rounded-lg">
              {successMsg}
            </div>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              className="w-full md:w-auto min-w-[160px] h-10 text-xs flex items-center justify-center gap-1.5"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Spinner size="sm" />
                  <span>Saving Configuration...</span>
                </>
              ) : (
                <span>Save Configuration</span>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
