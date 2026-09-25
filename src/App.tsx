import { lazy, Suspense } from "react";
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

// Lazy load all page routes for fast initial page load & code splitting
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Sessions = lazy(() => import("./pages/Sessions"));
const Fitness = lazy(() => import("./pages/Fitness"));
const Nutrition = lazy(() => import("./pages/Nutrition"));
const Progress = lazy(() => import("./pages/Progress"));
const Support = lazy(() => import("./pages/Support"));
const Settings = lazy(() => import("./pages/Settings"));
const Users = lazy(() => import("./pages/Users"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Groups = lazy(() => import("@/pages/admin/Groups"));
const GroupDetails = lazy(() => import("@/pages/admin/GroupDetails"));
const GroupProgress = lazy(() => import("@/pages/admin/GroupProgress"));
const NotFound = lazy(() => import("./pages/NotFound"));

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
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

