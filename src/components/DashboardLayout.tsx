import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EEF7F5] via-[#F3F9F7] to-[#F7FAFA] flex w-full">
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main
        className={cn(
          "flex-1 transition-all duration-300 ease-in-out min-w-0",
          sidebarCollapsed ? "ml-[96px]" : "ml-[276px]"
        )}
      >
        <div className="p-4 sm:p-6 lg:p-8 w-full">{children}</div>
      </main>
    </div>
  );
}
