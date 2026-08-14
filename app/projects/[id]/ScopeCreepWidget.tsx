"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { detectScopeCreepAction } from "@/app/projects/ai-actions";
import { ScopeCreepAnalysis } from "@/lib/ai/types";

interface ScopeCreepWidgetProps {
  projectId: string;
}

export default function ScopeCreepWidget({ projectId }: ScopeCreepWidgetProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [analysis, setAnalysis] = React.useState<ScopeCreepAnalysis | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleCheckScope = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setErrorMsg("Please fill in both proposed title and description.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setAnalysis(null);

    try {
      const res = await detectScopeCreepAction(projectId, title, description);
      if (res.success && res.data) {
        setAnalysis(res.data);
      } else {
        setErrorMsg(res.error || "Failed to perform scope creep audit.");
      }
    } catch (err: unknown) {
      console.error("Scope creep auditing failed:", err);
      setErrorMsg("Scope check is temporarily unavailable. You can discuss the details with the other party manually.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setTitle("");
    setDescription("");
    setAnalysis(null);
    setErrorMsg(null);
  };

  return (
    <Card className="p-6 flex flex-col gap-4 border-primary/10">
      <div className="flex justify-between items-center select-none">
        <h3 className="font-label-caps text-caption text-secondary font-bold uppercase tracking-wider flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-primary">analytics</span>
          Scope Control Assistant
        </h3>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs font-bold text-primary flex items-center gap-1 hover:underline cursor-pointer"
        >
          <span className="material-symbols-outlined text-[14px]">
            {isOpen ? "keyboard_arrow_up" : "keyboard_arrow_down"}
          </span>
          <span>{isOpen ? "Hide" : "Check scope with AI"}</span>
        </button>
      </div>

      {!isOpen && (
        <p className="text-[11px] text-muted-foreground leading-relaxed select-none">
          Verify if proposed project additions or milestone updates fit within the initial contract parameters.
        </p>
      )}

      {isOpen && (
        <div className="flex flex-col gap-4 mt-1 border-t border-outline-variant/30 pt-3 animate-fade-in">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-error-container/20 border border-error/15 text-error text-xs font-semibold flex items-start gap-2.5">
              <span className="material-symbols-outlined text-error text-[16px] mt-0.5 select-none">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {!analysis ? (
            <form onSubmit={handleCheckScope} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="prop-title" className="text-[10px] font-bold text-secondary uppercase tracking-wider select-none">
                  Proposed Milestone Title
                </label>
                <Input
                  id="prop-title"
                  placeholder="e.g. Implement stripe payments integration"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="font-sans text-xs focus:ring-primary focus:border-primary"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="prop-desc" className="text-[10px] font-bold text-secondary uppercase tracking-wider select-none">
                  Proposed Specifications
                </label>
                <Textarea
                  id="prop-desc"
                  placeholder="Describe the scope, deliverables, and technical implementation..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="font-sans text-xs focus:ring-primary focus:border-primary"
                  required
                  disabled={isLoading}
                  maxLength={1500}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-1 select-none">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleReset}
                  className="text-xs h-8 cursor-pointer"
                  disabled={isLoading}
                >
                  Clear
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isLoading || !title.trim() || !description.trim()}
                  className="text-xs h-8 flex items-center justify-center gap-1.5 min-w-36 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Spinner size="sm" className="text-on-primary" />
                      <span>Checking...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                      <span>Check scope</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-4 animate-fade-in">
              {/* Classification result block */}
              <div
                className={`p-4 rounded-xl border flex flex-col gap-3 ${
                  analysis.classification === "WITHIN_SCOPE"
                    ? "bg-success-container/10 border-success/20 text-success-container"
                    : analysis.classification === "POSSIBLE_SCOPE_CREEP"
                    ? "bg-warning-container/10 border-warning/20 text-warning-container"
                    : "bg-error-container/10 border-error/20 text-error-container"
                }`}
              >
                <div className="flex justify-between items-center select-none">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    AI Scope Check Outcome
                  </span>
                  <Badge
                    variant={
                      analysis.classification === "WITHIN_SCOPE"
                        ? "success"
                        : analysis.classification === "POSSIBLE_SCOPE_CREEP"
                        ? "warning"
                        : "error"
                    }
                  >
                    {analysis.classification.replace(/_/g, " ")}
                  </Badge>
                </div>

                <p className="text-xs leading-relaxed text-on-surface">
                  {analysis.explanation}
                </p>

                <div className="text-[10px] text-muted-foreground flex justify-between items-center select-none pt-1 border-t border-outline-variant/20">
                  <span>Confidence Index: {Math.round(analysis.confidence * 100)}%</span>
                  <span className="font-semibold italic">Advisory opinion only</span>
                </div>
              </div>

              {/* Matched scope info */}
              {analysis.matchedExistingScope && (
                <div className="p-3 bg-surface-container-low border border-outline-variant/40 rounded-xl flex flex-col gap-1">
                  <span className="text-[9px] text-secondary font-bold uppercase tracking-wider select-none">
                    Matched Scope Context
                  </span>
                  <p className="text-xs text-on-surface leading-normal">
                    {analysis.matchedExistingScope}
                  </p>
                </div>
              )}

              {/* Recommended Action block */}
              <div className="p-4 bg-primary-container/10 border border-primary/20 rounded-xl flex flex-col gap-1.5">
                <span className="text-[9px] text-primary font-bold uppercase tracking-wider select-none">
                  Recommended Action
                </span>
                <p className="text-xs text-on-surface leading-normal font-semibold">
                  {analysis.recommendedAction}
                </p>
              </div>

              <div className="flex justify-end pt-1 border-t border-outline-variant/20 select-none">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleReset}
                  className="text-xs h-8 flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">refresh</span>
                  <span>Analyze another</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
