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
  teal: "bg-[#E8F8F8] text-[#71D0F7]",
  purple: "bg-purple-50 text-purple-600",
  blue: "bg-blue-50 text-blue-600",
  orange: "bg-orange-50 text-orange-600",
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
    // ✅ FIXED: Using CSS variables from index.css
    <div className="bg-[#FFFFFF] rounded-[14px] p-5 shadow-[0_4px_18px_rgba(15,23,42,0.05)] hover:shadow-lg transition-all duration-300 border border-[#E2E8F0]">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          {/* ✅ FIXED: Proper typography tokens */}
          <p className="text-[14px] font-medium text-[#64748B]">{title}</p>
          <p className="text-[32px] font-bold text-[#111827] leading-[1.1]">{value}</p>
          <div className="flex items-center gap-2">
            {trend !== undefined && (
              <span
                className={cn(
                  "text-[13px] font-medium",
                  positive ? "text-[#10B981]" : "text-[#EF4444]"
                )}
              >
                {positive ? "↑" : "↓"} {Math.abs(trend)}%
              </span>
            )}
            {subtitle && <span className="text-[12px] text-[#64748B]">{subtitle}</span>}
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
            color={positive === false ? "#EF4444" : "#71D0F7"}
          />
        </div>
      )}
    </div>
  );
}