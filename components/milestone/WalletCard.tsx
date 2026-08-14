import React from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export interface WalletCardProps {
  availableBalance: number;
  totalEarned?: number;
  onDeposit?: () => void;
  onWithdraw?: () => void;
  showActions?: boolean;
}

export const WalletCard: React.FC<WalletCardProps> = ({
  availableBalance,
  totalEarned,
  onDeposit,
  onWithdraw,
  showActions = true,
}) => {
  return (
    <Card className="bg-secondary dark:bg-on-secondary-fixed text-white p-6 min-h-[200px] flex flex-col justify-between relative overflow-hidden shadow-card border-none">
      {/* Decorative backdrop glow */}
      <div className="absolute -right-12 -top-12 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

      <div className="flex justify-between items-start relative z-10">
        <span className="font-label-caps text-caption text-secondary-container font-medium uppercase tracking-wider">
          Available Balance
        </span>
        <span className="material-symbols-outlined text-white/50 select-none">
          account_balance_wallet
        </span>
      </div>

      <div className="relative z-10 mt-6">
        <div className="font-headline-lg text-display-lg-mobile md:text-display-lg text-white font-semibold tracking-tight">
          ${availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        
        <div className="flex items-center gap-6 font-body-sm text-xs text-secondary-container mt-2">
          {totalEarned !== undefined && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
              Total Earned: ${totalEarned.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          )}
          <span className="w-px h-4 bg-white/20" />
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-success-container">verified</span>
            Fully Simulated
          </span>
        </div>
      </div>

      {showActions && (
        <div className="flex gap-3 mt-6 relative z-10">
          <Button
            variant="secondary"
            size="sm"
            onClick={onDeposit}
            className="flex-1 bg-white/10 border-white/25 text-white hover:bg-white/20 active:scale-95"
          >
            Deposit
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onWithdraw}
            className="flex-1 bg-white/10 border-white/25 text-white hover:bg-white/20 active:scale-95"
          >
            Withdraw
          </Button>
        </div>
      )}
    </Card>
  );
};
