import React from "react";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  error?: boolean;
  label?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = "", error = false, label, id, disabled, ...props }, ref) => {
    const generatedId = React.useId();
    const uniqueId = id || generatedId;

    return (
      <div className="flex items-start gap-3 select-none">
        <input
          ref={ref}
          type="checkbox"
          id={uniqueId}
          disabled={disabled}
          className={`mt-1 w-4 h-4 rounded text-primary border bg-surface-bright focus:ring-primary focus:ring-offset-2 transition-all cursor-pointer disabled:cursor-not-allowed ${
            error ? "border-error focus:ring-error" : "border-outline-variant"
          } disabled:bg-surface-container-low disabled:border-outline-variant/30 ${className}`}
          {...props}
        />
        {label && (
          <label
            htmlFor={uniqueId}
            className={`font-body-sm text-body-sm transition-colors cursor-pointer ${
              disabled ? "text-muted-foreground/60 cursor-not-allowed" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </label>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
