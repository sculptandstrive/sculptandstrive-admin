import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { StatCardTheme } from "@/components/StatCard";

export function MotionSparkline({
  theme,
  className,
}: {
  theme: StatCardTheme;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 112 44"
      className={cn("w-16 sm:w-24 h-6 sm:h-9 overflow-visible", className)}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={theme.sparkGradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={theme.sparkStartColor} stopOpacity="0.32" />
          <stop offset="100%" stopColor={theme.sparkStartColor} stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Gradient Area Fill */}
      <motion.path
        d={theme.sparkArea}
        fill={`url(#${theme.sparkGradientId})`}
        stroke="none"
        initial={{ opacity: 0, scaleY: 0 }}
        animate={{ opacity: 1, scaleY: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />

      {/* Sparkline Path Draw */}
      <motion.path
        d={theme.sparkPath}
        fill="none"
        stroke={theme.sparkStroke}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
      />
    </svg>
  );
}
