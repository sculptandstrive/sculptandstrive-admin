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
  size?: "sm" | "md" | "lg";
  variant?: "default" | "outline" | "ghost";
}

const SegmentedControl = ({
  options,
  value,
  onChange,
  className,
  size = "md",
  variant = "default",
}: SegmentedControlProps) => {
  const id = useId();

  const sizeClasses = {
    sm: "h-9 text-xs p-1 gap-1",
    md: "h-11 text-sm p-1.5 gap-1.5",
    lg: "h-12 text-base p-1.5 gap-2",
  };

  const variantClasses = {
    default: "bg-muted border border-border shadow-inner",
    outline: "bg-transparent border-2 border-border",
    ghost: "bg-transparent border-none",
  };

  const buttonSizeClasses = {
    sm: "text-xs py-1 px-3",
    md: "text-sm py-1.5 px-4",
    lg: "text-base py-2 px-5",
  };

  const activeVariants = {
    default: "bg-primary shadow-md shadow-primary/20",
    outline: "bg-primary border-2 border-primary",
    ghost: "bg-primary/10",
  };

  return (
    <div
      className={cn(
        "relative inline-flex items-center rounded-full transition-all",
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
              "relative flex-1 inline-flex items-center justify-center rounded-full font-medium transition-all duration-200 z-10 select-none whitespace-nowrap",
              "hover:scale-[1.01] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              buttonSizeClasses[size]
            )}
          >
            {isActive && (
              <motion.div
                layoutId={`segment-active-${id}`}
                className={cn(
                  "absolute inset-0 rounded-full",
                  activeVariants[variant]
                )}
                transition={{ type: "spring", bounce: 0.18, duration: 0.4 }}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex items-center justify-center gap-2 whitespace-nowrap transition-colors duration-200",
                isActive
                  ? variant === "ghost"
                    ? "text-primary font-semibold"
                    : "text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option.icon && (
                <span className="flex-shrink-0">{option.icon}</span>
              )}
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default SegmentedControl;
