"use client";

import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";

const spinnerVariants = cva(
  "animate-spin rounded-full border-2 border-current",
  {
    variants: {
      size: {
        xs: "w-3 h-3",
        sm: "w-4 h-4",
        md: "w-6 h-6",
        lg: "w-8 h-8",
        xl: "w-12 h-12",
      },
      color: {
        primary: "border-os-primary border-t-transparent",
        accent: "border-os-accent border-t-transparent",
        white: "border-white border-t-transparent",
        success: "border-os-success border-t-transparent",
        warning: "border-os-warning border-t-transparent",
        danger: "border-os-danger border-t-transparent",
      },
    },
    defaultVariants: {
      size: "md",
      color: "primary",
    },
  }
);

export interface SpinnerProps
  extends React.SVGAttributes<SVGSVGElement>,
    VariantProps<typeof spinnerVariants> {
  label?: string;
}

const Spinner = forwardRef<SVGSVGElement, SpinnerProps>(
  ({ className, size, color, label, ...props }, ref) => {
    const sizeMap = {
      xs: 12,
      sm: 16,
      md: 24,
      lg: 32,
      xl: 48,
    };

    const currentSize = sizeMap[size as keyof typeof sizeMap] || 24;

    return (
      <div className="flex items-center justify-center">
        <div
          ref={ref}
          className={clsx(spinnerVariants({ size, color }), className)}
          role="status"
          aria-label={label || "Loading"}
          {...props}
        />
        {label && <span className="ml-2 text-sm text-gray-400">{label}</span>}
      </div>
    );
  }
);

Spinner.displayName = "Spinner";

// Center loading state component
interface LoadingContainerProps {
  label?: string;
  size?: "sm" | "md" | "lg";
  fullHeight?: boolean;
}

export function LoadingContainer({
  label = "Loading...",
  size = "lg",
  fullHeight = false,
}: LoadingContainerProps) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center",
        fullHeight && "w-full h-full"
      )}
    >
      <Spinner size={size} label={label} />
    </div>
  );
}

export { Spinner, spinnerVariants };
