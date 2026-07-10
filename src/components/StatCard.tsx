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
    <div className="bg-card rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 animate-slide-up border border-border/50">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-base font-medium text-slate-500">{title}</p>
          <p className="text-5xl font-bold text-foreground">{value}</p>
          {change && (
            <p className={cn(
              "text-base",
              changeType === "positive" && "text-emerald-600",
              changeType === "negative" && "text-destructive",
              changeType === "neutral" && "text-muted-foreground"
            )}>
              {change}
            </p>
          )}
        </div>
        <div className={cn(
          "p-3 rounded-xl",
          iconBg || "gradient-accent"
        )}>
          <Icon className="w-6 h-6 text-accent-foreground" />
        </div>
      </div>
    </div>
  );
}
