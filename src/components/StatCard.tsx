import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
    iconBg: "bg-[#E7F6F1] dark:bg-emerald-950/40",
    iconColor: "text-[#07AC7D] dark:text-emerald-400",
    trendColor: "text-[#07AC7D] dark:text-emerald-400",
    sparkStroke: "#07AC7D",
    sparkGradientId: "spark-grad-emerald",
    sparkStartColor: "#07AC7D",
    sparkPath: "M 2,36 Q 18,36 32,30 T 58,28 T 78,12 T 96,6 T 110,12",
    sparkArea: "M 2,36 Q 18,36 32,30 T 58,28 T 78,12 T 96,6 T 110,12 L 110,44 L 2,44 Z",
  },
  violet: {
    iconBg: "bg-[#F3E8FF] dark:bg-purple-950/40",
    iconColor: "text-[#9333EA] dark:text-purple-400",
    trendColor: "text-[#9333EA] dark:text-purple-400",
    sparkStroke: "#A855F7",
    sparkGradientId: "spark-grad-violet",
    sparkStartColor: "#A855F7",
    sparkPath: "M 2,36 Q 14,32 24,26 T 46,18 T 60,30 T 74,16 T 88,22 T 110,6",
    sparkArea: "M 2,36 Q 14,32 24,26 T 46,18 T 60,30 T 74,16 T 88,22 T 110,6 L 110,44 L 2,44 Z",
  },
  blue: {
    iconBg: "bg-[#EFF6FF] dark:bg-blue-950/40",
    iconColor: "text-[#2563EB] dark:text-blue-400",
    trendColor: "text-[#07AC7D] dark:text-emerald-400",
    sparkStroke: "#3B82F6",
    sparkGradientId: "spark-grad-blue",
    sparkStartColor: "#3B82F6",
    sparkPath: "M 2,36 Q 18,36 34,26 T 62,26 T 82,8 T 100,16 T 110,10",
    sparkArea: "M 2,36 Q 18,36 34,26 T 62,26 T 82,8 T 100,16 T 110,10 L 110,44 L 2,44 Z",
  },
  amber: {
    iconBg: "bg-[#FFF7ED] dark:bg-amber-950/40",
    iconColor: "text-[#F97316] dark:text-amber-400",
    trendColor: "text-[#07AC7D] dark:text-emerald-400",
    sparkStroke: "#F97316",
    sparkGradientId: "spark-grad-amber",
    sparkStartColor: "#F97316",
    sparkPath: "M 2,36 Q 12,30 20,34 T 38,24 T 54,30 T 68,18 T 82,8 T 94,18 T 110,4",
    sparkArea: "M 2,36 Q 12,30 20,34 T 38,24 T 54,30 T 68,18 T 82,8 T 94,18 T 110,4 L 110,44 L 2,44 Z",
  },
  rose: {
    iconBg: "bg-rose-50 dark:bg-rose-950/40",
    iconColor: "text-rose-600 dark:text-rose-400",
    trendColor: "text-rose-600 dark:text-rose-400",
    sparkStroke: "#F43F5E",
    sparkGradientId: "spark-grad-rose",
    sparkStartColor: "#F43F5E",
    sparkPath: "M 2,36 Q 16,30 30,34 T 56,22 T 74,28 T 92,12 T 110,8",
    sparkArea: "M 2,36 Q 16,30 30,34 T 56,22 T 74,28 T 92,12 T 110,8 L 110,44 L 2,44 Z",
  },
  teal: {
    iconBg: "bg-teal-50 dark:bg-teal-950/40",
    iconColor: "text-teal-600 dark:text-teal-400",
    trendColor: "text-teal-600 dark:text-teal-400",
    sparkStroke: "#0D9488",
    sparkGradientId: "spark-grad-teal",
    sparkStartColor: "#0D9488",
    sparkPath: "M 2,36 Q 18,36 32,30 T 58,28 T 78,12 T 96,6 T 110,12",
    sparkArea: "M 2,36 Q 18,36 32,30 T 58,28 T 78,12 T 96,6 T 110,12 L 110,44 L 2,44 Z",
  },
  slate: {
    iconBg: "bg-slate-100 dark:bg-slate-800",
    iconColor: "text-slate-600 dark:text-slate-300",
    trendColor: "text-emerald-600 dark:text-emerald-400",
    sparkStroke: "#64748B",
    sparkGradientId: "spark-grad-slate",
    sparkStartColor: "#64748B",
    sparkPath: "M 2,36 Q 18,36 34,26 T 62,26 T 82,8 T 100,16 T 110,10",
    sparkArea: "M 2,36 Q 18,36 34,26 T 62,26 T 82,8 T 100,16 T 110,10 L 110,44 L 2,44 Z",
  },
};

export function MiniSparkline({ theme }: { theme: StatCardTheme }) {
  return (
    <svg
      viewBox="0 0 112 44"
      className="w-24 sm:w-28 h-9 sm:h-10"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={theme.sparkGradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={theme.sparkStartColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={theme.sparkStartColor} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path
        d={theme.sparkArea}
        fill={`url(#${theme.sparkGradientId})`}
        stroke="none"
      />
      <path
        d={theme.sparkPath}
        fill="none"
        stroke={theme.sparkStroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  percentage?: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  trendLabel?: string;
  caption?: string;
  icon: React.ElementType | LucideIcon;
  theme?: StatCardThemeKey;
  iconBg?: string;
  iconColor?: string;
  showSparkline?: boolean;
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
  className,
}: StatCardProps) {
  const t = STAT_CARD_THEMES[theme] || STAT_CARD_THEMES.emerald;
  const resolvedIconBg = iconBg || t.iconBg;
  const resolvedIconColor = iconColor || t.iconColor;
  const trendText = percentage || change;

  return (
    <div
      className={cn(
        "bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full",
        className
      )}
    >
      <div>
        {/* Top-left Icon Box */}
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${resolvedIconBg}`}>
          <Icon className={`w-5 h-5 ${resolvedIconColor}`} />
        </div>

        {/* Title */}
        <p className="text-sm font-medium text-muted-foreground mt-3.5">
          {title}
        </p>

        {/* Main Number & Unit */}
        <div className="flex items-baseline mt-1.5">
          <span className="text-3xl font-semibold text-foreground tracking-tight leading-none">
            {value}
          </span>
          {unit && (
            <span className="text-sm font-normal text-muted-foreground ml-1.5">
              {unit}
            </span>
          )}
        </div>
      </div>

      {/* Bottom: Trend and Sparkline */}
      <div className="flex items-end justify-between mt-3 pt-1">
        {trendText ? (
          <div className="flex items-center text-xs font-semibold leading-none pb-0.5">
            <span className={`${t.trendColor} font-bold mr-1`}>↑ {trendText}</span>
            <span className="text-muted-foreground font-normal">{trendLabel}</span>
          </div>
        ) : caption ? (
          <p className="text-xs text-muted-foreground">{caption}</p>
        ) : (
          <div />
        )}

        {showSparkline && (
          <div className="shrink-0 -mb-1 ml-auto">
            <MiniSparkline theme={t} />
          </div>
        )}
      </div>
    </div>
  );
}
