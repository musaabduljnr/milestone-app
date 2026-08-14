"use client";

import React from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { CountdownTimer } from "@/components/milestone/CountdownTimer";
import {
  startMilestoneAction,
  submitMilestoneAction,
  openDisputeAction,
} from "@/app/projects/actions";
import { signOutAction } from "@/app/auth/actions";
import { draftStatusUpdateAction } from "@/app/projects/ai-actions";
import { StatusUpdateDraft } from "@/lib/ai/types";
import { MilestoneDiscussion } from "@/components/milestone/MilestoneDiscussion";

export interface FreelancerMilestoneClientProps {
  profile: {
    role: "client" | "freelancer";
    full_name: string;
    avatar_url?: string | null;
    verification_status: "pending" | "verified";
  };
  userEmail: string;
  milestone: {
    id: string;
    project_id: string;
    title: string;
    description: string | null;
    payout_amount: number;
    deadline: string | null;
    status: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "APPROVED" | "PAID" | "DISPUTED" | "AUTO_RELEASED";
    submitted_at: string | null;
    submission_description: string | null;
  };
  project: {
    id: string;
    title: string;
    currency: string;
  };
  clientName: string;
  dispute: {
    id: string;
    reason: string;
    description: string | null;
  } | null;
}

export default function FreelancerMilestoneClient({
  profile,
  userEmail,
  milestone,
  project,
  clientName,
  dispute,
}: FreelancerMilestoneClientProps) {
  const [isPending, startTransition] = React.useTransition();
  const [submissionDesc, setSubmissionDesc] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Dispute state
  const [showDisputeModal, setShowDisputeModal] = React.useState(false);
  const [disputeReason, setDisputeReason] = React.useState("");
  const [disputeDetail, setDisputeDetail] = React.useState("");

  // AI Drafting States
  const [showAIPanel, setShowAIPanel] = React.useState(false);
  const [roughNotes, setRoughNotes] = React.useState("");
  const [isGeneratingAI, setIsGeneratingAI] = React.useState(false);
  const [aiDraft, setAiDraft] = React.useState<StatusUpdateDraft | null>(null);
  const [originalDraftBackup, setOriginalDraftBackup] = React.useState<StatusUpdateDraft | null>(null);
  const [showRegenConfirm, setShowRegenConfirm] = React.useState(false);
  const [aiError, setAiError] = React.useState<string | null>(null);

  const checkIfDraftModified = () => {
    if (!aiDraft || !originalDraftBackup) return false;
    if (aiDraft.title !== originalDraftBackup.title) return true;
    if (aiDraft.message !== originalDraftBackup.message) return true;
    if (aiDraft.progressSummary !== originalDraftBackup.progressSummary) return true;
    if (aiDraft.blockers !== originalDraftBackup.blockers) return true;
    if (aiDraft.nextSteps !== originalDraftBackup.nextSteps) return true;
    return false;
  };

  const handleDraftAI = async () => {
    if (!roughNotes || !roughNotes.trim()) {
      setAiError("Please provide some rough notes about your progress.");
      return;
    }

    setIsGeneratingAI(true);
    setAiError(null);

    try {
      const res = await draftStatusUpdateAction(milestone.id, roughNotes);
      if (!res.success || !res.data) {
        throw new Error(res.error || "AI was unable to generate a status update draft.");
      }

      setAiDraft(res.data);
      setOriginalDraftBackup(res.data);
      setAiError(null);
    } catch (err: unknown) {
      console.error("AI Status Update Draft Error:", err);
      const message = err instanceof Error ? err.message : "";
      let friendly = "AI couldn't generate an update right now. You can continue writing your update manually.";
      if (message.includes("timeout") || message.includes("abort")) {
        friendly = "AI took too long to respond. Try again or continue manually.";
      }
      setAiError(friendly);
    } finally {
      setIsGeneratingAI(false);
      setShowRegenConfirm(false);
    }
  };

  const handleUseDraft = () => {
    if (!aiDraft) return;
    let text = `### ${aiDraft.title}\n\n`;
    text += `**Status Update:**\n${aiDraft.message}\n\n`;
    text += `**Progress Summary:**\n${aiDraft.progressSummary}`;
    if (aiDraft.blockers && aiDraft.blockers.trim() && aiDraft.blockers !== "null") {
      text += `\n\n**Blockers:**\n${aiDraft.blockers}`;
    }
    if (aiDraft.nextSteps && aiDraft.nextSteps.trim() && aiDraft.nextSteps !== "null") {
      text += `\n\n**Next Steps:**\n${aiDraft.nextSteps}`;
    }
    setSubmissionDesc(text);
    setShowAIPanel(false);
    setRoughNotes("");
    setAiDraft(null);
    setAiError(null);
  };

  const handleCancelAI = () => {
    setShowAIPanel(false);
    setRoughNotes("");
    setAiDraft(null);
    setAiError(null);
  };

  const handleStartMilestone = () => {
    if (isPending) return;
    setErrorMsg(null);
    startTransition(async () => {
      try {
        const res = await startMilestoneAction(milestone.id);
        if (!res.success) {
          setErrorMsg(res.error || "Failed to start milestone.");
        }
      } catch {
        setErrorMsg("An unexpected error occurred while starting milestone.");
      }
    });
  };

  const handleSubmitWork = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return;
    if (!submissionDesc.trim()) {
      setErrorMsg("Please provide a submission description.");
      return;
    }
    setErrorMsg(null);
    startTransition(async () => {
      try {
        const res = await submitMilestoneAction(milestone.id, submissionDesc);
        if (!res.success) {
          setErrorMsg(res.error || "Failed to submit work.");
        }
      } catch {
        setErrorMsg("An unexpected error occurred during submission.");
      }
    });
  };

  const handleOpenDispute = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return;
    if (!disputeReason.trim()) {
      setErrorMsg("Please state your reason for opening a dispute.");
      return;
    }
    setErrorMsg(null);
    startTransition(async () => {
      try {
        const res = await openDisputeAction(milestone.id, disputeReason, disputeDetail);
        if (res.success) {
          setShowDisputeModal(false);
          setDisputeReason("");
          setDisputeDetail("");
        } else {
          setErrorMsg(res.error || "Failed to file dispute.");
        }
      } catch {
        setErrorMsg("An unexpected error occurred while filing the dispute.");
      }
    });
  };

  const payout = Number(milestone.payout_amount);

  const getDeadlineStatus = (deadlineStr: string | null) => {
    if (!deadlineStr) return { label: "No Deadline", className: "text-muted-foreground" };
    const deadline = new Date(deadlineStr);
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffHours = diffTime / (1000 * 60 * 60);

    if (diffHours < 0) {
      return { label: "Overdue", className: "text-error font-bold" };
    } else if (diffHours <= 48) {
      return { label: "Due Soon", className: "text-warning font-bold" };
    } else {
      return { label: "Upcoming", className: "text-success font-semibold" };
    }
  };

  const deadlineStatus = getDeadlineStatus(milestone.deadline);

  return (
    <AppShell
      activeRole="freelancer"
      activeMenuLabel="Milestones"
      userName={profile.full_name}
      userEmail={userEmail}
      userAvatarUrl={profile.avatar_url || undefined}
      onSignOut={signOutAction}
    >
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold uppercase tracking-wider">
          <span>Projects</span>
          <span className="material-symbols-outlined text-[12px]">chevron_right</span>
          <span>{project.title}</span>
          <span className="material-symbols-outlined text-[12px]">chevron_right</span>
          <span className="text-primary">Milestone Workspace</span>
        </div>

        {/* Header Block */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-outline-variant/30 pb-5">
          <div>
            <h1 className="font-headline-lg text-headline-sm md:text-headline-lg font-bold text-on-surface">
              {milestone.title}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Associated Contract Project: <span className="font-semibold text-on-surface">{project.title}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-medium">Status:</span>
            <Badge
              variant={
                milestone.status === "PAID"
                  ? "success"
                  : milestone.status === "SUBMITTED"
                  ? "warning"
                  : milestone.status === "DISPUTED"
                  ? "error"
                  : "neutral"
              }
            >
              {milestone.status === "DISPUTED" ? "Frozen / Disputed" : milestone.status}
            </Badge>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-error-container/20 border border-error/15 text-error text-xs font-semibold leading-normal flex items-start gap-2.5">
            <span className="material-symbols-outlined text-error text-[16px] mt-0.5 select-none">
              error
            </span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main Workspace Column */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Description Card */}
            <Card className="p-6">
              <h3 className="font-label-caps text-caption text-secondary font-bold uppercase tracking-wider mb-3">
                Milestone Deliverable Scope
              </h3>
              <p className="font-body-sm text-sm text-secondary leading-relaxed whitespace-pre-wrap">
                {milestone.description || "No scope description provided."}
              </p>
            </Card>

            {/* Interactive Actions Workspace Area */}
            <Card className="p-6 border-primary/10">
              <h3 className="font-label-caps text-caption text-primary font-bold uppercase tracking-wider mb-4 border-b border-outline-variant/30 pb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">terminal</span>
                Freelancer Workspace Panel
              </h3>

              {profile.verification_status !== "verified" ? (
                <div className="py-8 flex flex-col items-center justify-center text-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-warning-container/20 text-warning flex items-center justify-center border border-warning/15">
                    <span className="material-symbols-outlined text-[26px]">fingerprint</span>
                  </div>
                  <div className="max-w-md">
                    <h4 className="font-headline-sm text-body-base font-bold text-on-surface">
                      Identity verification required
                    </h4>
                    <p className="font-body-sm text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      You must verify your identity before you can start milestone work or submit deliverables.
                    </p>
                  </div>
                  <Link href="/verification">
                    <Button
                      variant="primary"
                      className="mt-2 min-w-44 flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[18px]">fingerprint</span>
                      <span>Verify Identity</span>
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  {milestone.status === "NOT_STARTED" && (
                    <div className="py-8 flex flex-col items-center justify-center text-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary-container/10 text-primary flex items-center justify-center border border-primary/15">
                        <span className="material-symbols-outlined text-[26px]">play_arrow</span>
                      </div>
                      <div className="max-w-md">
                        <h4 className="font-headline-sm text-body-base font-bold text-on-surface">
                          Ready to start working?
                        </h4>
                        <p className="font-body-sm text-xs text-muted-foreground mt-1.5 leading-relaxed">
                          Transition this milestone to IN_PROGRESS to signal the client that design or development has commenced.
                        </p>
                      </div>
                      <Button
                        variant="primary"
                        onClick={handleStartMilestone}
                        disabled={isPending}
                        className="mt-2 min-w-44"
                      >
                        {isPending ? <Spinner size="sm" /> : "Start Milestone"}
                      </Button>
                    </div>
                  )}

                  {milestone.status === "IN_PROGRESS" && (
                    <div className="flex flex-col gap-4">
                      {/* AI Draft Assist Helper Collapsible Panel */}
                      {showAIPanel ? (
                        <Card className="p-5 border-primary/20 bg-primary-container/5 flex flex-col gap-3 relative">
                          <div className="flex justify-between items-center border-b border-outline-variant/30 pb-2">
                            <span className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                              <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                              AI Status Update Assistant
                            </span>
                            <button
                              type="button"
                              onClick={handleCancelAI}
                              className="text-muted-foreground hover:text-on-surface cursor-pointer flex items-center justify-center w-6 h-6 rounded-full hover:bg-outline-variant/10"
                              aria-label="Close AI Helper"
                            >
                              <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                          </div>

                          {aiError && (
                            <div className="p-3 rounded-lg bg-error-container/20 border border-error/15 text-error text-xs font-semibold flex flex-col gap-2">
                              <div className="flex items-start gap-2.5">
                                <span className="material-symbols-outlined text-error text-[16px] mt-0.5 select-none">error</span>
                                <span>{aiError}</span>
                              </div>
                              {aiError.includes("writing your update manually") && (
                                <button
                                  type="button"
                                  onClick={handleCancelAI}
                                  className="text-[10px] font-bold text-secondary text-left hover:underline cursor-pointer self-start"
                                >
                                  Write manually
                                </button>
                              )}
                            </div>
                          )}

                          {!aiDraft ? (
                            // Step A: Rough Progress Notes Input Form
                            <div className="flex flex-col gap-3">
                              <div className="flex flex-col gap-1.5">
                                <label htmlFor="rough-notes" className="text-[10px] text-secondary font-bold uppercase tracking-wider">
                                  Rough Notes (completed, current, next steps)
                                </label>
                                <Textarea
                                  id="rough-notes"
                                  placeholder="Describe what you've completed, what's in progress, and what remains..."
                                  value={roughNotes}
                                  onChange={(e) => setRoughNotes(e.target.value)}
                                  rows={3}
                                  className="font-sans text-xs focus:ring-primary focus:border-primary"
                                  maxLength={1500}
                                  required
                                  disabled={isGeneratingAI}
                                />
                                <div className="flex justify-between items-center text-[9px] text-muted-foreground mt-0.5 select-none">
                                  <span>Describe progress accurately. Fictional statements will be filtered.</span>
                                  <span>{roughNotes.length}/1500 characters</span>
                                </div>
                              </div>

                              <div className="flex justify-end gap-2.5">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={handleCancelAI}
                                  className="text-xs h-8 cursor-pointer"
                                  disabled={isGeneratingAI}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="button"
                                  variant="primary"
                                  onClick={handleDraftAI}
                                  disabled={isGeneratingAI || !roughNotes.trim()}
                                  className="text-xs h-8 flex items-center justify-center gap-1 min-w-32 cursor-pointer"
                                >
                                  {isGeneratingAI ? (
                                    <>
                                      <Spinner size="sm" className="text-on-primary shrink-0" />
                                      <span>Drafting...</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                                      <span>Draft update</span>
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            // Step B: Review & Edit Generated Structured Draft Panel
                            <div className="flex flex-col gap-4">
                              <div className="flex flex-col gap-3 flex-1">
                                <div className="flex justify-between items-center select-none">
                                  <span className="text-[10px] text-muted-foreground font-semibold block">
                                    AI-generated draft • Review before sending
                                  </span>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                  <label htmlFor="draft-title" className="text-[9px] font-bold text-secondary uppercase tracking-wide">
                                    Update Title
                                  </label>
                                  <Input
                                    id="draft-title"
                                    value={aiDraft.title}
                                    onChange={(e) => setAiDraft(prev => prev ? { ...prev, title: e.target.value } : null)}
                                    className="font-sans text-xs focus:ring-primary focus:border-primary"
                                    required
                                  />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                  <label htmlFor="draft-msg" className="text-[9px] font-bold text-secondary uppercase tracking-wide">
                                    Client-facing Message
                                  </label>
                                  <Textarea
                                    id="draft-msg"
                                    value={aiDraft.message}
                                    onChange={(e) => setAiDraft(prev => prev ? { ...prev, message: e.target.value } : null)}
                                    rows={3}
                                    className="font-sans text-xs focus:ring-primary focus:border-primary"
                                    required
                                  />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                  <label htmlFor="draft-summary" className="text-[9px] font-bold text-secondary uppercase tracking-wide">
                                    Progress Summary
                                  </label>
                                  <Textarea
                                    id="draft-summary"
                                    value={aiDraft.progressSummary}
                                    onChange={(e) => setAiDraft(prev => prev ? { ...prev, progressSummary: e.target.value } : null)}
                                    rows={2}
                                    className="font-sans text-xs focus:ring-primary focus:border-primary"
                                    required
                                  />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                  <label htmlFor="draft-blockers" className="text-[9px] font-bold text-secondary uppercase tracking-wide">
                                    Blockers
                                  </label>
                                  <Input
                                    id="draft-blockers"
                                    value={aiDraft.blockers || ""}
                                    placeholder="None"
                                    onChange={(e) => setAiDraft(prev => prev ? { ...prev, blockers: e.target.value || null } : null)}
                                    className="font-sans text-xs focus:ring-primary focus:border-primary"
                                  />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                  <label htmlFor="draft-next" className="text-[9px] font-bold text-secondary uppercase tracking-wide">
                                    Next Steps
                                  </label>
                                  <Input
                                    id="draft-next"
                                    value={aiDraft.nextSteps || ""}
                                    placeholder="None"
                                    onChange={(e) => setAiDraft(prev => prev ? { ...prev, nextSteps: e.target.value || null } : null)}
                                    className="font-sans text-xs focus:ring-primary focus:border-primary"
                                  />
                                </div>
                              </div>

                              <div className="flex justify-between items-center border-t border-outline-variant/30 pt-3 select-none">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={() => {
                                    if (checkIfDraftModified()) {
                                      setShowRegenConfirm(true);
                                    } else {
                                      handleDraftAI();
                                    }
                                  }}
                                  disabled={isGeneratingAI}
                                  className="text-xs h-8 px-3 flex items-center gap-1 cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[14px]">refresh</span>
                                  <span>Regenerate</span>
                                </Button>
                                
                                <div className="flex items-center gap-2.5">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => {
                                      setAiDraft(null);
                                      setAiError(null);
                                    }}
                                    className="text-xs h-8 px-3 text-error hover:bg-error-container/10 cursor-pointer"
                                  >
                                    Cancel
                                  </Button>
                                  <button
                                    type="button"
                                    onClick={handleUseDraft}
                                    className="text-xs h-8 px-3 font-semibold text-primary hover:bg-primary/5 rounded-lg border border-primary/20 flex items-center gap-1 cursor-pointer transition-all"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">edit_note</span>
                                    <span>Edit manually</span>
                                  </button>
                                  <Button
                                    type="button"
                                    variant="primary"
                                    onClick={handleUseDraft}
                                    className="text-xs h-8 px-3 flex items-center gap-1 cursor-pointer"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">check</span>
                                    <span>Use this update</span>
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </Card>
                      ) : null}

                      {/* Main submission Form composer */}
                      <form onSubmit={handleSubmitWork} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between items-center select-none">
                            <label htmlFor="composer-details" className="text-xs font-semibold text-secondary">
                              Submission Details
                            </label>
                            {!showAIPanel && (
                              <button
                                type="button"
                                onClick={() => setShowAIPanel(true)}
                                className="text-xs font-bold text-primary flex items-center gap-1 hover:underline cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                                <span>Draft update with AI</span>
                              </button>
                            )}
                          </div>
                          <Textarea
                            id="composer-details"
                            placeholder="Describe the deliverable content, key features completed, or include links to code repositories or designs..."
                            value={submissionDesc}
                            onChange={(e) => setSubmissionDesc(e.target.value)}
                            rows={5}
                            className="font-sans text-xs focus:ring-primary focus:border-primary"
                            required
                          />
                        </div>

                        <div className="flex justify-end gap-3 mt-2 select-none">
                          <Button
                            type="submit"
                            variant="primary"
                            disabled={isPending}
                            className="min-w-44 flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            {isPending ? (
                              <Spinner size="sm" />
                            ) : (
                              <>
                                <span className="material-symbols-outlined text-[16px]">publish</span>
                                <span>Submit Deliverables</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </form>

                      {/* Regeneration confirmation modal overlay */}
                      {showRegenConfirm && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in select-none">
                          <Card className="w-full max-w-sm p-6 flex flex-col gap-4 shadow-elevated bg-surface">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-full bg-error-container/20 text-error flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-[20px]">warning</span>
                              </div>
                              <div className="flex flex-col">
                                <h4 className="font-body-base text-body-sm font-bold text-on-surface">
                                  Your current draft will be replaced. Continue?
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                  Any manual modifications made to the generated draft text will be lost.
                                </p>
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-2">
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setShowRegenConfirm(false)}
                                className="text-xs h-9 cursor-pointer"
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                variant="primary"
                                onClick={handleDraftAI}
                                disabled={isGeneratingAI}
                                className="text-xs h-9 bg-primary text-on-primary cursor-pointer"
                              >
                                Regenerate
                              </Button>
                            </div>
                          </Card>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {milestone.status === "SUBMITTED" && (
                <div className="flex flex-col gap-5">
                  <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/40 flex flex-col gap-2">
                    <span className="text-[10px] text-secondary font-bold uppercase tracking-wider">
                      Submitted Deliverables
                    </span>
                    <p className="text-xs text-on-surface leading-relaxed whitespace-pre-wrap">
                      {milestone.submission_description}
                    </p>
                    <span className="text-[10px] text-muted-foreground mt-1">
                      Submitted at: {milestone.submitted_at ? new Date(milestone.submitted_at).toLocaleString() : ""}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl border border-warning/15 bg-warning-container/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex flex-col gap-0.5 max-w-md">
                      <span className="text-[10px] text-warning font-bold uppercase tracking-wider">
                        Awaiting Client Review
                      </span>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-normal">
                        The client has 72 hours to review your submission. If no action is taken, the funds will release automatically.
                      </p>
                    </div>

                    {milestone.submitted_at && (
                      <div className="p-3 bg-surface border border-outline-variant/30 rounded-lg shrink-0">
                        <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider block mb-1">
                          Auto-Release Clock
                        </span>
                        <CountdownTimer submittedAt={milestone.submitted_at} />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-2 border-t border-outline-variant/30">
                    <Button
                      variant="ghost"
                      onClick={() => setShowDisputeModal(true)}
                      className="text-error hover:bg-error/5 flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">gavel</span>
                      <span>Raise Dispute / Freeze</span>
                    </Button>
                  </div>
                </div>
              )}

              {milestone.status === "DISPUTED" && (
                <div className="py-6 flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-error-container/20 text-error flex items-center justify-center border border-error/15 animate-pulse">
                    <span className="material-symbols-outlined text-[24px]">gavel</span>
                  </div>
                  <div className="max-w-md">
                    <h4 className="font-headline-sm text-body-base font-bold text-on-surface">
                      Milestone is Disputed
                    </h4>
                    <p className="font-body-sm text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      This milestone has been frozen due to an open dispute. The 72-hour auto-release clock is paused. Payments are securely held in escrow until dispute resolution.
                    </p>
                  </div>
                  {dispute && (
                    <div className="mt-4 p-4 rounded-xl border border-outline-variant bg-surface-container-low max-w-lg text-left text-xs flex flex-col gap-1.5 w-full">
                      <span className="font-semibold text-secondary">Reason: &quot;{dispute.reason}&quot;</span>
                      {dispute.description && (
                        <p className="text-muted-foreground leading-normal mt-0.5">
                          Detail: {dispute.description}
                        </p>
                      )}
                      {dispute.id && (
                        <Link href={`/projects/${project.id}/disputes/${dispute.id}`} className="mt-2 self-end">
                          <Button variant="ghost" size="sm" className="text-xs flex items-center gap-1 border border-outline-variant text-error hover:bg-error-container/10">
                            <span className="material-symbols-outlined text-[14px]">gavel</span>
                            <span>View Dispute Resolution</span>
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              )}

              {milestone.status === "PAID" && (
                <div className="py-8 flex flex-col items-center justify-center text-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-success-container/20 text-success flex items-center justify-center border border-success/15">
                    <span className="material-symbols-outlined text-[26px]">check_circle</span>
                  </div>
                  <div className="max-w-md">
                    <h4 className="font-headline-sm text-body-base font-bold text-on-surface">
                      Payout Completed
                    </h4>
                    <p className="font-body-sm text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      Escrow funds have been successfully released to your simulated wallet.
                    </p>
                  </div>
                  <div className="p-3 px-6 rounded-lg bg-success-container/10 border border-success/15 flex items-center gap-2 text-success text-xs font-bold uppercase tracking-wider">
                    <span>Released Value: {project.currency} {payout.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}
            </Card>

            <MilestoneDiscussion
              projectId={project.id}
              milestoneId={milestone.id}
              milestoneTitle={milestone.title}
              milestoneStatus={milestone.status}
              activeRole="freelancer"
            />
          </div>

          {/* Quick Info Sidebar Column */}
          <div className="flex flex-col gap-6">
            {/* Payout Card */}
            <Card className="p-6 bg-surface-container-lowest border-primary/20 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-primary/5 rounded-full blur-lg pointer-events-none" />
              <span className="text-[10px] text-secondary font-bold uppercase tracking-wider block">
                Milestone Payout Allocation
              </span>
              <span className="font-data-mono text-display-sm font-bold text-primary mt-2 block">
                {project.currency} {payout.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <div className="mt-4 pt-4 border-t border-outline-variant/30 flex flex-col gap-2 text-xs">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Client Owner</span>
                  <span className="font-semibold text-on-surface">{clientName}</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Target Deadline</span>
                  <span className="font-semibold text-on-surface">
                    {milestone.deadline ? new Date(milestone.deadline).toLocaleDateString() : "No deadline"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Deadline Status</span>
                  <span className={deadlineStatus.className}>
                    {deadlineStatus.label}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Raise Dispute Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 flex flex-col gap-4 shadow-xl border-outline-variant animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-error pb-1 border-b border-outline-variant/30">
              <span className="material-symbols-outlined text-[20px] select-none">gavel</span>
              <h3 className="font-headline-sm text-body-base font-bold text-on-surface">
                File Escrow Dispute
              </h3>
            </div>

            <p className="text-xs text-muted-foreground leading-normal">
              Opening a dispute pauses the normal milestone resolution flow while both sides review the issue.
            </p>

            <form onSubmit={handleOpenDispute} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-secondary">
                  Dispute Reason
                </label>
                <select
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="text-xs rounded-lg border border-outline bg-surface p-2 focus:ring-1 focus:ring-primary focus:outline-none"
                  required
                >
                  <option value="">Select a reason...</option>
                  <option value="Deliverables do not match the agreed scope">Deliverables do not match the agreed scope</option>
                  <option value="Work is incomplete">Work is incomplete</option>
                  <option value="Client has not provided required information">Client has not provided required information</option>
                  <option value="Payment issue">Payment issue</option>
                  <option value="Deadline issue">Deadline issue</option>
                  <option value="Quality concerns">Quality concerns</option>
                  <option value="Scope disagreement">Scope disagreement</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-secondary">
                  Detailed Explanation (Optional)
                </label>
                <Textarea
                  placeholder="Provide context regarding completed work milestones and details of the dispute..."
                  value={disputeDetail}
                  onChange={(e) => setDisputeDetail(e.target.value)}
                  rows={4}
                  className="font-sans text-xs"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-outline-variant/30">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowDisputeModal(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="bg-error hover:bg-error-container text-white border-none"
                  disabled={isPending}
                >
                  {isPending ? <Spinner size="sm" /> : "Open Dispute & Freeze"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
