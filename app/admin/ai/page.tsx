import React from "react";
import { getAIConfigAction } from "@/app/admin/actions";
import AiConfigClient from "./AiConfigClient";

export const revalidate = 0;

export default async function AdminAiPage() {
  const res = await getAIConfigAction();
  
  const defaultConfig = {
    provider: "mock" as "gemini" | "openai" | "mock",
    model: "mock-model-v1",
    fallbackProvider: "none" as "gemini" | "openai" | "mock" | "none",
    timeout: 10000,
  };

  const config = res.success && res.config ? res.config : defaultConfig;

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col gap-1">
        <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
          AI Engine Controller
        </h1>
        <p className="text-body-sm text-secondary">
          Configure default platform AI providers, engine models, failover models, and timeout profiles.
        </p>
      </div>

      <AiConfigClient initialConfig={config} />
    </div>
  );
}
