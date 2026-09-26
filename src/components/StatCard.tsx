import * as React from "react";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "@/components/motion/AnimatedCounter";
import { MotionSparkline } from "@/components/motion/MotionSparkline";

export type StatCardThemeKey =
  | "emerald"
  | "violet"
  | "blue"
  | "amber"
  | "rose"
  | "teal"
  | "slate";

export interface StatCardTheme {
  iconBg: string;
  iconColor: string;
  trendColor: string;
  sparkStroke: string;
  sparkGradientId: string;
  sparkStartColor: string;
  sparkPath: string;
  sparkArea: string;
}

export const STAT_CARD_THEMES: Record<StatCardThemeKey, StatCardTheme> = {
  emerald: {
    iconBg: "bg-[#E2ECE9] text-[#08B594] border border-white/60 shadow-[inset_1.5px_1.5px_3px_rgba(165,185,180,0.45),inset_-1.5px_-1.5px_3px_rgba(255,255,255,0.85)]",
    iconColor: "text-[#08B594]",
    trendColor: "text-[#08B594]",
    sparkStroke: "#08B594",
    sparkGradientId: "spark-grad-emerald",
    sparkStartColor: "#08B594",
    sparkPath: "M 2,36 Q 18,36 32,30 T 58,28 T 78,12 T 96,6 T 110,12",
    sparkArea:
      "M 2,36 Q 18,36 32,30 T 58,28 T 78,12 T 96,6 T 110,12 L 110,44 L 2,44 Z",
  },
  violet: {
    iconBg: "bg-[#EDE9FE] text-[#7C3AED] border border-white/60 shadow-[inset_1.5px_1.5px_3px_rgba(180,170,210,0.4),inset_-1.5px_-1.5px_3px_rgba(255,255,255,0.85)]",
    iconColor: "text-[#7C3AED]",
    trendColor: "text-[#7C3AED]",
    sparkStroke: "#8B5CF6",
    sparkGradientId: "spark-grad-violet",
    sparkStartColor: "#8B5CF6",
    sparkPath: "M 2,36 Q 14,32 24,26 T 46,18 T 60,30 T 74,16 T 88,22 T 110,6",
    sparkArea:
      "M 2,36 Q 14,32 24,26 T 46,18 T 60,30 T 74,16 T 88,22 T 110,6 L 110,44 L 2,44 Z",
  },
  blue: {
    iconBg: "bg-[#EFF6FF] text-[#2563EB] border border-white/60 shadow-[inset_1.5px_1.5px_3px_rgba(170,185,210,0.4),inset_-1.5px_-1.5px_3px_rgba(255,255,255,0.85)]",
    iconColor: "text-[#2563EB]",
    trendColor: "text-[#2563EB]",
    sparkStroke: "#3B82F6",
    sparkGradientId: "spark-grad-blue",
    sparkStartColor: "#3B82F6",
    sparkPath: "M 2,36 Q 18,36 34,26 T 62,26 T 82,8 T 100,16 T 110,10",
    sparkArea:
      "M 2,36 Q 18,36 34,26 T 62,26 T 82,8 T 100,16 T 110,10 L 110,44 L 2,44 Z",
  },
  amber: {
    iconBg: "bg-[#FFF7ED] text-[#EA580C] border border-white/60 shadow-[inset_1.5px_1.5px_3px_rgba(210,185,170,0.4),inset_-1.5px_-1.5px_3px_rgba(255,255,255,0.85)]",
    iconColor: "text-[#EA580C]",
    trendColor: "text-[#EA580C]",
    sparkStroke: "#F97316",
    sparkGradientId: "spark-grad-amber",
    sparkStartColor: "#F97316",
    sparkPath:
      "M 2,36 Q 12,30 20,34 T 38,24 T 54,30 T 68,18 T 82,8 T 94,18 T 110,4",
    sparkArea:
      "M 2,36 Q 12,30 20,34 T 38,24 T 54,30 T 68,18 T 82,8 T 94,18 T 110,4 L 110,44 L 2,44 Z",
  },
  rose: {
    iconBg: "bg-rose-50 text-rose-600 border border-white/60 shadow-[inset_1.5px_1.5px_3px_rgba(210,170,180,0.4),inset_-1.5px_-1.5px_3px_rgba(255,255,255,0.85)]",
    iconColor: "text-rose-600",
    trendColor: "text-rose-600",
    sparkStroke: "#F43F5E",
    sparkGradientId: "spark-grad-rose",
    sparkStartColor: "#F43F5E",
    sparkPath: "M 2,36 Q 16,30 30,34 T 56,22 T 74,28 T 92,12 T 110,8",
    sparkArea:
      "M 2,36 Q 16,30 30,34 T 56,22 T 74,28 T 92,12 T 110,8 L 110,44 L 2,44 Z",
  },
  teal: {
    iconBg: "bg-[#E6F7F3] text-[#0D9488] border border-white/60 shadow-[inset_1.5px_1.5px_3px_rgba(165,185,180,0.45),inset_-1.5px_-1.5px_3px_rgba(255,255,255,0.85)]",
    iconColor: "text-[#0D9488]",
    trendColor: "text-[#0D9488]",
    sparkStroke: "#0D9488",
    sparkGradientId: "spark-grad-teal",
    sparkStartColor: "#0D9488",
    sparkPath: "M 2,36 Q 18,36 32,30 T 58,28 T 78,12 T 96,6 T 110,12",
    sparkArea:
      "M 2,36 Q 18,36 32,30 T 58,28 T 78,12 T 96,6 T 110,12 L 110,44 L 2,44 Z",
  },
  slate: {
    iconBg: "bg-[#E2ECE9] text-[#475569] border border-white/60 shadow-[inset_1.5px_1.5px_3px_rgba(165,185,180,0.45),inset_-1.5px_-1.5px_3px_rgba(255,255,255,0.85)]",
    iconColor: "text-[#475569]",
    trendColor: "text-[#475569]",
    sparkStroke: "#64748B",
    sparkGradientId: "spark-grad-slate",
    sparkStartColor: "#64748B",
    sparkPath: "M 2,36 Q 18,36 34,26 T 62,26 T 82,8 T 100,16 T 110,10",
    sparkArea:
      "M 2,36 Q 18,36 34,26 T 62,26 T 82,8 T 100,16 T 110,10 L 110,44 L 2,44 Z",
  },
};

export interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  percentage?: string;
  change?: string;
  trendLabel?: string;
  caption?: string;
  icon: React.ElementType | LucideIcon;
  theme?: StatCardThemeKey;
  iconBg?: string;
  iconColor?: string;
  showSparkline?: boolean;
  compact?: boolean;
  className?: string;
}

export function StatCard({
  title,
  value,
  unit,
  percentage,
  change,
  trendLabel = "vs last week",
  caption,
  icon: Icon,
  theme = "emerald",
  iconBg,
  iconColor,
  showSparkline = true,
  compact = false,
  className,
}: StatCardProps) {
  const t = STAT_CARD_THEMES[theme] || STAT_CARD_THEMES.emerald;
  const resolvedIconBg = iconBg || t.iconBg;
  const resolvedIconColor = iconColor || t.iconColor;
  const trendText = percentage || change;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "bg-gradient-to-b from-white to-[#F9FBFA] border border-white/90 rounded-[18px] sm:rounded-[24px] shadow-[4px_4px_14px_rgba(145,170,165,0.16),-3px_-3px_10px_rgba(255,255,255,0.98)] hover:shadow-[6px_6px_20px_rgba(145,170,165,0.22),-3px_-3px_12px_rgba(255,255,255,0.98)] transition-all duration-300 flex flex-col justify-between h-full relative overflow-hidden group p-2.5 sm:p-5",
        compact && "p-2 sm:p-4",
        className
      )}
    >
      <div>
        {/* Top Header: 3D Recessed Icon Box + Mobile Trend Badge */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-2">
          <motion.div
            className={cn(
              "w-7 h-7 min-[400px]:w-8 min-[400px]:h-8 sm:w-11 sm:h-11 rounded-lg min-[400px]:rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
              compact && "w-6 h-6 sm:w-7 sm:h-7 rounded-lg",
              resolvedIconBg
            )}
            whileHover={{ rotate: [0, -8, 8, 0], scale: 1.08 }}
            transition={{ duration: 0.35 }}
          >
            <Icon
              className={cn(
                "w-3.5 h-3.5 min-[400px]:w-4 min-[400px]:h-4 sm:w-5 sm:h-5 shrink-0",
                compact && "w-3 h-3 sm:w-3.5 sm:h-3.5",
                resolvedIconColor
              )}
            />
          </motion.div>

          {/* Mobile Trend Badge */}
          {trendText && (
            <div
              className={cn(
                "inline-flex sm:hidden items-center gap-0.5 px-1 py-0.5 rounded-full text-[7.5px] min-[400px]:text-[8.5px] font-black shadow-sm shrink-0 whitespace-nowrap",
                resolvedIconBg
              )}
            >
              <span>↑{trendText}</span>
            </div>
          )}
        </div>

        {/* Title - Clean wrapping without awkward mid-word breaks */}
        <p
          className="text-[8.5px] min-[400px]:text-[9.5px] sm:text-xs font-bold uppercase tracking-wide text-[#7186A0] leading-tight sm:leading-snug mt-1.5 sm:mt-3 line-clamp-2 min-h-[22px] sm:min-h-0 break-normal hyphens-none"
          title={title}
        >
          {title}
        </p>

        {/* Value + Unit with Animated Motion Counter */}
        <div className="flex items-baseline gap-0.5 sm:gap-1 mt-0.5 sm:mt-1.5 min-w-0">
          <span className="text-base min-[400px]:text-lg sm:text-3xl font-black text-[#0F172A] tracking-tight leading-none truncate">
            <AnimatedCounter value={value} />
          </span>
          {unit && (
            <span className="text-[9px] sm:text-sm font-bold text-[#7186A0] shrink-0">
              {unit}
            </span>
          )}
        </div>
      </div>

      {/* Bottom: Desktop Trend + Animated Motion Sparkline */}
      <div className="flex items-end justify-between pt-1 sm:pt-2 mt-auto">
        {trendText ? (
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold leading-none">
            <motion.span
              className={cn(t.trendColor, "font-black flex items-center gap-0.5")}
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              ↑ {trendText}
            </motion.span>
            <span className="text-[#7186A0] font-semibold text-[11px]">
              {trendLabel}
            </span>
          </div>
        ) : caption ? (
          <p className="text-[8.5px] sm:text-[11px] text-[#7186A0] font-semibold truncate">{caption}</p>
        ) : (
          <div />
        )}

        {showSparkline && (
          <div className="hidden sm:block shrink-0 -mb-1 ml-auto scale-90 sm:scale-100 origin-bottom-right">
            <MotionSparkline theme={t} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
