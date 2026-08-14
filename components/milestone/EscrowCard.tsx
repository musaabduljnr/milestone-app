import React from "react";
import { Card } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";

export interface EscrowCardProps {
  heldAmount: number;
  releasedAmount: number;
  totalBudget: number;
}

export const EscrowCard: React.FC<EscrowCardProps> = ({
  heldAmount,
  releasedAmount,
  totalBudget,
}) => {
  const releasePercent = totalBudget > 0 ? Math.round((releasedAmount / totalBudget) * 100) : 0;

  return (
    <Card className="bg-surface-container-low p-6 flex flex-col justify-between relative overflow-hidden h-full">
      {/* Decorative backdrop glow */}
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary-container/10 rounded-full blur-xl pointer-events-none" />

      <div>
        <div className="flex items-center gap-2 mb-6 relative z-10">
          <span className="material-symbols-outlined text-primary text-[20px] select-none">
            account_balance
          </span>
          <h3 className="font-label-caps text-caption text-primary font-semibold uppercase tracking-wider">
            Escrow Status
          </h3>
        </div>

        <div className="mb-4 relative z-10">
          <p className="font-body-sm text-xs text-muted-foreground mb-1">Funds Held in Escrow</p>
          <p className="font-headline-md text-headline-md text-on-surface font-bold">
            ${heldAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="mb-6 relative z-10">
          <p className="font-body-sm text-xs text-muted-foreground mb-1">Funds Released</p>
          <p className="font-body-base text-body-sm text-primary font-semibold">
            ${releasedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="mt-auto relative z-10 w-full">
        <Progress value={releasePercent} />
        <div className="flex justify-between items-center mt-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
          <span>Released: {releasePercent}%</span>
          <span>Budget: ${totalBudget.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
      </div>
    </Card>
  );
};
