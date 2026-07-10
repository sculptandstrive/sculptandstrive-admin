import * as React from "react";
import { cn } from "@/lib/utils";

export const PageTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h1
    ref={ref}
    className={cn("text-4xl font-bold tracking-tight", className)}
    {...props}
  />
));
PageTitle.displayName = "PageTitle";

export const PageSubtitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-slate-600 dark:text-slate-400 mt-2", className)}
    {...props}
  />
));
PageSubtitle.displayName = "PageSubtitle";

export const SectionTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-2xl font-semibold", className)}
    {...props}
  />
));
SectionTitle.displayName = "SectionTitle";

export const CardTitleText = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-base font-semibold", className)}
    {...props}
  />
));
CardTitleText.displayName = "CardTitleText";

export const SmallLabel = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "text-xs font-medium text-muted-foreground uppercase tracking-wide",
      className
    )}
    {...props}
  />
));
SmallLabel.displayName = "SmallLabel";

export const MetricValue = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & { size?: "default" | "sm" }
>(({ className, size = "default", ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      size === "sm" ? "text-2xl font-bold" : "text-4xl font-bold",
      className
    )}
    {...props}
  />
));
MetricValue.displayName = "MetricValue";

export const BodyText = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm", className)}
    {...props}
  />
));
BodyText.displayName = "BodyText";
