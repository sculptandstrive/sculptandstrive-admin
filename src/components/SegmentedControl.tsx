import { useId } from "react";
import { motion } from "framer-motion";

interface SegmentedControlProps {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}

const SegmentedControl = ({
  options,
  value,
  onChange,
}: SegmentedControlProps) => {
  const id = useId(); // unique per instance — fixes layoutId collision across multiple controls

  return (
    <div className="flex h-12 bg-background border border-border rounded-full p-1 gap-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className="relative flex-1 rounded-full text-sm font-medium transition-colors duration-200 z-10"
        >
          {value === option.value && (
            <motion.div
              layoutId={`segment-active-${id}`}
              className="absolute inset-0 bg-accent rounded-full"
              transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
            />
          )}
          <span
            className={`relative z-10 ${
              value === option.value
                ? "text-primary-foreground"
                : "text-muted-foreground"
            }`}
          >
            {option.label}
          </span>
        </button>
      ))}
    </div>
  );
};

export default SegmentedControl;
