import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, badge, children, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-6 sm:mb-8", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {badge && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF7F5] text-[#08A982] text-xs font-bold uppercase tracking-wider mb-2 shadow-[2px_2px_6px_rgba(180,200,196,0.3),-2px_-2px_6px_rgba(255,255,255,0.95)] border-t border-l border-white/80">
              {badge}
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#10203B]">
            {title}
          </h1>
          {description && (
            <p className="text-xs sm:text-sm text-[#6F849A] mt-1 font-medium max-w-2xl">
              {description}
            </p>
          )}
        </div>
        {children && (
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
