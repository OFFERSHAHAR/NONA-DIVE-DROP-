"use client";

import { ReactNode, forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-os-md font-medium transition-all duration-250 cursor-pointer user-select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-os-primary disabled:opacity-50 disabled:cursor-not-allowed active:scale-95",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-os-primary text-white hover:shadow-os-glow hover:-translate-y-0.5 active:shadow-none",
        secondary:
          "bg-os-panel border border-os-border text-white hover:bg-os-panel-light hover:border-os-primary/50 hover:shadow-os-sm",
        ghost:
          "text-white hover:bg-os-hover/50 active:bg-os-hover",
        danger:
          "bg-os-danger/20 text-os-danger border border-os-danger/30 hover:bg-os-danger/30 hover:shadow-os-sm",
        success:
          "bg-os-success/20 text-os-success border border-os-success/30 hover:bg-os-success/30 hover:shadow-os-sm",
        warning:
          "bg-os-warning/20 text-os-warning border border-os-warning/30 hover:bg-os-warning/30 hover:shadow-os-sm",
        accent:
          "bg-gradient-os-accent text-white hover:shadow-os-glow-purple hover:-translate-y-0.5 active:shadow-none",
        outline:
          "border-2 border-os-primary text-os-primary hover:bg-os-primary hover:text-white",
      },
      size: {
        xs: "px-2.5 py-1.5 text-xs",
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-2.5 text-base",
        xl: "px-8 py-3 text-base",
        icon: "w-9 h-9 p-0",
        "icon-sm": "w-7 h-7 p-0",
        "icon-lg": "w-11 h-11 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  children?: ReactNode;
  isLoading?: boolean;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      children,
      isLoading = false,
      icon,
      iconPosition = "left",
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        className={clsx(buttonVariants({ variant, size }), className)}
        disabled={disabled || isLoading}
        ref={ref}
        {...props}
      >
        {isLoading ? (
          <>
            <span className="inline-block w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin mr-2" />
            Loading...
          </>
        ) : (
          <>
            {icon && iconPosition === "left" && (
              <span className="mr-2 flex items-center">{icon}</span>
            )}
            {children}
            {icon && iconPosition === "right" && (
              <span className="ml-2 flex items-center">{icon}</span>
            )}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
