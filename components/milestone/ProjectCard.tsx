import React from "react";
import { Card } from "@/components/ui/Card";
import { Avatar, AvatarGroup } from "@/components/ui/Avatar";
import { Progress } from "@/components/ui/Progress";
import { ProjectStatusBadge, ProjectStatus } from "./ProjectStatusBadge";

export interface ProjectTeamMember {
  name: string;
  avatarUrl?: string;
  initials?: string;
}

export interface ProjectCardProps {
  title: string;
  clientName: string;
  status: ProjectStatus;
  budget: number;
  progressPercent: number;
  completedMilestonesCount: number;
  totalMilestonesCount: number;
  nextDeadline?: string;
  team: ProjectTeamMember[];
  onClick?: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  title,
  clientName,
  status,
  budget,
  progressPercent,
  completedMilestonesCount,
  totalMilestonesCount,
  nextDeadline,
  team,
  onClick,
}) => {
  return (
    <Card
      variant={onClick ? "interactive" : "default"}
      onClick={onClick}
      className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <ProjectStatusBadge status={status} />
          <span className="font-data-mono text-xs text-muted-foreground">
            Budget: ${budget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface truncate">
          {title}
        </h3>
        <p className="font-body-sm text-body-sm text-muted-foreground mt-0.5">
          {clientName}
        </p>
      </div>

      {/* Team */}
      <div className="shrink-0 flex items-center gap-2">
        <span className="font-label-caps text-caption text-muted-foreground hidden lg:inline">Team</span>
        <AvatarGroup max={3} size="sm">
          {team.map((member, idx) => (
            <Avatar
              key={idx}
              src={member.avatarUrl}
              initials={member.initials}
              alt={member.name}
            />
          ))}
        </AvatarGroup>
      </div>

      {/* Progress */}
      <div className="w-full md:w-48 shrink-0 flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-xs font-medium">
          <span className="text-secondary">Progress</span>
          <span className="font-data-mono text-on-surface">{progressPercent}%</span>
        </div>
        <Progress
          segmentsCount={totalMilestonesCount}
          activeSegmentIndex={completedMilestonesCount + 1}
        />
        <span className="text-[10px] text-muted-foreground text-right mt-0.5">
          {completedMilestonesCount} of {totalMilestonesCount} stages released
        </span>
      </div>

      {/* Deadline */}
      {nextDeadline && (
        <div className="shrink-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container text-muted-foreground font-body-sm text-xs border border-outline-variant/30">
            <span className="material-symbols-outlined text-[16px]">calendar_today</span>
            <span>{nextDeadline}</span>
          </div>
        </div>
      )}
    </Card>
  );
};
