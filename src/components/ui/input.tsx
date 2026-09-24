import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl bg-[#E2ECE9] px-3.5 py-2 text-xs sm:text-sm font-medium text-[#10203B] placeholder-[#94A3B8] shadow-[inset_2px_2px_4px_rgba(165,185,180,0.45),inset_-2px_-2px_4px_rgba(255,255,255,0.85)] border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08A982]/40 transition-all file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
