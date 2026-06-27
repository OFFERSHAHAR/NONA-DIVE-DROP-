"use client";

import { ReactNode, forwardRef } from "react";
import clsx from "clsx";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  variant?: "default" | "glass" | "elevated" | "flat";
  hover?: boolean;
  interactive?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      children,
      variant = "default",
      hover = true,
      interactive = false,
      ...props
    },
    ref
  ) => {
    const variants = {
      default:
        "bg-os-panel border border-os-border rounded-os-lg shadow-os-md",
      glass:
        "glass-panel rounded-os-lg",
      elevated:
        "bg-os-panel border border-os-border rounded-os-lg shadow-os-lg",
      flat:
        "bg-os-panel-light border-0 rounded-os-lg",
    };

    return (
      <div
        ref={ref}
        className={clsx(
          variants[variant],
          hover && !interactive && "os-transition hover:shadow-os-lg hover:border-os-hover-strong",
          interactive && "os-transition cursor-pointer hover-lift hover:border-os-primary/50",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx("px-6 py-4 border-b border-os-border", className)}
      {...props}
    >
      {children}
    </div>
  )
);

CardHeader.displayName = "CardHeader";

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx("px-6 py-4", className)}
      {...props}
    >
      {children}
    </div>
  )
);

CardContent.displayName = "CardContent";

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx("px-6 py-4 border-t border-os-border flex gap-3 justify-end", className)}
      {...props}
    >
      {children}
    </div>
  )
);

CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardContent, CardFooter };
