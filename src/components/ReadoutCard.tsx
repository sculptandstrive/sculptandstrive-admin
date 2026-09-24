import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

interface ReadoutCardProps {
  label: string;
  value: string;
  unit?: string;
  description?: string;
  children?: ReactNode;
  colorClass?: string;
  handleDBSave?: () => void;
  showSave?: boolean;
  headerAction?: ReactNode;
}

const ReadoutCard = ({
  label,
  value,
  unit,
  description,
  handleDBSave,
  children,
  colorClass = "text-[#08B594]",
  showSave,
  headerAction,
}: ReadoutCardProps) => {
  return (
    <motion.div layout className="bg-white rounded-2xl border border-white/90 p-4 sm:p-5 shadow-[5px_5px_14px_rgba(168,190,185,0.28),-5px_-5px_14px_rgba(255,255,255,0.95)]">
      <div className="flex justify-between items-center gap-2.5">
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#7186A0]">{label}</span>
        <div className="flex items-center gap-2.5">
          {headerAction}
          {showSave && (
            <button
              type="button"
              className="px-4 py-1.5 text-xs font-bold shrink-0 bg-gradient-to-r from-[#08B594] via-[#07AB8C] to-[#069D80] hover:from-[#09C4A0] hover:to-[#058B71] text-white rounded-full shadow-[0_3px_10px_rgba(8,181,148,0.32),inset_0_1.5px_2px_rgba(255,255,255,0.5)] active:scale-95 transition-all cursor-pointer"
              onClick={handleDBSave}
            >
              Save
            </button>
          )}
        </div>
      </div>
      <div className="flex items-baseline gap-1 mt-2">
        <AnimatePresence mode="popLayout">
          <motion.h2
            key={value}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={`text-2xl sm:text-3xl font-extrabold tracking-tight leading-none ${colorClass}`}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {value}
          </motion.h2>
        </AnimatePresence>
        {unit && (
          <span className="text-xs sm:text-sm font-bold text-[#7186A0] ml-1">
            {unit}
          </span>
        )}
      </div>
      {description && (
        <p className="mt-2 text-xs text-[#7186A0] font-normal leading-relaxed max-w-[65ch]">
          {description}
        </p>
      )}
      {children}
    </motion.div>
  );
};

export default ReadoutCard;
