import React from "react";
import { cn } from "@/lib/utils";
import { AdminNotificationBell } from "@/components/AdminNotificationBell";

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  children?: React.ReactNode;
  className?: string;
  hideNotificationBell?: boolean;
}

export function PageHeader({
  title,
  description,
  badge,
  children,
  className,
  hideNotificationBell = false,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-4 sm:mb-7", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        {/* Top Header Row on mobile: Title/Badge on left, Notification Bell on top-right */}
        <div className="flex items-start justify-between gap-3 w-full sm:w-auto">
          <div className="min-w-0 flex-1">
            {badge && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF7F5] text-[#08A982] text-xs font-bold uppercase tracking-wider mb-1.5 shadow-[2px_2px_6px_rgba(180,200,196,0.3),-2px_-2px_6px_rgba(255,255,255,0.95)] border-t border-l border-white/80">
                {badge}
              </div>
            )}
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-[#10203B] leading-tight">
              {title}
            </h1>
            {description && (
              <p className="text-xs sm:text-sm text-[#6F849A] mt-0.5 sm:mt-1 font-medium max-w-2xl leading-relaxed">
                {description}
              </p>
            )}
          </div>
          {!hideNotificationBell && (
            <div className="shrink-0 sm:hidden -mt-0.5">
              <AdminNotificationBell />
            </div>
          )}
        </div>

        {/* Action controls & Desktop Bell */}
        {(children || !hideNotificationBell) && (
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {children && <div className="flex items-center gap-2 sm:gap-3 flex-1 sm:flex-initial w-full sm:w-auto">{children}</div>}
            {!hideNotificationBell && (
              <div className="hidden sm:block shrink-0">
                <AdminNotificationBell />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
