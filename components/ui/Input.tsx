import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leftIconName?: string;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", error = false, leftIconName, rightElement, disabled, ...props }, ref) => {
    return (
      <div className="relative w-full flex items-center">
        {leftIconName && (
          <span
            className={`material-symbols-outlined absolute left-3 text-[20px] select-none pointer-events-none transition-colors ${
              error ? "text-error" : "text-outline"
            }`}
          >
            {leftIconName}
          </span>
        )}
        
        <input
          ref={ref}
          disabled={disabled}
          className={`w-full h-12 rounded-md border bg-surface-bright text-foreground placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-sans text-body-sm ${
            leftIconName ? "pl-10" : "pl-4"
          } ${rightElement ? "pr-12" : "pr-4"} ${
            error
              ? "border-error focus:border-error focus:ring-error/20"
              : "border-outline-variant focus:border-primary"
          } disabled:bg-surface-container-low disabled:text-muted-foreground disabled:border-outline-variant/50 disabled:cursor-not-allowed ${className}`}
          {...props}
        />

        {rightElement && (
          <div className="absolute right-3 flex items-center justify-center">
            {rightElement}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
