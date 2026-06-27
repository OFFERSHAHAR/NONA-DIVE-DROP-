"use client";

import { ReactNode, forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";

const badgeVariants = cva(
  "inline-flex items-center rounded-full font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-os-primary/20 text-os-primary border border-os-primary/30",
        secondary:
          "bg-os-panel border border-os-border text-gray-300",
        success:
          "bg-os-success/20 text-os-success border border-os-success/30",
        warning:
          "bg-os-warning/20 text-os-warning border border-os-warning/30",
        danger:
          "bg-os-danger/20 text-os-danger border border-os-danger/30",
        info:
          "bg-os-info/20 text-os-info border border-os-info/30",
        accent:
          "bg-os-accent/20 text-os-accent border border-os-accent/30",
        solid:
          "bg-os-primary text-white border-0",
        "solid-accent":
          "bg-gradient-os-accent text-white border-0",
      },
      size: {
        sm: "px-2.5 py-0.5 text-xs",
        md: "px-3 py-1 text-sm",
        lg: "px-4 py-1.5 text-base",
      },
      animated: {
        true: "animate-pulse-soft",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      animated: false,
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  children?: ReactNode;
  icon?: ReactNode;
  onClose?: () => void;
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant,
      size,
      animated,
      children,
      icon,
      onClose,
      ...props
    },
    ref
  ) => {
    return (
      <span
        ref={ref}
        className={clsx(badgeVariants({ variant, size, animated }), className)}
        {...props}
      >
        {icon && <span className="mr-1.5 flex items-center">{icon}</span>}
        <span>{children}</span>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-2 hover:text-current opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Close badge"
          >
            ×
          </button>
        )}
      </span>
    );
  }
);

Badge.displayName = "Badge";

export { Badge, badgeVariants };
