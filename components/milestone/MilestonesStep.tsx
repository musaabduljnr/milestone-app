import React from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { IconButton } from "@/components/ui/IconButton";
import { generateMilestoneBreakdownAction } from "@/app/projects/ai-actions";

export interface MilestoneStepData {
  title: string;
  description: string;
  payout_amount: number;
  deadline: string; // ISO date YYYY-MM-DD
  assigned_freelancer_id?: string | null;
}

export interface FreelancerProfile {
  id: string;
  full_name: string;
  avatar_url?: string | null;
}

export interface MilestonesStepProps {
  milestones: MilestoneStepData[];
  onChange: (milestones: MilestoneStepData[]) => void;
  totalBudget: number;
  currency: string;
  freelancers: FreelancerProfile[];
  onNext: () => void;
  onBack: () => void;
  // AI context addition
  projectTitle: string;
  projectDesc: string;
  projectCategory?: string;
  expectedCompletion?: string;
}

export const MilestonesStep: React.FC<MilestonesStepProps> = ({
  milestones,
  onChange,
  totalBudget,
  currency,
  freelancers,
  onNext,
  onBack,
  projectTitle,
  projectDesc,
  projectCategory = "",
  expectedCompletion = "",
}) => {
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // AI Breakdown wizard states
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isReviewingAI, setIsReviewingAI] = React.useState(false);
  const [aiSuggestions, setAiSuggestions] = React.useState<MilestoneStepData[]>([]);
  const [originalBackup, setOriginalBackup] = React.useState<MilestoneStepData[]>([]);
  const [showRegenConfirm, setShowRegenConfirm] = React.useState(false);

  // Temporary edit states
  const [tempTitle, setTempTitle] = React.useState("");
  const [tempDesc, setTempDesc] = React.useState("");
  const [tempPayout, setTempPayout] = React.useState(0);
  const [tempDeadline, setTempDeadline] = React.useState("");
  const [tempFreelancer, setTempFreelancer] = React.useState("");

  const totalAllocated = milestones.reduce((sum, m) => sum + m.payout_amount, 0);
  const remainingBudget = totalBudget - totalAllocated;
  const allocationPercent = Math.min(100, Math.round((totalAllocated / totalBudget) * 100));

  const startEdit = (index: number, specificMilestone?: MilestoneStepData) => {
    const m = specificMilestone || milestones[index];
    if (!m) return;
    setTempTitle(m.title);
    setTempDesc(m.description);
    setTempPayout(m.payout_amount);
    setTempDeadline(m.deadline);
    setTempFreelancer(m.assigned_freelancer_id || "");
    setEditingIndex(index);
    setErrorMsg(null);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setErrorMsg(null);
  };

  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!tempTitle.trim() || !tempDeadline.trim() || !tempDesc.trim()) {
      setErrorMsg("Milestone title, description, and deadline are required");
      return;
    }
    if (tempPayout <= 0) {
      setErrorMsg("Payout amount must be greater than 0");
      return;
    }

    const updated = [...milestones];
    const oldPayout = editingIndex !== null ? milestones[editingIndex].payout_amount : 0;
    const projectDiff = totalAllocated - oldPayout + tempPayout;

    // Check that allocation doesn't exceed budget
    if (projectDiff > totalBudget + 0.01) {
      setErrorMsg(`Allocation exceeds total project budget of ${currency} ${totalBudget.toLocaleString()}`);
      return;
    }

    if (editingIndex !== null) {
      updated[editingIndex] = {
        title: tempTitle,
        description: tempDesc,
        payout_amount: tempPayout,
        deadline: tempDeadline,
        assigned_freelancer_id: tempFreelancer || null,
      };
      onChange(updated);
      setEditingIndex(null);
      setErrorMsg(null);
    }
  };

  const addMilestone = () => {
    if (milestones.length >= 6) {
      setErrorMsg("Projects cannot exceed a maximum of 6 milestones");
      return;
    }
    const newMilestone: MilestoneStepData = {
      title: `Milestone ${milestones.length + 1}`,
      description: "Description of deliverables",
      payout_amount: Math.max(0, remainingBudget),
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      assigned_freelancer_id: null,
    };
    onChange([...milestones, newMilestone]);
    startEdit(milestones.length, newMilestone);
  };

  const removeMilestone = (index: number) => {
    if (milestones.length <= 2) {
      setErrorMsg("Projects require a minimum of 2 milestones");
      return;
    }
    const updated = milestones.filter((_, idx) => idx !== index);
    onChange(updated);
    if (editingIndex === index) {
      setEditingIndex(null);
    } else if (editingIndex !== null && editingIndex > index) {
      setEditingIndex(editingIndex - 1);
    }
    setErrorMsg(null);
  };

  const handleNext = () => {
    if (milestones.length < 2 || milestones.length > 6) {
      setErrorMsg("Project milestones count must be between 2 and 6.");
      return;
    }
    if (Math.abs(remainingBudget) > 0.01) {
      setErrorMsg(`Please allocate the entire budget. Remaining: ${currency} ${remainingBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
      return;
    }
    setErrorMsg(null);
    onNext();
  };

  const checkIfModified = () => {
    if (milestones.length !== aiSuggestions.length) return true;
    for (let i = 0; i < milestones.length; i++) {
      if (milestones[i].title !== aiSuggestions[i].title) return true;
      if (milestones[i].description !== aiSuggestions[i].description) return true;
      if (milestones[i].payout_amount !== aiSuggestions[i].payout_amount) return true;
      if (milestones[i].deadline !== aiSuggestions[i].deadline) return true;
    }
    return false;
  };

  const handleAIGenerate = async () => {
    if (!projectDesc || projectDesc.trim().length < 20) {
      setErrorMsg("Add a little more detail about what you want to build.");
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);

    if (!isReviewingAI) {
      setOriginalBackup([...milestones]);
    }

    try {
      const aiRes = await generateMilestoneBreakdownAction({
        title: projectTitle || "Untitled Project Draft",
        description: projectDesc,
        category: projectCategory || "Other",
        budget: totalBudget,
        expectedCompletionDate: expectedCompletion || "",
      });

      if (!aiRes.success || !aiRes.data) {
        throw new Error(aiRes.error || "AI breakdown failed to execute.");
      }

      const formattedSuggestions: MilestoneStepData[] = aiRes.data.map((item) => ({
        title: item.title,
        description: item.description,
        payout_amount: item.suggested_payout,
        deadline: item.suggested_deadline,
        assigned_freelancer_id: null,
      }));

      setAiSuggestions(formattedSuggestions);
      onChange(formattedSuggestions);
      setIsReviewingAI(true);
      setErrorMsg(null);
    } catch (err: unknown) {
      console.error("AI Milestone Breakdown Error:", err);
      
      const message = err instanceof Error ? err.message : "";
      let friendlyMessage = "AI assistance is temporarily unavailable. You can continue manually.";
      if (message.includes("timeout") || message.includes("abort")) {
        friendlyMessage = "AI took too long to respond. Try again or continue manually.";
      } else if (message.includes("JSON") || message.includes("Parse")) {
        friendlyMessage = "We couldn't generate a reliable milestone plan.";
      } else if (message.includes("Unauthenticated") || message.includes("Unauthorized")) {
        friendlyMessage = message;
      }
      
      setErrorMsg(friendlyMessage);
    } finally {
      setIsGenerating(false);
      setShowRegenConfirm(false);
    }
  };

  const handleAcceptAI = () => {
    setIsReviewingAI(false);
    setErrorMsg(null);
  };

  const handleCancelAI = () => {
    onChange([...originalBackup]);
    setIsReviewingAI(false);
    setErrorMsg(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
            Configure Milestones
          </h2>
          <p className="font-body-sm text-body-sm text-muted-foreground mt-1">
            Divide the project budget into 2 to 6 milestones.
          </p>
        </div>

        {!isReviewingAI && (
          <div className="flex flex-col items-start sm:items-end gap-1">
            <Button
              type="button"
              variant="ghost"
              onClick={handleAIGenerate}
              disabled={isGenerating}
              className="flex items-center gap-1.5 h-9 text-xs font-bold text-primary hover:bg-primary-container/10 border border-primary/20 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                  <span>Planning milestones...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                  <span>✨ Generate with AI</span>
                </>
              )}
            </Button>
            <span className="text-[10px] text-muted-foreground mt-0.5">
              Turn your project scope into a starting plan.
            </span>
          </div>
        )}
      </div>

      {isReviewingAI && (
        <div className="p-4 rounded-xl border border-primary/20 bg-primary-container/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                AI Suggestions Generated
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed font-semibold">
                AI-generated suggestions. Review and edit before continuing.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (checkIfModified()) {
                  setShowRegenConfirm(true);
                } else {
                  handleAIGenerate();
                }
              }}
              disabled={isGenerating}
              className="text-xs h-8 px-3 flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">refresh</span>
              <span>Regenerate</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancelAI}
              className="text-xs h-8 px-3 text-error hover:bg-error-container/10 cursor-pointer"
            >
              <span>Cancel</span>
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleAcceptAI}
              className="text-xs h-8 px-3 flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">check</span>
              <span>Use these milestones</span>
            </Button>
          </div>
        </div>
      )}

      {/* Allocation Summary Card */}
      <Card className="p-5 bg-surface-container-low flex flex-col gap-3">
        <div className="flex justify-between items-center text-xs font-semibold text-secondary uppercase tracking-wider">
          <span>Allocated: {allocationPercent}%</span>
          <span className="font-data-mono text-on-surface">
            {currency} {totalAllocated.toLocaleString(undefined, { minimumFractionDigits: 2 })} / {totalBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
        <Progress value={allocationPercent} />
        <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-1">
          <span>Min 2, Max 6 Milestones (Active: {milestones.length})</span>
          <span className={remainingBudget > 0 ? "text-primary" : remainingBudget < 0 ? "text-error" : "text-success"}>
            Remaining: {currency} {remainingBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      </Card>

      {/* Error alert */}
      {errorMsg && (
        <div className="p-4 rounded-lg bg-error-container/20 border border-error/15 text-error-container text-xs font-semibold leading-normal flex items-start gap-2.5">
          <span className="material-symbols-outlined text-error text-[16px] mt-0.5">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Editing State Box */}
      {editingIndex !== null ? (
        <Card className="p-6 border-primary bg-surface-container-lowest shadow-elevated">
          <form onSubmit={saveEdit} className="flex flex-col gap-4">
            <h4 className="font-label-caps text-caption text-primary font-bold uppercase tracking-wider">
              Edit Milestone {editingIndex + 1}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-caps text-[10px] text-secondary font-bold uppercase tracking-wider">Title</label>
                <Input value={tempTitle} onChange={(e) => setTempTitle(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-label-caps text-[10px] text-secondary font-bold uppercase tracking-wider">Payout Amount ({currency})</label>
                <Input
                  type="number"
                  min="1"
                  step="any"
                  value={tempPayout || ""}
                  onChange={(e) => setTempPayout(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-caps text-[10px] text-secondary font-bold uppercase tracking-wider">Deadline</label>
                <Input type="date" value={tempDeadline} onChange={(e) => setTempDeadline(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-label-caps text-[10px] text-secondary font-bold uppercase tracking-wider">Assigned Freelancer</label>
                <Select value={tempFreelancer} onChange={(e) => setTempFreelancer(e.target.value)}>
                  <option value="">Unassigned</option>
                  {freelancers.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.full_name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-label-caps text-[10px] text-secondary font-bold uppercase tracking-wider">Deliverables Description</label>
              <Textarea value={tempDesc} onChange={(e) => setTempDesc(e.target.value)} required rows={3} />
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-2 text-xs font-semibold text-secondary hover:bg-surface-container rounded-md"
              >
                Cancel
              </button>
              <Button type="submit" variant="primary" size="sm">
                Save Changes
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        /* Milestones List Panel */
        <div className="flex flex-col gap-3">
          {milestones.map((m, index) => {
            const assignee = freelancers.find((f) => f.id === m.assigned_freelancer_id);
            return (
              <div
                key={index}
                className="p-4 rounded-xl border border-outline-variant bg-surface flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-outline transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-body-base text-body-sm font-semibold text-on-surface">
                    Phase {index + 1}: {m.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {m.description}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground font-medium flex-wrap">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                      Deadline: {m.deadline}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">person</span>
                      Assignee: {assignee ? assignee.full_name : "Unassigned"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 w-full md:w-auto justify-between md:justify-end">
                  <span className="font-data-mono text-body-sm font-semibold text-on-surface">
                    {currency} {m.payout_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  
                  <div className="flex gap-1">
                    <IconButton
                      iconName="edit"
                      ariaLabel="Edit milestone"
                      onClick={() => startEdit(index)}
                      size="sm"
                    />
                    <IconButton
                      iconName="delete"
                      ariaLabel="Remove milestone"
                      onClick={() => removeMilestone(index)}
                      size="sm"
                      variant="destructive"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add Milestone CTA */}
          {milestones.length < 6 && (
            <button
              onClick={addMilestone}
              className="py-3 border-2 border-dashed border-outline-variant hover:border-primary hover:bg-surface-container-low rounded-xl text-xs font-semibold text-secondary hover:text-primary transition-all flex items-center justify-center gap-1.5 mt-2 cursor-pointer select-none"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              Add Project Milestone
            </button>
          )}
        </div>
      )}

      {/* Action Footer */}
      {editingIndex === null && !isReviewingAI && (
        <div className="flex justify-between gap-3 pt-4 border-t border-outline-variant/30 mt-4">
          <Button variant="ghost" onClick={onBack}>
            Back
          </Button>
          <Button variant="primary" onClick={handleNext}>
            Continue to Freelancers
          </Button>
        </div>
      )}

      {/* Regenerate Confirmation Dialog */}
      {showRegenConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <Card className="w-full max-w-sm p-6 flex flex-col gap-4 shadow-elevated bg-surface">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-error-container/20 text-error flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">warning</span>
              </div>
              <div className="flex flex-col">
                <h4 className="font-body-base text-body-sm font-bold text-on-surface">
                  Regenerate milestones?
                </h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Your current AI suggestions will be replaced.
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
                onClick={handleAIGenerate}
                disabled={isGenerating}
                className="text-xs h-9 bg-primary text-on-primary cursor-pointer"
              >
                Regenerate
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
