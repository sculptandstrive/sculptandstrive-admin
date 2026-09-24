import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-white/80 bg-[#EEF7F5] text-[#08A982] shadow-[2px_2px_6px_rgba(180,200,196,0.3),-2px_-2px_6px_rgba(255,255,255,0.95)]",
        secondary:
          "border-white/80 bg-[#EFF7F5] text-[#334D66] shadow-[2px_2px_5px_rgba(180,200,196,0.25)]",
        destructive:
          "border-transparent bg-rose-100 text-rose-700 shadow-sm",
        outline:
          "text-[#10203B] border-[#D9E9E4] bg-transparent",
        success:
          "border-emerald-200 bg-emerald-50 text-emerald-700",
        warning:
          "border-amber-200 bg-amber-50 text-amber-700",
        purple:
          "border-purple-200 bg-purple-50 text-purple-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
