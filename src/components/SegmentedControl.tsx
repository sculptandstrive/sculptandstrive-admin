import { useId } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface SegmentedControlOption {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

export interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "hero";
  variant?: "default" | "recessed" | "outline" | "ghost";
  shape?: "rounded" | "pill";
}

const SegmentedControl = ({
  options,
  value,
  onChange,
  className,
  size = "md",
  variant = "default",
  shape = "rounded",
}: SegmentedControlProps) => {
  const id = useId();

  const isRounded = shape === "rounded";

  const sizeClasses = {
    sm: `h-9 text-xs p-1 gap-1 ${isRounded ? "rounded-[14px]" : "rounded-full"}`,
    md: `h-10 sm:h-11 text-xs sm:text-[13px] p-1.5 gap-1.5 ${isRounded ? "rounded-[16px]" : "rounded-full"}`,
    lg: `h-11 sm:h-12 text-xs sm:text-sm p-1.5 gap-2 ${isRounded ? "rounded-[18px]" : "rounded-full"}`,
    xl: `h-12 sm:h-14 text-xs sm:text-sm p-2 gap-2 ${isRounded ? "rounded-[20px]" : "rounded-full"}`,
    hero: `h-14 sm:h-16 text-sm sm:text-base p-2 gap-2.5 ${isRounded ? "rounded-[22px]" : "rounded-full"}`,
  };

  const variantClasses = {
    default: "bg-[#E1EDE9] shadow-[inset_2px_2px_4px_rgba(165,185,180,0.45),inset_-2px_-2px_4px_rgba(255,255,255,0.85)] border border-white/50",
    recessed: "bg-[#E1EDE9] shadow-[inset_2px_2px_4px_rgba(165,185,180,0.45),inset_-2px_-2px_4px_rgba(255,255,255,0.85)] border border-white/50",
    outline: "bg-transparent border border-[#D9E9E4]",
    ghost: "bg-transparent border-none",
  };

  const buttonSizeClasses = {
    sm: `text-xs py-1 px-3 font-bold ${isRounded ? "rounded-[10px]" : "rounded-full"}`,
    md: `text-xs sm:text-[13px] py-1.5 px-3.5 sm:px-4 font-bold ${isRounded ? "rounded-[12px]" : "rounded-full"}`,
    lg: `text-xs sm:text-sm py-2 px-4 sm:px-5 font-bold ${isRounded ? "rounded-[13px]" : "rounded-full"}`,
    xl: `text-xs sm:text-sm py-2.5 px-5 sm:px-6 font-bold ${isRounded ? "rounded-[15px]" : "rounded-full"}`,
    hero: `text-sm sm:text-base py-3 px-6 sm:px-7 font-bold ${isRounded ? "rounded-[17px]" : "rounded-full"}`,
  };

  const activeVariants = {
    default: "bg-gradient-to-b from-[#0CC194] via-[#09B38A] to-[#079975] shadow-[0_3px_10px_rgba(8,169,130,0.38),inset_0_1px_1.5px_rgba(255,255,255,0.6)]",
    recessed: "bg-gradient-to-b from-[#0CC194] via-[#09B38A] to-[#079975] shadow-[0_3px_10px_rgba(8,169,130,0.38),inset_0_1px_1.5px_rgba(255,255,255,0.6)]",
    outline: "bg-[#08B594] shadow-sm",
    ghost: "bg-[#08B594]/10",
  };

  const activeRadiusClass = isRounded
    ? size === "sm"
      ? "rounded-[10px]"
      : size === "md"
      ? "rounded-[12px]"
      : size === "lg"
      ? "rounded-[13px]"
      : size === "xl"
      ? "rounded-[15px]"
      : "rounded-[17px]"
    : "rounded-full";

  return (
    <div
      className={cn(
        "relative inline-flex w-full items-center transition-all",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex-1 h-full inline-flex items-center justify-center font-bold tracking-tight transition-colors duration-200 z-10 select-none whitespace-nowrap min-w-0 outline-none border-none focus:outline-none focus:border-none focus-visible:outline-none focus-visible:ring-0 ring-0 cursor-pointer",
              buttonSizeClasses[size]
            )}
          >
            {isActive && (
              <motion.div
                layoutId={`segment-active-${id}`}
                className={cn(
                  "absolute inset-0 pointer-events-none",
                  activeRadiusClass,
                  activeVariants[variant]
                )}
                transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap transition-colors duration-200",
                isActive
                  ? variant === "ghost"
                    ? "text-[#08B594]"
                    : "text-white"
                  : "text-[#6F849A] hover:text-[#10203B]"
              )}
            >
              {option.icon && (
                <span className={cn("flex-shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5 sm:[&>svg]:w-4 sm:[&>svg]:h-4", size === "hero" && "[&>svg]:w-4.5 [&>svg]:h-4.5 sm:[&>svg]:w-5 sm:[&>svg]:h-5")}>
                  {option.icon}
                </span>
              )}
              <span>{option.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default SegmentedControl;
