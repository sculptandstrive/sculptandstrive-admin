import * as React from "react";
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
      className={cn("w-16 sm:w-24 h-6 sm:h-9", className)}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={theme.sparkGradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={theme.sparkStartColor} stopOpacity="0.25" />
          <stop
            offset="100%"
            stopColor={theme.sparkStartColor}
            stopOpacity="0.0"
          />
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
        strokeWidth="2.2"
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
        "bg-white border border-white/90 rounded-[24px] shadow-[6px_6px_18px_rgba(145,170,165,0.2),-4px_-4px_14px_rgba(255,255,255,0.95)] hover:shadow-[8px_8px_22px_rgba(145,170,165,0.26),-4px_-4px_14px_rgba(255,255,255,0.98)] transition-all duration-200 flex flex-col justify-between h-full relative overflow-hidden group p-4 sm:p-5",
        compact && "p-3 sm:p-4",
        className
      )}
    >
      <div>
        {/* Top Header: 3D Recessed Icon Box + Mobile Trend Badge */}
        <div className="flex items-center justify-between gap-2">
          <div
            className={cn(
              "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105",
              compact && "w-9 h-9 rounded-xl",
              resolvedIconBg
            )}
          >
            <Icon
              className={cn(
                "w-5 h-5 shrink-0",
                compact && "w-4.5 h-4.5",
                resolvedIconColor
              )}
            />
          </div>

          {/* Mobile Trend Badge */}
          {trendText && (
            <div
              className={cn(
                "sm:hidden inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black shadow-sm",
                resolvedIconBg
              )}
            >
              <span>↑ {trendText}</span>
            </div>
          )}
        </div>

        {/* Title */}
        <p className="text-xs font-bold uppercase tracking-wider text-[#7186A0] truncate mt-3.5">
          {title}
        </p>

        {/* Value + Unit */}
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight leading-none">
            {value}
          </span>
          {unit && (
            <span className="text-xs font-bold text-[#7186A0]">
              {unit}
            </span>
          )}
        </div>
      </div>

      {/* Bottom: Desktop Trend + Sparkline */}
      <div className="flex items-end justify-between pt-2 mt-auto">
        {trendText ? (
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold leading-none">
            <span className={cn(t.trendColor, "font-black flex items-center gap-0.5")}>
              ↑ {trendText}
            </span>
            <span className="text-[#7186A0] font-semibold text-[11px]">
              {trendLabel}
            </span>
          </div>
        ) : caption ? (
          <p className="text-[11px] text-[#7186A0] font-semibold">{caption}</p>
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
