"use client";

import React from "react";

export interface DialogProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: string;
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  size = "md",
  children,
}) => {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-background/40 backdrop-blur-sm p-4 transition-all duration-300"
      onClick={handleBackdropClick}
    >
      <div
        className={`w-full ${sizes[size]} bg-surface-container-lowest border border-outline-variant rounded-xl shadow-modal overflow-hidden flex flex-col max-h-[90vh] scale-100 animate-in fade-in zoom-in-95 duration-150`}
      >
        {/* Header */}
        {(title || onClose) && (
          <div className="flex justify-between items-center px-6 py-4 border-b border-outline-variant flex-shrink-0">
            {title ? (
              <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                {title}
              </h3>
            ) : (
              <div />
            )}
            {onClose && (
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-surface-container transition-colors active:scale-95"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
};
