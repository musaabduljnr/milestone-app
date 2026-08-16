"use client";

import React from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { ActivityEvent, ActivityItem } from "./ActivityItem";

interface ProjectActivityTimelineProps {
  projectId: string;
}

export const ProjectActivityTimeline: React.FC<ProjectActivityTimelineProps> = ({ projectId }) => {
  const [events, setEvents] = React.useState<ActivityEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const supabase = createClient();

  React.useEffect(() => {
    const fetchTimeline = async () => {
      try {
        // 1. Fetch project data
        const { data: project } = await supabase
          .from("projects")
          .select("id, title, created_at, currency")
          .eq("id", projectId)
          .single();

        if (!project) return;

        // 2. Fetch project members
        const { data: members } = await supabase
          .from("project_members")
          .select("id, role, created_at, profiles(full_name)")
          .eq("project_id", projectId);

        // 3. Fetch milestones
        const { data: milestones } = await supabase
          .from("milestones")
          .select("id, title, payout_amount, created_at, submitted_at, approved_at, paid_at")
          .eq("project_id", projectId);

        // 4. Fetch escrow ledger entries
        const { data: escrow } = await supabase
          .from("escrow_ledger")
          .select("id, amount, entry_type, created_at")
          .eq("project_id", projectId);

        // 5. Fetch project invitations
        const { data: invitations } = await supabase
          .from("project_invitations")
          .select(`
            id,
            invitee_email,
            status,
            created_at,
            responded_at,
            invitee:invitee_user_id (full_name),
            milestone:milestone_id (title)
          `)
          .eq("project_id", projectId);

        // 6. Fetch disputes linked to milestones of this project
        const milestoneIds = milestones?.map((m: any) => m.id) || [];
        interface DisputeItem {
          id: string;
          reason: string;
          status: string;
          resolution: string | null;
          created_at: string;
          resolved_at: string | null;
        }
        let disputes: DisputeItem[] = [];
        if (milestoneIds.length > 0) {
          const { data: disp } = await supabase
            .from("disputes")
            .select("id, reason, status, resolution, created_at, resolved_at")
            .in("milestone_id", milestoneIds);
          disputes = (disp || []) as DisputeItem[];
        }

        // Assemble events
        const timelineList: ActivityEvent[] = [];

        // Project Creation Event
        timelineList.push({
          id: `project-create-${project.id}`,
          type: "CREATE",
          title: "Project Created",
          description: `The project "${project.title}" was initialized.`,
          created_at: project.created_at,
        });

        // Member Invitation / Joining
        interface MemberWithProfile {
          id: string;
          role: string;
          created_at: string;
          profiles: { full_name: string } | { full_name: string }[] | null;
        }
        const typedMembers = (members || []) as unknown as MemberWithProfile[];
        typedMembers.forEach((m) => {
          const rawProf = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
          const userName = rawProf?.full_name || "A user";
          timelineList.push({
            id: `member-assign-${m.id}`,
            type: "ASSIGN",
            title: m.role === "client" ? "Client Owner Joined" : "Freelancer Assigned",
            description: `${userName} joined the project workspace as ${m.role}.`,
            created_at: m.created_at,
          });
        });

        // Milestone Status Events
        interface MilestoneItem {
          id: string;
          title: string;
          payout_amount: number;
          created_at: string;
          submitted_at: string | null;
          approved_at: string | null;
          paid_at: string | null;
        }
        const typedMilestones = (milestones || []) as unknown as MilestoneItem[];
        typedMilestones.forEach((m) => {
          timelineList.push({
            id: `milestone-add-${m.id}`,
            type: "ASSIGN",
            title: `Milestone Added`,
            description: `"${m.title}" was added with a payout allocation of ${project.currency} ${Number(m.payout_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}.`,
            created_at: m.created_at,
          });

          if (m.submitted_at) {
            timelineList.push({
              id: `milestone-submit-${m.id}`,
              type: "SUBMIT",
              title: "Milestone Submitted",
              description: `Deliverables for "${m.title}" were submitted for review.`,
              created_at: m.submitted_at,
            });
          }

          if (m.approved_at) {
            timelineList.push({
              id: `milestone-approve-${m.id}`,
              type: "APPROVE",
              title: "Milestone Approved",
              description: `Deliverables for "${m.title}" were approved by the client.`,
              created_at: m.approved_at,
            });
          }

          if (m.paid_at) {
            timelineList.push({
              id: `milestone-paid-${m.id}`,
              type: "PAID",
              title: "Milestone Funds Released",
              description: `Escrow payment of ${project.currency} ${Number(m.payout_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} released to freelancer.`,
              created_at: m.paid_at,
            });
          }
        });

        // Escrow Deposits
        interface EscrowEntry {
          id: string;
          amount: number;
          entry_type: string;
          created_at: string;
        }
        const typedEscrow = (escrow || []) as unknown as EscrowEntry[];
        typedEscrow.forEach((e) => {
          if (e.entry_type === "FUNDED") {
            timelineList.push({
              id: `escrow-deposit-${e.id}`,
              type: "FUND",
              title: "Escrow Deposit Secured",
              description: `Simulated payment of ${project.currency} ${Number(e.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} secured in contract ledger.`,
              created_at: e.created_at,
            });
          }
        });

        // Disputes Filed
        disputes.forEach((d) => {
          timelineList.push({
            id: `dispute-raise-${d.id}`,
            type: "DISPUTE",
            title: "Milestone Disputed",
            description: `A dispute has been raised: "${d.reason}". Payments frozen pending resolution.`,
            created_at: d.created_at,
          });

          if (d.resolved_at && ["RESOLVED_CLIENT", "RESOLVED_FREELANCER", "CLOSED"].includes(d.status)) {
            let desc = "The dispute has been resolved.";
            if (d.resolution === "CLIENT_FAVORED") {
              desc = "The dispute was resolved in favor of the client. Escrow funds refunded.";
            } else if (d.resolution === "FREELANCER_FAVORED") {
              desc = "The dispute was resolved in favor of the freelancer. Escrow funds released.";
            } else if (d.resolution === "PARTIAL_RESOLUTION") {
              desc = "The dispute was settled via mutual split agreement.";
            }
            timelineList.push({
              id: `dispute-resolve-${d.id}`,
              type: "APPROVE",
              title: "Dispute Resolved",
              description: desc,
              created_at: d.resolved_at,
            });
          }
        });

        // Invitations Events
        interface InvitationWithMeta {
          id: string;
          invitee_email: string;
          status: string;
          created_at: string;
          responded_at: string | null;
          invitee?: { full_name: string } | { full_name: string }[] | null;
          milestone?: { title: string } | { title: string }[] | null;
        }
        const typedInvitations = (invitations || []) as unknown as InvitationWithMeta[];
        typedInvitations.forEach((inv) => {
          const rawInvitee = Array.isArray(inv.invitee) ? inv.invitee[0] : inv.invitee;
          const rawMilestone = Array.isArray(inv.milestone) ? inv.milestone[0] : inv.milestone;
          const inviteeDisplay = rawInvitee?.full_name || inv.invitee_email;
          const milestoneTitle = rawMilestone?.title || "Milestone";

          timelineList.push({
            id: `invitation-send-${inv.id}`,
            type: "ASSIGN",
            title: "Freelancer Invited",
            description: `Client invited ${inviteeDisplay} to work on "${milestoneTitle}".`,
            created_at: inv.created_at,
          });

          if (inv.status === "ACCEPTED" && inv.responded_at) {
            timelineList.push({
              id: `invitation-accept-${inv.id}`,
              type: "APPROVE",
              title: "Invitation Accepted",
              description: `${inviteeDisplay} accepted the invitation for "${milestoneTitle}".`,
              created_at: inv.responded_at,
            });
          } else if (inv.status === "DECLINED" && inv.responded_at) {
            timelineList.push({
              id: `invitation-decline-${inv.id}`,
              type: "DISPUTE",
              title: "Invitation Declined",
              description: `${inviteeDisplay} declined the invitation for "${milestoneTitle}".`,
              created_at: inv.responded_at,
            });
          }
        });

        // Sort: Most recent events first
        timelineList.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setEvents(timelineList);
      } catch (err) {
        console.error("Error loading project activity timeline:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTimeline();
  }, [projectId, supabase]);

  return (
    <Card className="p-6 border border-outline-variant/30 flex flex-col gap-4 select-none">
      <div className="flex items-center gap-2 pb-2 border-b border-outline-variant/20">
        <span className="material-symbols-outlined text-[20px] text-primary">history</span>
        <h3 className="font-headline-sm text-body-base font-bold text-on-surface">
          Project Activity History
        </h3>
      </div>

      <div className="mt-2 min-h-[150px]">
        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <Spinner size="sm" />
          </div>
        ) : events.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center gap-2 text-muted-foreground">
            <span className="material-symbols-outlined text-[24px]">event_note</span>
            <span className="text-xs font-semibold text-secondary">No project activities found</span>
            <p className="text-[10px] text-muted-foreground leading-normal">
              Events will appear as contract milestones progress.
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {events.map((ev, index) => (
              <ActivityItem key={ev.id} event={ev} isLast={index === events.length - 1} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};
