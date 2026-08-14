import React from "react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", error = false, disabled, children, ...props }, ref) => {
    return (
      <div className="relative w-full flex items-center">
        <select
          ref={ref}
          disabled={disabled}
          className={`w-full h-12 pr-10 pl-4 rounded-md border bg-surface-bright text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-sans text-body-sm appearance-none ${
            error
              ? "border-error focus:border-error focus:ring-error/20"
              : "border-outline-variant focus:border-primary"
          } disabled:bg-surface-container-low disabled:text-muted-foreground disabled:border-outline-variant/50 disabled:cursor-not-allowed ${className}`}
          {...props}
        >
          {children}
        </select>
        <span
          className="material-symbols-outlined absolute right-3 text-[20px] text-outline pointer-events-none select-none"
          aria-hidden="true"
        >
          expand_more
        </span>
      </div>
    );
  }
);

Select.displayName = "Select";
