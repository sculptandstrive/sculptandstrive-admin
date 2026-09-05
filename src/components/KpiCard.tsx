import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  icon: React.ReactNode;
  accent?: "teal" | "purple" | "blue" | "orange";
  sparklineData?: number[];
}

// ✅ FIXED: Using CSS variables instead of hardcoded HEX
const accentMap = {
  teal: "bg-primary/10 text-primary",
  purple: "bg-purple-500/10 text-purple-400",
  blue: "bg-blue-500/10 text-blue-400",
  orange: "bg-orange-500/10 text-orange-400",
};

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;
  const width = 80;
  const height = 32;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible opacity-70">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export function KpiCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  accent = "teal",
  sparklineData,
}: KpiCardProps) {
  const positive = trend !== undefined && trend >= 0;

  return (
    <div className="bg-card rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 border border-border">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[14px] font-medium text-muted-foreground">{title}</p>
          <p className="text-[32px] font-bold text-foreground leading-[1.1]">{value}</p>
          <div className="flex items-center gap-2">
            {trend !== undefined && (
              <span
                className={cn(
                  "text-[13px] font-medium",
                  positive ? "text-emerald-500" : "text-destructive"
                )}
              >
                {positive ? "↑" : "↓"} {Math.abs(trend)}%
              </span>
            )}
            {subtitle && <span className="text-[12px] text-muted-foreground">{subtitle}</span>}
          </div>
        </div>
        <div className={cn("p-2.5 rounded-xl flex-shrink-0", accentMap[accent])}>
          {icon}
        </div>
      </div>
      {sparklineData && sparklineData.length > 1 && (
        <div className="mt-3 flex justify-end">
          <Sparkline
            data={sparklineData}
            color={positive === false ? "#EF4444" : "#10B981"}
          />
        </div>
      )}
    </div>
  );
}