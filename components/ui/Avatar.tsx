import React from "react";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  initials?: string;
  size?: "sm" | "md" | "lg";
}

export const Avatar: React.FC<AvatarProps> = ({
  className = "",
  src,
  alt = "",
  initials,
  size = "md",
  ...props
}) => {
  const [hasError, setHasError] = React.useState(false);

  const baseStyles =
    "inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 select-none bg-surface-container-high border border-outline-variant font-semibold text-secondary";

  const sizes = {
    sm: "w-7 h-7 text-[10px]",
    md: "w-8 h-8 text-xs",
    lg: "w-12 h-12 text-base",
  };

  const renderContent = () => {
    if (src && !hasError) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover"
        />
      );
    }
    if (initials) {
      return <span className="uppercase">{initials.slice(0, 2)}</span>;
    }
    return (
      <span className="material-symbols-outlined text-[1.25em]" aria-hidden="true">
        person
      </span>
    );
  };

  return (
    <div className={`${baseStyles} ${sizes[size]} ${className}`} {...props}>
      {renderContent()}
    </div>
  );
};

export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  max?: number;
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  className = "",
  max = 3,
  size = "md",
  children,
  ...props
}) => {
  const childrenArray = React.Children.toArray(children);
  const visibleAvatars = childrenArray.slice(0, max);
  const extraAvatarsCount = Math.max(0, childrenArray.length - max);

  const sizes = {
    sm: "w-7 h-7 text-[10px]",
    md: "w-8 h-8 text-xs",
    lg: "w-12 h-12 text-base",
  };

  return (
    <div className={`flex -space-x-2 overflow-hidden items-center ${className}`} {...props}>
      {visibleAvatars.map((child, index) => {
        if (React.isValidElement<AvatarProps>(child)) {
          return React.cloneElement(child, {
            size,
            className: `${child.props.className || ""} ring-2 ring-surface`,
            key: index,
          });
        }
        return child;
      })}
      {extraAvatarsCount > 0 && (
        <div
          className={`inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 bg-surface-container-highest text-secondary border border-outline-variant font-semibold ring-2 ring-surface ${sizes[size]}`}
        >
          +{extraAvatarsCount}
        </div>
      )}
    </div>
  );
};
