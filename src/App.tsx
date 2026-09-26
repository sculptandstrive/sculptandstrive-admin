import React, { lazy, Suspense, Component, ErrorInfo, ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ThemeProvider } from "./contexts/ThemeContext";
import { DashboardLayout } from "./components/DashboardLayout";
import { Loader2 } from "lucide-react";

// Robust dynamic import with automatic cache-busting reload on stale deployment chunk mismatch
function lazyRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  pageKey: string
) {
  return lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem(`page-has-been-force-refreshed_${pageKey}`) || "false"
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem(`page-has-been-force-refreshed_${pageKey}`, "false");
      return component;
    } catch (error: any) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        // Stale chunk mismatch after a new deployment — force reload once to get fresh chunks
        window.sessionStorage.setItem(`page-has-been-force-refreshed_${pageKey}`, "true");
        window.location.reload();
        return new Promise(() => {}); // hold promise while reloading
      }
      throw error;
    }
  });
}

// Global Chunk Error Boundary to catch any unhandled module script load errors
class ChunkErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  public state = { hasError: false };

  public static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const isChunkError =
      error?.message?.includes("Failed to fetch dynamically imported module") ||
      error?.message?.includes("Loading chunk") ||
      error?.message?.includes("text/html");

    if (isChunkError) {
      const lastReload = sessionStorage.getItem("last_chunk_error_reload");
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 8000) {
        sessionStorage.setItem("last_chunk_error_reload", String(now));
        window.location.reload();
      }
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[60vh] w-full">
          <div className="flex flex-col items-center gap-3 p-6 bg-white rounded-2xl shadow-sm border border-[#E2ECE9]">
            <Loader2 className="w-8 h-8 animate-spin text-[#08B594]" />
            <span className="text-xs font-semibold text-slate-600">Loading latest version...</span>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Lazy load all page routes with lazyRetry
const Dashboard = lazyRetry(() => import("./pages/Dashboard"), "dashboard");
const Sessions = lazyRetry(() => import("./pages/Sessions"), "sessions");
const Fitness = lazyRetry(() => import("./pages/Fitness"), "fitness");
const Nutrition = lazyRetry(() => import("./pages/Nutrition"), "nutrition");
const Progress = lazyRetry(() => import("./pages/Progress"), "progress");
const Support = lazyRetry(() => import("./pages/Support"), "support");
const Settings = lazyRetry(() => import("./pages/Settings"), "settings");
const Users = lazyRetry(() => import("./pages/Users"), "users");
const Auth = lazyRetry(() => import("./pages/Auth"), "auth");
const ResetPassword = lazyRetry(() => import("./pages/ResetPassword"), "reset-password");
const Groups = lazyRetry(() => import("@/pages/admin/Groups"), "groups");
const GroupDetails = lazyRetry(() => import("@/pages/admin/GroupDetails"), "group-details");
const GroupProgress = lazyRetry(() => import("@/pages/admin/GroupProgress"), "group-progress");
const NotFound = lazyRetry(() => import("./pages/NotFound"), "not-found");

// Suspense Fallback Loader
const PageFallbackLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh] w-full">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-[#08B594]" />
      <span className="text-xs font-semibold text-slate-500 tracking-wide">Loading content...</span>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 3, // 3 minutes cache
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ChunkErrorBoundary>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <Suspense fallback={<PageFallbackLoader />}>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <ThemeProvider>
                        <DashboardLayout>
                          <Suspense fallback={<PageFallbackLoader />}>
                            <Routes>
                              <Route path="/" element={<Dashboard />} />
                              <Route path="/sessions" element={<Sessions />} />
                              <Route path="/fitness" element={<Fitness />} />
                              <Route path="/nutrition" element={<Nutrition />} />
                              <Route path="/progress" element={<Progress />} />
                              <Route path="/support" element={<Support />} />
                              <Route path="/settings" element={<Settings />} />
                              <Route path="/users" element={<Users />} />
                              <Route path="/admin/groups" element={<Groups />} />
                              <Route path="/admin/groups/:id" element={<GroupDetails />} />
                              <Route path="/admin/groups/:id/progress" element={<GroupProgress />} />
                            </Routes>
                          </Suspense>
                        </DashboardLayout>
                      </ThemeProvider>
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </ChunkErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

