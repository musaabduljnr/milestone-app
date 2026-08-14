import React from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

export interface ProjectBudgetData {
  budget: number;
  currency: string;
}

export interface BudgetStepProps {
  data: ProjectBudgetData;
  onChange: (fields: Partial<ProjectBudgetData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const BudgetStep: React.FC<BudgetStepProps> = ({
  data,
  onChange,
  onNext,
  onBack,
}) => {
  const [error, setError] = React.useState<string | null>(null);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (data.budget <= 0) {
      setError("Project budget must be greater than 0");
      return;
    }
    setError(null);
    onNext();
  };

  return (
    <form onSubmit={handleNext} className="flex flex-col gap-6">
      <div>
        <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
          Budget Allocation
        </h2>
        <p className="font-body-sm text-body-sm text-muted-foreground mt-1">
          Specify the total project budget size and currency.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="budget" className="font-label-caps text-caption text-secondary font-bold uppercase tracking-wider">
              Total Budget
            </label>
            <Input
              id="budget"
              type="number"
              min="1"
              step="any"
              value={data.budget || ""}
              onChange={(e) => onChange({ budget: parseFloat(e.target.value) || 0 })}
              placeholder="e.g. 5000"
              error={!!error}
            />
            {error && <span className="text-xs text-error font-medium">{error}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="currency" className="font-label-caps text-caption text-secondary font-bold uppercase tracking-wider">
              Currency
            </label>
            <Select
              id="currency"
              value={data.currency}
              onChange={(e) => onChange({ currency: e.target.value })}
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </Select>
          </div>
        </div>

        {/* Live Allocation Summary widget */}
        <div className="p-4 rounded-lg bg-surface-container border border-outline-variant/40 mt-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[28px] select-none">
            monetization_on
          </span>
          <div className="flex flex-col">
            <span className="text-[10px] text-secondary font-semibold uppercase tracking-wider leading-none">
              Project Budget Value
            </span>
            <span className="font-data-mono text-headline-sm font-bold text-on-surface mt-1">
              {data.budget > 0
                ? `${data.currency} ${data.budget.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}`
                : "Enter an amount above"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-between gap-3 pt-4 border-t border-outline-variant/30">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" variant="primary">
          Continue to Milestones
        </Button>
      </div>
    </form>
  );
};
