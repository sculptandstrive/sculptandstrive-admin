import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconBg?: string;
}

export function StatCard({ title, value, change, changeType = "neutral", icon: Icon, iconBg }: StatCardProps) {
  return (
    <div className="bg-card rounded-xl p-5 shadow-sm hover:shadow-card-hover transition-all duration-300 animate-slide-up border border-border/50">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-[#64748B]">{title}</p>
          <p className="text-[30px] sm:text-[32px] font-bold text-[#111827] leading-none mt-1">{value}</p>
          {change && (
            <p className={cn(
              "text-xs font-medium mt-1.5",
              changeType === "positive" && "text-[#059669]",
              changeType === "negative" && "text-destructive",
              changeType === "neutral" && "text-[#64748B]"
            )}>
              {change}
            </p>
          )}
        </div>
        <div className={cn(
          "p-2.5 rounded-[10px]",
          iconBg || "gradient-accent"
        )}>
          <Icon className="w-4 h-4 text-accent-foreground" />
        </div>
      </div>
    </div>
  );
}
