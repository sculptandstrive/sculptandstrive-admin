import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-xs sm:text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08A982]/40 disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:scale-95 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-[#0CC194] via-[#09B38A] to-[#079975] hover:from-[#0db88e] hover:to-[#068c6b] text-white shadow-[0_4px_14px_rgba(8,169,130,0.35),inset_0_1.5px_2px_rgba(255,255,255,0.6)] border-0",
        destructive:
          "bg-gradient-to-b from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-[0_4px_12px_rgba(225,29,72,0.3)] border-0",
        outline:
          "bg-white text-[#334D66] hover:text-[#10203B] hover:bg-white border border-white/90 shadow-[3px_3px_8px_rgba(160,185,180,0.25),-2px_-2px_6px_rgba(255,255,255,0.95)]",
        secondary:
          "bg-[#EFF7F5] text-[#08A982] hover:bg-[#E5F3EF] border border-white/80 shadow-[2px_2px_6px_rgba(160,185,180,0.2),-2px_-2px_6px_rgba(255,255,255,0.9)]",
        ghost:
          "hover:bg-[#E1F3ED] hover:text-[#08A982] text-[#6F849A]",
        link:
          "text-[#08A982] underline-offset-4 hover:underline",
        glass:
          "bg-white/70 backdrop-blur-md border border-white/90 text-[#10203B] shadow-sm",
        hero:
          "bg-gradient-to-b from-[#0CC194] via-[#09B38A] to-[#079975] text-white shadow-[0_6px_20px_rgba(8,169,130,0.4),inset_0_1.5px_2px_rgba(255,255,255,0.6)] hover:scale-[1.02]",
      },
      size: {
        default: "h-10 sm:h-11 rounded-2xl px-5",
        sm: "h-8 sm:h-9 rounded-xl px-3 text-xs",
        lg: "h-12 rounded-2xl px-7 text-sm font-extrabold",
        icon: "h-9 w-9 sm:h-10 sm:w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
