import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "ai";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      children,
      ...props
    },
    ref
  ) => {
    // Base classes
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-150 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed select-none active:scale-[0.98]";

    // Variants
    const variants = {
      primary:
        "bg-primary text-primary-foreground hover:bg-primary-container hover:text-on-primary-container disabled:bg-surface-container-highest disabled:text-muted-foreground disabled:scale-100",
      secondary:
        "bg-surface border border-outline-variant text-secondary hover:bg-surface-container-low disabled:border-surface-container-high disabled:text-muted-foreground disabled:scale-100",
      ghost:
        "bg-transparent text-secondary hover:bg-surface-container-high hover:text-foreground disabled:hover:bg-transparent disabled:text-muted-foreground disabled:scale-100",
      destructive:
        "bg-error/10 text-error hover:bg-error/20 disabled:bg-surface-container-highest disabled:text-muted-foreground disabled:scale-100",
      ai:
        "bg-primary text-primary-foreground relative overflow-hidden ai-glow hover:opacity-95 disabled:scale-100 disabled:opacity-50",
    };

    // Sizes
    const sizes = {
      sm: "h-9 px-3 text-sm gap-1.5",
      md: "h-11 px-5 text-base gap-2",
      lg: "h-12 px-6 text-base gap-2.5",
    };

    const isBtnDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isBtnDisabled}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {variant === "ai" && !isBtnDisabled && (
          <div className="absolute inset-0 ai-shimmer pointer-events-none" />
        )}
        
        {isLoading && (
          <span className="material-symbols-outlined animate-spin text-[1.25em]" aria-hidden="true">
            progress_activity
          </span>
        )}
        
        {!isLoading && leftIcon && (
          <span className="flex shrink-0 items-center justify-center" aria-hidden="true">
            {leftIcon}
          </span>
        )}
        
        <span className="relative z-10">{children}</span>
        
        {!isLoading && rightIcon && (
          <span className="flex shrink-0 items-center justify-center" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
