import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Standard Admin Typography System with Full Dark/Light Theme Support
 * H1 – Page Title: 28px Bold (text-foreground)
 * H2 – Main Section: 20px Semibold (text-foreground)
 * H3 – Card/Subsection: 18px Semibold (text-foreground)
 * Body: 14px Regular (text-muted-foreground)
 * Body Medium: 14px Medium (text-foreground)
 * Small: 12px Regular (text-muted-foreground)
 * Small Medium / Label: 12px Medium (text-muted-foreground)
 * Button: 14px Semibold (text-white / text-foreground)
 * Badge: 12px Semibold
 * Chart Text: 12px Regular
 * Large Number / Stat: 30-32px Bold (text-foreground)
 */

export const PageTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h1
    ref={ref}
    className={cn("text-[28px] font-bold tracking-tight leading-tight text-foreground", className)}
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
    className={cn("text-sm font-normal text-muted-foreground mt-1.5", className)}
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
    className={cn("text-[20px] font-semibold text-foreground leading-snug", className)}
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
    className={cn("text-[18px] font-semibold text-foreground", className)}
    {...props}
  />
));
CardTitleText.displayName = "CardTitleText";

export const BodyText = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm font-normal text-muted-foreground", className)}
    {...props}
  />
));
BodyText.displayName = "BodyText";

export const SmallLabel = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "text-xs font-medium text-muted-foreground",
      className
    )}
    {...props}
  />
));
SmallLabel.displayName = "SmallLabel";

export const TableHeaderText = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn("text-xs font-semibold text-muted-foreground uppercase tracking-wider", className)}
    {...props}
  />
));
TableHeaderText.displayName = "TableHeaderText";

export const TableContentText = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("text-sm font-medium text-foreground", className)}
    {...props}
  />
));
TableContentText.displayName = "TableContentText";

export const MetricValue = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & { size?: "default" | "sm" }
>(({ className, size = "default", ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      size === "sm" ? "text-[24px] font-bold text-foreground" : "text-[30px] sm:text-[32px] font-bold text-foreground",
      className
    )}
    {...props}
  />
));
MetricValue.displayName = "MetricValue";


