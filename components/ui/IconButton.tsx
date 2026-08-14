import React from "react";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  iconName: string;
  ariaLabel: string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className = "",
      variant = "ghost",
      size = "md",
      iconName,
      ariaLabel,
      disabled = false,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded-full transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed select-none active:scale-95";

    const variants = {
      primary: "bg-primary text-primary-foreground hover:bg-primary-container hover:text-on-primary-container disabled:bg-surface-container-highest disabled:text-muted-foreground",
      secondary: "bg-surface border border-outline-variant text-secondary hover:bg-surface-container-low disabled:border-surface-container-high disabled:text-muted-foreground",
      ghost: "bg-transparent text-muted-foreground hover:text-primary hover:bg-surface-container-high disabled:bg-transparent disabled:text-muted-foreground/40",
      destructive: "bg-error/10 text-error hover:bg-error/20 disabled:bg-transparent disabled:text-muted-foreground/40",
    };

    const sizes = {
      sm: "w-8 h-8",
      md: "w-10 h-10",
      lg: "w-12 h-12",
    };

    const iconSizes = {
      sm: "text-[20px]",
      md: "text-[24px]",
      lg: "text-[28px]",
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        aria-label={ariaLabel}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        <span className={`material-symbols-outlined ${iconSizes[size]}`} aria-hidden="true">
          {iconName}
        </span>
      </button>
    );
  }
);

IconButton.displayName = "IconButton";
