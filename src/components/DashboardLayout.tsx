import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { cn } from "@/lib/utils";
import { AdminNotificationBell } from "@/components/AdminNotificationBell";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background ">
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main
        className={cn(
          "flex-1 transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "ml-20 lg:ml-[80px]" : "ml-20 lg:ml-[256px]"
        )}
      >
        <div className="flex justify-end px-6 lg:px-8 pt-4">
          <AdminNotificationBell />
        </div>
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}