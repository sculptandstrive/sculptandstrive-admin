import { motion } from "framer-motion";

interface ProgressBarProps {
  value: number;
  max?: number;
  segments?: { label: string; color: string; threshold: number }[];
  currentValue?: number;
}

const ProgressBar = ({ value, max = 100, segments, currentValue }: ProgressBarProps) => {
  const percent = Math.min(Math.max((value / max) * 100, 0), 100);

  if (segments && currentValue !== undefined) {
    return (
      <div className="mt-6">
        <div className="h-3.5 sm:h-4 w-full bg-[#E1EDE9] rounded-full overflow-hidden flex shadow-[inset_1.5px_1.5px_3px_rgba(165,188,183,0.45)]">
          {segments.map((seg, i) => {
            const prevThreshold = i > 0 ? segments[i - 1].threshold : 0;
            const width = ((seg.threshold - prevThreshold) / max) * 100;
            return (
              <div
                key={seg.label}
                className="h-full transition-all duration-300"
                style={{
                  width: `${width}%`,
                  backgroundColor: seg.color,
                  opacity: currentValue >= prevThreshold && currentValue < seg.threshold ? 1 : 0.88,
                }}
              />
            );
          })}
        </div>
        <div className="flex justify-between gap-1 mt-2.5 px-0.5">
          {segments.map((seg) => (
            <span key={seg.label} className="text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.1em] text-[#7186A0]">
              {seg.label}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 h-3.5 w-full bg-[#E1EDE9] rounded-full overflow-hidden shadow-[inset_1.5px_1.5px_3px_rgba(165,188,183,0.45)]">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={{ type: "spring", bounce: 0, duration: 0.6 }}
        className="h-full bg-gradient-to-r from-[#08B594] to-[#069D80] rounded-full"
      />
    </div>
  );
};

export default ProgressBar;
