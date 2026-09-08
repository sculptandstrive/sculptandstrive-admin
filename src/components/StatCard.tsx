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

export function MiniSparkline({
  theme,
  className,
}: {
  theme: StatCardTheme;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 112 44"
      className={cn("w-12 sm:w-28 h-5 sm:h-10", className)}
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
    <div
      className={cn(
        "bg-card border border-border/80 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between items-center sm:items-start text-center sm:text-left h-full relative overflow-hidden group",
        compact ? "p-3 sm:p-4.5" : "p-3.5 sm:p-5",
        className
      )}
    >
      <div className="flex flex-col items-center sm:items-start w-full">
        {/* Top Header: Icon Box + Mobile Trend Pill */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-1.5 w-full">
          <div
            className={cn(
              "rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 mx-auto sm:mx-0",
              compact ? "w-8 h-8 sm:w-10 sm:h-10" : "w-8 h-8 sm:w-11 sm:h-11",
              resolvedIconBg
            )}
          >
            <Icon
              className={cn(
                compact ? "w-4 h-4 sm:w-4.5 sm:h-4.5" : "w-4 h-4 sm:w-5 sm:h-5",
                resolvedIconColor
              )}
            />
          </div>

          {/* Mobile Trend Badge */}
          {trendText && (
            <div
              className={cn(
                "sm:hidden inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 sm:mt-0",
                resolvedIconBg,
                t.trendColor
              )}
            >
              <span>↑ {trendText}</span>
            </div>
          )}
        </div>

        {/* Title */}
        <p
          className={cn(
            "text-xs sm:text-sm font-medium text-muted-foreground truncate w-full text-center sm:text-left",
            compact ? "mt-2 sm:mt-2.5" : "mt-2.5 sm:mt-3.5"
          )}
        >
          {title}
        </p>

        {/* Main Number & Unit */}
        <div className={cn("flex items-baseline justify-center sm:justify-start w-full", compact ? "mt-1" : "mt-1 sm:mt-1.5")}>
          <span className="text-lg sm:text-2xl font-bold text-foreground tracking-tight leading-none">
            {value}
          </span>
          {unit && (
            <span className="text-xs sm:text-sm font-normal text-muted-foreground ml-1">
              {unit}
            </span>
          )}
        </div>
      </div>

      {/* Bottom: Desktop Trend and Sparkline */}
      <div
        className={cn(
          "flex items-center sm:items-end justify-center sm:justify-between w-full pt-1.5",
          compact ? "mt-1.5 sm:mt-2.5" : "mt-2 sm:mt-3"
        )}
      >
        {trendText ? (
          <div className="hidden sm:flex items-center text-xs font-semibold leading-none pb-0.5">
            <span className={`${t.trendColor} font-bold mr-1`}>↑ {trendText}</span>
            <span className="text-muted-foreground font-normal">{trendLabel}</span>
          </div>
        ) : caption ? (
          <p className="text-[10px] sm:text-xs text-muted-foreground text-center sm:text-left">{caption}</p>
        ) : (
          <div className="hidden sm:block" />
        )}

        {showSparkline && (
          <div className="shrink-0 -mb-1 mx-auto sm:ml-auto sm:mr-0">
            <MiniSparkline theme={t} />
          </div>
        )}
      </div>
    </div>
  );
}
