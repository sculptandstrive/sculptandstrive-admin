import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Calendar,
  Activity,
  Clock,
  Loader2,
  TrendingUp,
  PlusCircle,
  Trash2,
  RefreshCw,
  Dumbbell,
  UserPlus,
  ChevronRight
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MemberCount {
  user: number,
  trial_user: number
}

interface DayCount {
  date: string;   // e.g. "May 8"
  sessions: number;
}

interface UpcomingSession {
  id: string;
  title: string;
  instructor: string;
  type: string;          // "live" | "recorded"
  scheduled_at: string;  // ISO timestamp
}

// ---- Visual helpers (UI only, no data logic changed) ----

const STAT_THEMES = {
  emerald: {
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    trendColor: "text-emerald-600",
    sparkStroke: "#10b981",
    sparkFill: "rgba(16,185,129,0.12)",
  },
  violet: {
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    trendColor: "text-violet-600",
    sparkStroke: "#7c3aed",
    sparkFill: "rgba(124,58,237,0.12)",
  },
  blue: {
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    trendColor: "text-blue-600",
    sparkStroke: "#2563eb",
    sparkFill: "rgba(37,99,235,0.12)",
  },
} as const;

function MiniSparkline({ stroke, fill }: { stroke: string; fill: string }) {
  return (
    <svg viewBox="0 0 100 32" className="w-20 h-8" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points="0,24 15,20 30,26 45,10 60,16 75,6 100,10"
      />
      <polyline
        fill={fill}
        stroke="none"
        points="0,24 15,20 30,26 45,10 60,16 75,6 100,10 100,32 0,32"
      />
    </svg>
  );
}

function StatCardVisual({
  title,
  value,
  caption,
  icon: Icon,
  theme,
}: {
  title: string;
  value: string;
  caption: string;
  icon: React.ElementType;
  theme: keyof typeof STAT_THEMES;
}) {
  const t = STAT_THEMES[theme];
  return (
    <Card className="border border-border rounded-2xl shadow-sm bg-card">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${t.iconBg}`}>
            <Icon className={`w-5 h-5 ${t.iconColor}`} />
          </div>
          <MiniSparkline stroke={t.sparkStroke} fill={t.sparkFill} />
        </div>
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
        <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${t.trendColor}`}>
          <TrendingUp className="w-3.5 h-3.5" />
          <span>{caption}</span>
        </div>
      </CardContent>
    </Card>
  );
}

const ACTIVITY_FALLBACK_COLORS = ["bg-emerald-500", "bg-violet-500", "bg-orange-500", "bg-blue-500"];

