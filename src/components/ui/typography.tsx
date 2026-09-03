import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Standard Admin Typography System
 * H1 – Page Title: 28px Bold (#111827)
 * H2 – Main Section: 20px Semibold (#111827)
 * H3 – Card/Subsection: 18px Semibold (#111827)
 * Body: 14px Regular (#526581)
 * Body Medium: 14px Medium (#111827 / #526581)
 * Small: 12px Regular (#64748B)
 * Small Medium / Label: 12px Medium (#64748B)
 * Button: 14px Semibold (#FFFFFF / #111827)
 * Badge: 12px Semibold
 * Chart Text: 12px Regular
 * Large Number / Stat: 30-32px Bold (#111827)
 */

export const PageTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h1
    ref={ref}
    className={cn("text-[28px] font-bold tracking-tight leading-tight text-[#111827]", className)}
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
    className={cn("text-sm font-normal text-[#526581] mt-1.5", className)}
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
    className={cn("text-[20px] font-semibold text-[#111827] leading-snug", className)}
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
    className={cn("text-[18px] font-semibold text-[#111827]", className)}
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
    className={cn("text-sm font-normal text-[#526581]", className)}
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
      "text-xs font-medium text-[#64748B]",
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
    className={cn("text-xs font-semibold text-[#64748B] uppercase tracking-wider", className)}
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
    className={cn("text-sm font-medium text-[#111827]", className)}
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
      size === "sm" ? "text-[24px] font-bold text-[#111827]" : "text-[30px] sm:text-[32px] font-bold text-[#111827]",
      className
    )}
    {...props}
  />
));
MetricValue.displayName = "MetricValue";

