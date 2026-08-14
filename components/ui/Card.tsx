import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "interactive";
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = "", variant = "default", children, ...props }, ref) => {
    const baseStyles =
      "bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden transition-all duration-150";

    const variants = {
      default: "shadow-subtle",
      elevated: "shadow-card border-none",
      interactive: "shadow-subtle hover:border-primary/50 cursor-pointer active:scale-[0.99]",
    };

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
