import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import { 
  Users, 
  Calendar,
  Activity,
  Clock,
  Loader2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  const navigate = useNavigate();
  const [sessionCount, setSessionCount] = useState<number>(0);
  const [memberCount, setMemberCount] = useState<number>(0);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);

        const [sessionsRes, profilesRes] = await Promise.all([
          supabase.from("sessions").select("*", { count: "exact", head: true }),
          supabase.from("profiles").select("*", { count: "exact", head: true })
        ]);

        setSessionCount(sessionsRes.count || 0);
        setMemberCount(profilesRes.count || 0);

        const { data: activityData } = await supabase
          .from("activities")
          .select("admin_user_name, admin_action_detail, admin_created_at")
          .order("admin_created_at", { ascending: false })
          .limit(8);

        setActivities(activityData || []);

      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  return (
    <DashboardLayout>
      <PageHeader 
        title="Dashboard" 
        description="Welcome back! Here's an overview of your platform."
      >
        <Button 
          onClick={() => navigate("/sessions")} 
          className="gradient-accent text-accent-foreground hover:opacity-90 transition-opacity"
        >
          <Calendar className="w-4 h-4 mr-2" />
          View Schedule
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <StatCard
          title="Total Members"
          value={loading ? "..." : memberCount.toLocaleString()}
          change="Registered platform users"
          changeType="positive"
          icon={Users}
        />
        
        <StatCard
          title="Active Sessions"
          value={loading ? "..." : sessionCount.toLocaleString()}
          change="Total scheduled sessions"
          changeType="neutral"
          icon={Activity}
        />
      </div>

      <div className="space-y-6">
        <Card className="shadow-card animate-slide-up">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display">Recent Activity</CardTitle>
            <Button variant="ghost" size="sm" className="text-accent hover:text-accent/80">
              View all
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : activities.length > 0 ? (
                activities.map((activity, i) => (
                  <div 
                    key={i} 
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full gradient-accent flex items-center justify-center flex-shrink-0">
                      <Activity className="w-5 h-5 text-accent-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{activity.admin_user_name}</p>
                      <p className="text-sm text-muted-foreground truncate">{activity.admin_action_detail}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {new Date(activity.admin_created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-sm text-muted-foreground py-10">No recent activity found.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}