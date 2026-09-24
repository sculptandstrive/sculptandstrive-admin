import { motion } from "framer-motion";
import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CalculatorLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  showBack?: boolean;
}

const CalculatorLayout = ({ title, subtitle, children, showBack = true }: CalculatorLayoutProps) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-transparent w-full">
      <div className="max-w-xl mx-auto px-3.5 sm:px-4 pt-1 pb-10">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7186A0] hover:text-[#08B594] transition-all mb-3 bg-white px-3 py-1 rounded-xl shadow-[2px_2px_5px_rgba(168,190,185,0.28),-2px_-2px_5px_rgba(255,255,255,0.95)] border border-white/80 active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            All Calculators
          </button>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="mb-4 sm:mb-5"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#EEF7F5] text-[#08A982] text-xs font-bold uppercase tracking-wider mb-2 shadow-[3px_3px_8px_rgba(180,200,196,0.35),-3px_-3px_8px_rgba(255,255,255,0.95)] border-t border-l border-white/80">
            Health Calculator
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#10203B]">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-[#6F849A] mt-1 font-medium max-w-[65ch]">
              {subtitle}
            </p>
          )}
        </motion.div>

        <motion.div
          className="flex flex-col gap-4 sm:gap-4.5"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.03 } },
          }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
};

export const StaggerItem = ({ children }: { children: ReactNode }) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, y: 10 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
    }}
  >
    {children}
  </motion.div>
);

export default CalculatorLayout;