function activityVisual(detail: string, index: number) {
  const lower = (detail || "").toLowerCase();
  if (lower.includes("delet")) return { icon: Trash2, bg: "bg-orange-500" };
  if (lower.includes("creat") || lower.includes("schedul") || lower.includes("assign"))
    return { icon: PlusCircle, bg: "bg-emerald-500" };
  if (lower.includes("updat") || lower.includes("edit")) return { icon: RefreshCw, bg: "bg-blue-500" };
  return { icon: Dumbbell, bg: ACTIVITY_FALLBACK_COLORS[index % ACTIVITY_FALLBACK_COLORS.length] };
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-foreground text-background rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold mb-0.5">{label}</p>
      <p className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
        {payload[0].value} Sessions
      </p>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [sessionCount, setSessionCount] = useState<number>(0);
  const [memberCount, setMemberCount] = useState<MemberCount>({ user: 0, trial_user: 0 });
  const [activities, setActivities] = useState<any[]>([]);
  const [logAllActivity, setAllActivity] = useState<Boolean>(false);
  const [loading, setLoading] = useState(true);
  const [weeklyTrend, setWeeklyTrend] = useState<DayCount[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([]);
  const [upcomingLoading, setUpcomingLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);

        const [sessionsRes, userCount, trialUserCount] = await Promise.all([
          supabase.from("sessions").select("*", { count: "exact", head: true }),
          supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
          supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'trial_user')
        ]);

        setSessionCount(sessionsRes.count || 0);
        setMemberCount({ user: userCount.count ?? 0, trial_user: trialUserCount.count ?? 0 });

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

    async function fetchWeeklyTrend() {
      try {
        setTrendLoading(true);

        // last 7 days including today
        const today = new Date();
        const start = new Date(today);
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
          .from("sessions")
          .select("created_at")
          .gte("created_at", start.toISOString());

        if (error) throw error;

        // build empty buckets for the 7 days so the chart always has a full x-axis
        const buckets: Record<string, number> = {};
        const labels: string[] = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          const key = d.toISOString().slice(0, 10);
          const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          buckets[key] = 0;
          labels.push(label);
        }

        (data || []).forEach((row: any) => {
          const key = new Date(row.created_at).toISOString().slice(0, 10);
          if (key in buckets) buckets[key] += 1;
        });

        const trend: DayCount[] = Object.keys(buckets).map((key, i) => ({
          date: labels[i],
          sessions: buckets[key],
        }));

        setWeeklyTrend(trend);
      } catch (err) {
        console.error("Weekly trend error:", err);
        setWeeklyTrend([]);
      } finally {
        setTrendLoading(false);
      }
    }

    async function fetchUpcomingSessions() {
      try {
        setUpcomingLoading(true);

        const { data, error } = await supabase
          .from("sessions")
          .select("id, title, instructor, type, scheduled_at")
          .eq("admin_status", "upcoming")
          .gte("scheduled_at", new Date().toISOString())
          .order("scheduled_at", { ascending: true })
          .limit(3);

        if (error) throw error;
        setUpcomingSessions((data as UpcomingSession[]) || []);
      } catch (err) {
        console.error("Upcoming sessions error:", err);
        setUpcomingSessions([]);
      } finally {
        setUpcomingLoading(false);
      }
    }

    fetchDashboardData();
    fetchWeeklyTrend();
    fetchUpcomingSessions();
  }, []);

  const visibleActivities = logAllActivity ? activities : activities.slice(0, 5);

  // Platform Usage — 100% derived live from the real counts already fetched above.
  // No hardcoded percentages: if a category is 0, it simply won't appear in the chart/legend.
  const usageRaw = [
    { name: "Sessions", value: sessionCount, color: "#10b981" },
    { name: "Subscribed Members", value: memberCount.user, color: "#7c3aed" },
    { name: "Trial Members", value: memberCount.trial_user, color: "#f59e0b" },
  ];
  const usageTotal = usageRaw.reduce((sum, item) => sum + item.value, 0);
  const usageData = usageRaw
    .filter((item) => item.value > 0)
    .map((item) => ({
      ...item,
      percent: usageTotal > 0 ? Math.round((item.value / usageTotal) * 100) : 0,
    }));

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Welcome back! Here's an overview of your platform."
      >
        <Button
          onClick={() => navigate("/sessions")}
          className="bg-teal-600 hover:bg-teal-700 text-white h-11 px-4 rounded-[10px] gap-2 transition-colors duration-150 font-semibold text-sm shadow-sm"
        >
          <Calendar className="w-[18px] h-[18px]" />
          View Schedule
        </Button>
      </PageHeader>

      {/* Stat cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
        <StatCardVisual
          title="Subscribed Members"
          value={loading ? "..." : memberCount.user.toLocaleString()}
          caption="Active platform users"
          icon={Users}
          theme="emerald"
        />
        <StatCardVisual
          title="Trial Members"
          value={loading ? "..." : memberCount.trial_user.toLocaleString()}
          caption="Trial platform users"
          icon={Users}
          theme="violet"
        />
        <StatCardVisual
          title="Total Sessions"
          value={loading ? "..." : sessionCount.toLocaleString()}
          caption="Total scheduled sessions"
          icon={Activity}
          theme="blue"
        />
      </div>

      {/* Main content: left = activity + graph, right = reserved sidebar slot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <Card className="border border-border rounded-2xl shadow-sm bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[20px] font-bold text-foreground leading-[1.3]">
                Recent Activity
              </CardTitle>
              {activities.length > 5 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-background text-accent border border-border hover:bg-accent/10 rounded-[8px] h-9 px-3.5 text-sm font-semibold transition-colors duration-150"
                  onClick={() => setAllActivity(!logAllActivity)}
                >
                  {logAllActivity ? "Show Less" : "Show More"}
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-1">
              <div className="space-y-0.5">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : activities.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    No recent activity found.
                  </p>
                ) : (
                  visibleActivities.map((activity, i) => {
                    const { icon: Icon, bg } = activityVisual(activity.admin_action_detail, i);
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors duration-150"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${bg}`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {activity.admin_user_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate md:text-nowrap">
                            {activity.admin_action_detail}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                          <Clock className="w-3 h-3" />
                          {new Date(activity.admin_created_at).toLocaleTimeString(
                            [],
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Platform Overview graph — placed here, same column, below Recent Activity */}
          <Card className="border border-border rounded-2xl shadow-sm bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-[20px] font-bold text-foreground leading-[1.3]">
                Platform Overview
              </CardTitle>
              <span className="text-xs font-medium text-muted-foreground border border-border rounded-md px-2.5 py-1">
                Last 7 Days
              </span>
            </CardHeader>
            <CardContent>
              {trendLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="sessionsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="sessions"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        fill="url(#sessionsGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar slot — add Upcoming Sessions / Quick Actions here once you want them wired to real data */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border border-border rounded-2xl shadow-sm bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-[18px] font-bold text-foreground">Upcoming Sessions</CardTitle>
              <button
                onClick={() => navigate("/sessions")}
                className="text-xs font-semibold text-accent hover:underline"
              >
                View All
              </button>
            </CardHeader>
            <CardContent className="space-y-1">
              {upcomingLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : upcomingSessions.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No upcoming sessions scheduled.
                </p>
              ) : (
                upcomingSessions.map((session) => {
                  const dt = new Date(session.scheduled_at);
                  const dateLabel = dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                  const timeLabel = dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  const isRecorded = session.type === "recorded";
                  return (
                    <div
                      key={session.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors duration-150"
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isRecorded ? "bg-violet-100" : "bg-emerald-100"
                        }`}
                      >
                        <Activity className={`w-5 h-5 ${isRecorded ? "text-violet-600" : "text-emerald-600"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{session.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          Coach {session.instructor} • {dateLabel} • {timeLabel}
                        </p>
                      </div>
                      <span
                        className={`text-[11px] font-semibold rounded-full px-2.5 py-1 flex-shrink-0 ${
                          isRecorded ? "text-violet-700 bg-violet-100" : "text-emerald-700 bg-emerald-100"
                        }`}
                      >
                        {isRecorded ? "Recorded" : "Live"}
                      </span>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card className="border border-border rounded-2xl shadow-sm bg-card">
            <CardHeader>
              <CardTitle className="text-[18px] font-bold text-foreground">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {[
                {
                  label: "Create New Session",
                  path: "/sessions",
                  icon: PlusCircle,
                  iconBg: "bg-emerald-100",
                  iconColor: "text-emerald-600",
                },
                {
                  label: "Add New Member",
                  path: "/users",
                  icon: UserPlus,
                  iconBg: "bg-violet-100",
                  iconColor: "text-violet-600",
                },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors duration-150 text-left"
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${action.iconBg}`}>
                    <action.icon className={`w-[18px] h-[18px] ${action.iconColor}`} />
                  </div>
                  <span className="flex-1 text-sm font-medium text-foreground">{action.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="border border-border rounded-2xl shadow-sm bg-card">
            <CardHeader>
              <CardTitle className="text-[18px] font-bold text-foreground">Platform Usage</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : usageTotal === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-10">
                  No data yet to show usage.
                </p>
              ) : (
                <div className="flex items-center gap-5">
                  <div className="relative w-[120px] h-[120px] flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={usageData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={38}
                          outerRadius={58}
                          paddingAngle={usageData.length > 1 ? 3 : 0}
                          strokeWidth={0}
                        >
                          {usageData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[11px] text-muted-foreground">Total</span>
                      <span className="text-lg font-bold text-foreground">{usageTotal}</span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2.5 min-w-0">
                    {usageData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-xs text-muted-foreground truncate">{item.name}</span>
                        </div>
                        <span className="text-xs font-semibold text-foreground flex-shrink-0">
                          {item.percent}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}