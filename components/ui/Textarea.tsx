import React from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", error = false, disabled, rows = 4, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        disabled={disabled}
        rows={rows}
        className={`w-full rounded-md border bg-surface-bright text-foreground placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-sans text-body-sm p-4 resize-none ${
          error
            ? "border-error focus:border-error focus:ring-error/20"
            : "border-outline-variant focus:border-primary"
        } disabled:bg-surface-container-low disabled:text-muted-foreground disabled:border-outline-variant/50 disabled:cursor-not-allowed ${className}`}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";
