import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EEF7F5] via-[#F3F9F7] to-[#F7FAFA] flex w-full relative">
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Backdrop overlay on mobile when sidebar is expanded */}
      {!sidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-30 md:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      <main
        className={cn(
          "flex-1 transition-all duration-300 ease-in-out min-w-0",
          sidebarCollapsed ? "ml-[96px]" : "ml-[96px] md:ml-[276px]"
        )}
      >
        <div className="p-3 sm:p-6 lg:p-8 w-full max-w-full overflow-x-hidden">{children}</div>
      </main>
    </div>
  );
}
