"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Spinner } from "@/components/ui/Spinner";
import { acceptInvitationAction, declineInvitationAction } from "@/app/projects/actions";

interface InvitationData {
  id: string;
  project_id: string;
  milestone_id: string;
  invited_by: string;
  invitee_email: string;
  invitee_user_id: string | null;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED";
  created_at: string;
  responded_at: string | null;
  projects?: {
    id: string;
    title: string;
    description: string | null;
    category: string | null;
    budget: number;
    currency: string;
    status: string;
    expected_completion: string | null;
    client_id: string;
    profiles?: {
      id: string;
      full_name: string;
      avatar_url: string | null;
      verification_status: string;
    } | null;
  } | null;
  milestones?: {
    id: string;
    title: string;
    description: string | null;
    payout_amount: number;
    deadline: string | null;
    status: string;
    assigned_freelancer_id: string | null;
  } | null;
}

interface InvitationDetailClientProps {
  invitation: InvitationData;
  currentUserId: string;
  profile: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export default function InvitationDetailClient({
  invitation: initialInvitation,
  currentUserId,
  profile,
}: InvitationDetailClientProps) {
  const router = useRouter();
  const [invitation, setInvitation] = React.useState<InvitationData>(initialInvitation);
  const [isAccepting, setIsAccepting] = React.useState(false);
  const [isDeclining, setIsDeclining] = React.useState(false);
  const [showDeclineModal, setShowDeclineModal] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const project = invitation.projects;
  const milestone = invitation.milestones;
  const clientProfile = project?.profiles;

  const clientName = clientProfile?.full_name || "Project Client";
  const clientInitials = clientName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  const handleAccept = async () => {
    if (isAccepting || isDeclining) return;
    setIsAccepting(true);
    setErrorMsg(null);

    try {
      const res = await acceptInvitationAction(invitation.id);
      if (!res.success) {
        setErrorMsg(res.error || "Failed to accept invitation.");
        setIsAccepting(false);
        return;
      }

      setInvitation((prev) => ({
        ...prev,
        status: "ACCEPTED",
        responded_at: new Date().toISOString(),
      }));

      // Navigate to milestone workspace
      if (res.milestoneId) {
        router.push(`/freelancer/milestones/${res.milestoneId}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      console.error("Accept invitation error:", err);
      setErrorMsg("A network error occurred while accepting the invitation.");
      setIsAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (isAccepting || isDeclining) return;
    setIsDeclining(true);
    setErrorMsg(null);

    try {
      const res = await declineInvitationAction(invitation.id);
      if (!res.success) {
        setErrorMsg(res.error || "Failed to decline invitation.");
        setIsDeclining(false);
        setShowDeclineModal(false);
        return;
      }

      setInvitation((prev) => ({
        ...prev,
        status: "DECLINED",
        responded_at: new Date().toISOString(),
      }));
      setShowDeclineModal(false);
      setIsDeclining(false);
    } catch (err) {
      console.error("Decline invitation error:", err);
      setErrorMsg("A network error occurred while declining the invitation.");
      setIsDeclining(false);
    }
  };

  const formattedDeadline = milestone?.deadline
    ? new Date(milestone.deadline).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "No deadline specified";

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface border border-outline-variant/40 rounded-xl p-5">
        <div className="flex flex-col">
          <span className="text-[10px] text-primary font-bold uppercase tracking-wider">
            Contract Invitation
          </span>
          <h1 className="font-headline-sm text-body-base md:text-headline-sm font-bold text-on-surface mt-0.5">
            Project Milestone Invitation
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {invitation.status === "PENDING" && (
            <Badge variant="info" className="py-1 px-3 text-xs font-semibold">
              Pending Response
            </Badge>
          )}
          {invitation.status === "ACCEPTED" && (
            <Badge variant="success" className="py-1 px-3 text-xs font-semibold">
              ✓ Accepted
            </Badge>
          )}
          {invitation.status === "DECLINED" && (
            <Badge variant="error" className="py-1 px-3 text-xs font-semibold">
              Declined
            </Badge>
          )}
          {invitation.status === "CANCELLED" && (
            <Badge variant="neutral" className="py-1 px-3 text-xs font-semibold">
              Cancelled
            </Badge>
          )}
        </div>
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-error-container/20 border border-error/25 text-error-container text-xs font-semibold flex items-start gap-3 animate-fade-in">
          <span className="material-symbols-outlined text-error text-[18px] mt-0.5 shrink-0">
            error
          </span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Invitation Bento Card */}
      <Card className="p-6 md:p-8 flex flex-col gap-6 shadow-modal">
        {/* Client & Project Overview */}
        <div className="flex flex-col gap-4 border-b border-outline-variant/30 pb-6">
          <span className="font-label-caps text-caption text-secondary font-bold uppercase tracking-wider">
            Project Context
          </span>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1 min-w-0">
              <span className="font-label-caps text-[10px] text-primary font-bold uppercase tracking-wider block mb-1">
                {project?.category || "Contract"}
              </span>
              <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                {project?.title || "Untitled Project"}
              </h2>
              {project?.description && (
                <p className="text-xs text-secondary mt-1.5 line-clamp-3 leading-relaxed">
                  {project.description}
                </p>
              )}
            </div>

            {/* Client Info Card */}
            <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/40 flex items-center gap-3 shrink-0 self-stretch md:self-auto min-w-[200px]">
              <Avatar
                src={clientProfile?.avatar_url || undefined}
                initials={clientInitials}
                size="md"
                className="bg-primary/10 text-primary border-primary/20"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                  Invited By Client
                </span>
                <span className="text-xs font-bold text-on-surface truncate mt-0.5">
                  {clientName}
                </span>
                {clientProfile?.verification_status === "verified" && (
                  <span className="text-[10px] text-success font-medium flex items-center gap-0.5 mt-0.5">
                    <span className="material-symbols-outlined text-[12px]">verified</span>
                    Verified Client
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Milestone Specifics Section */}
        <div className="flex flex-col gap-4">
          <span className="font-label-caps text-caption text-secondary font-bold uppercase tracking-wider">
            Assigned Milestone Deliverables
          </span>

          <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="font-body-base text-body-base font-bold text-on-surface">
                  {milestone?.title || "Milestone Deliverable"}
                </h3>
              </div>

              <div className="p-2.5 rounded-lg bg-surface border border-outline-variant/40 shrink-0 text-right self-end sm:self-auto">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
                  Milestone Payout
                </span>
                <span className="font-data-mono text-headline-sm font-bold text-primary block mt-0.5">
                  {project?.currency || "USD"}{" "}
                  {milestone?.payout_amount?.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                Deliverable Scope &amp; Details
              </span>
              <p className="text-xs text-secondary whitespace-pre-wrap leading-relaxed">
                {milestone?.description || "No specific scope notes provided."}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-outline-variant/30 text-xs">
              <div className="flex items-center gap-2 text-secondary">
                <span className="material-symbols-outlined text-primary text-[16px]">
                  calendar_today
                </span>
                <span>Deadline: <strong className="text-on-surface">{formattedDeadline}</strong></span>
              </div>

              <div className="flex items-center gap-2 text-secondary">
                <span className="material-symbols-outlined text-success text-[16px]">
                  shield
                </span>
                <span>Escrow Protected Milestone Contract</span>
              </div>
            </div>
          </div>
        </div>

        {/* Status Responses & Action Footer */}
        {invitation.status === "PENDING" && (
          <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-4 border-t border-outline-variant/30">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowDeclineModal(true)}
              disabled={isAccepting || isDeclining}
              className="w-full sm:w-auto text-error hover:bg-error-container/10 border border-error/20"
            >
              Decline
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleAccept}
              disabled={isAccepting || isDeclining}
              isLoading={isAccepting}
              className="w-full sm:w-auto px-6 h-11"
            >
              <span className="material-symbols-outlined text-[18px] mr-1.5">check_circle</span>
              Accept Invitation
            </Button>
          </div>
        )}

        {invitation.status === "ACCEPTED" && (
          <div className="flex flex-col gap-4 pt-4 border-t border-outline-variant/30">
            <div className="p-4 rounded-xl bg-success-container/20 border border-success/30 text-success-container flex items-center gap-3">
              <span className="material-symbols-outlined text-success text-[24px]">
                check_circle
              </span>
              <div className="flex flex-col text-xs leading-relaxed">
                <span className="font-bold text-on-surface">You have accepted this invitation</span>
                <span className="text-secondary">
                  You are now an active team member on this milestone and can start tracking deliverables.
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <Link href={`/freelancer/milestones/${milestone?.id}`}>
                <Button variant="primary" className="w-full sm:w-auto">
                  Go to Milestone Workspace
                </Button>
              </Link>
              <Link href={`/projects/${project?.id}`}>
                <Button variant="ghost" className="w-full sm:w-auto border border-outline-variant/50">
                  View Project Overview
                </Button>
              </Link>
            </div>
          </div>
        )}

        {invitation.status === "DECLINED" && (
          <div className="flex flex-col gap-4 pt-4 border-t border-outline-variant/30">
            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/40 flex items-center gap-3">
              <span className="material-symbols-outlined text-muted-foreground text-[24px]">
                cancel
              </span>
              <div className="flex flex-col text-xs leading-relaxed">
                <span className="font-bold text-on-surface">Invitation Declined</span>
                <span className="text-muted-foreground">
                  You declined this invitation. The client has been notified and may assign another freelancer.
                </span>
              </div>
            </div>

            <div className="flex justify-end">
              <Link href="/dashboard">
                <Button variant="primary" size="sm">
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Card>

      {/* Decline Confirmation Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-xs">
          <Card className="w-full max-w-sm p-6 flex flex-col gap-4 shadow-elevated bg-surface border border-outline-variant">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-error-container/20 text-error flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">warning</span>
              </div>
              <div className="flex flex-col">
                <h4 className="font-body-base text-body-sm font-bold text-on-surface">
                  Decline this project invitation?
                </h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Are you sure you want to decline? The client will be notified and can assign another freelancer to this milestone.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-3 pt-3 border-t border-outline-variant/30">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowDeclineModal(false)}
                disabled={isDeclining}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleDecline}
                disabled={isDeclining}
                isLoading={isDeclining}
                className="text-xs h-9 bg-error hover:bg-error/90 text-on-error"
              >
                Decline Invitation
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
