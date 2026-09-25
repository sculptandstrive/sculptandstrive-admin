import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
  LifeBuoy,
  UserPlus,
  ChevronRight,
  Sparkles,
  PlayCircle,
  Video,
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
  Cell,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";

interface MemberCount {
  user: number;
  trial_user: number;
}

interface DayCount {
  date: string;
  sessions: number;
}

//interface UpcomingSession {
  //id: string;
 // name: string;
  //type: string;
  //time: string;
  //category: string;
//}
interface UpcomingSession {
  id: string;
  title: string;
  instructor: string;
  type: string;
  scheduled_at: string;
  instructor?: string;
  type: string;
  scheduled_at: string;
  category?: string;
}

const ACTIVITY_FALLBACK_COLORS = [
  "bg-[#08A982] text-white",
  "bg-[#9333EA] text-white",
  "bg-[#F59E0B] text-white",
  "bg-[#3B82F6] text-white",
];

function activityVisual(detail: string, index: number) {
  const lower = (detail || "").toLowerCase();
  if (lower.includes("delet"))
    return { icon: Trash2, bg: "bg-rose-500 text-white shadow-[0_2px_8px_rgba(244,63,94,0.35)]" };
  if (lower.includes("creat") || lower.includes("schedul") || lower.includes("assign"))
    return { icon: PlusCircle, bg: "bg-[#08A982] text-white shadow-[0_2px_8px_rgba(8,169,130,0.35)]" };
  if (lower.includes("updat") || lower.includes("edit"))
    return { icon: RefreshCw, bg: "bg-[#3B82F6] text-white shadow-[0_2px_8px_rgba(59,130,246,0.35)]" };
  return {
    icon: Dumbbell,
    bg: `${ACTIVITY_FALLBACK_COLORS[index % ACTIVITY_FALLBACK_COLORS.length]} shadow-[0_2px_8px_rgba(16,185,129,0.25)]`,
  };
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#10203B] text-white rounded-2xl px-4 py-2.5 text-xs shadow-[0_8px_20px_rgba(16,32,59,0.35)] border border-white/10">
      <p className="font-extrabold mb-1 text-slate-200">{label}</p>
      <p className="flex items-center gap-2 font-bold text-emerald-400">
        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
        {payload[0].value} Sessions Logged
      </p>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [sessionCount, setSessionCount] = useState<number>(0);
  const [memberCount, setMemberCount] = useState<MemberCount>({ user: 0, trial_user: 0 });
  const [activities, setActivities] = useState<any[]>([]);
  const [logAllActivity, setAllActivity] = useState<boolean>(false);
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
          supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "user"),
          supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "trial_user"),
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

        const today = new Date();
        const start = new Date(today);
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
          .from("sessions")
          .select("created_at")
          .gte("created_at", start.toISOString());

        if (error) throw error;

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
        //setUpcomingSessions((data as UpcomingSession[]) || []);
        setUpcomingSessions(data || []);
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

  const usageRaw = [
    { name: "Live & Recorded Sessions", value: sessionCount, color: "#08A982" },
    { name: "Subscribed Members", value: memberCount.user, color: "#9333EA" },
    { name: "Trial Users", value: memberCount.trial_user, color: "#F59E0B" },
  ];
  const usageTotal = usageRaw.reduce((sum, item) => sum + item.value, 0);
  const usageData = usageRaw
    .filter((item) => item.value > 0)
    .map((item) => ({
      ...item,
      percent: usageTotal > 0 ? Math.round((item.value / usageTotal) * 100) : 0,
    }));

  return (
    <div className="space-y-6 sm:space-y-7">
      <PageHeader
        badge="Platform Command"
        title="Admin Control Center"
        description="Real-time analytics, member growth metrics, and live scheduling pulse."
      >
        <button
          onClick={() => navigate("/sessions")}
          className="bg-gradient-to-r from-[#08B594] via-[#07AB8C] to-[#069D80] hover:brightness-105 text-white font-bold h-11 px-6 rounded-2xl shadow-[0_4px_14px_rgba(8,169,130,0.35),inset_0_1.5px_2px_rgba(255,255,255,0.6)] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm shrink-0 whitespace-nowrap"
        >
          <Calendar className="w-4 h-4" />
          <span>Manage Schedule</span>
        </button>
      </PageHeader>

      {/* 3D Neumorphic KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Subscribed Members"
          value={loading ? "..." : memberCount.user.toLocaleString()}
          percentage="12%"
          trendLabel="vs last week"
          icon={Users}
          theme="emerald"
        />
        <StatCard
          title="Trial Members"
          value={loading ? "..." : memberCount.trial_user.toLocaleString()}
          percentage="8%"
          trendLabel="vs last week"
          icon={Users}
          theme="violet"
        />
        <StatCard
          title="Total Sessions"
          value={loading ? "..." : sessionCount.toLocaleString()}
          percentage="18%"
          trendLabel="vs last week"
          icon={Activity}
          theme="blue"
        />
      </div>

      {/* Main Grid: Left = Activity & Analytics Chart, Right = Upcoming & Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          {/* Platform Overview Chart */}
          <Card className="rounded-[26px] bg-white border border-white/90 shadow-[6px_6px_20px_rgba(145,170,165,0.18),-4px_-4px_14px_rgba(255,255,255,0.98)]">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black text-[#0F172A]">Platform Activity Overview</CardTitle>
                <CardDescription className="text-xs font-semibold text-[#7186A0]">Daily session scheduling frequency and engagement</CardDescription>
              </div>
              <span className="text-xs font-black text-[#08B594] bg-[#E2ECE9] border border-white/60 rounded-full px-3.5 py-1 shadow-[inset_1px_1px_2px_rgba(165,185,180,0.4)]">
                Last 7 Days
              </span>
            </CardHeader>
            <CardContent>
              {trendLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-[#08B594]" />
                </div>
              ) : (
                <div className="h-[280px] w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyTrend} margin={{ top: 4, right: 10, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="sessionsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#08B594" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#08B594" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2ECE9" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: "#7186A0", fontWeight: 700 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: "#7186A0", fontWeight: 700 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="sessions"
                        stroke="#08B594"
                        strokeWidth={3}
                        fill="url(#sessionsGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity Card */}
          <Card className="rounded-[26px] bg-white border border-white/90 shadow-[6px_6px_20px_rgba(145,170,165,0.18),-4px_-4px_14px_rgba(255,255,255,0.98)]">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black text-[#0F172A]">Recent Admin Events</CardTitle>
                <CardDescription className="text-xs font-semibold text-[#7186A0]">Live audit log of platform updates and user assignments</CardDescription>
              </div>
              {activities.length > 5 && (
                <button
                  type="button"
                  onClick={() => setAllActivity(!logAllActivity)}
                  className="bg-[#E2ECE9] hover:bg-[#D8E6E2] text-[#08B594] text-xs font-bold px-3.5 py-1.5 rounded-xl border border-white/70 shadow-[inset_1px_1px_2px_rgba(165,185,180,0.4)] active:scale-95 transition-all cursor-pointer"
                >
                  {logAllActivity ? "Show Less" : "Show All"}
                </button>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-[#08B594]" />
                  </div>
                ) : activities.length === 0 ? (
                  <p className="text-center text-xs font-semibold text-[#7186A0] py-8">
                    No recent activity found.
                  </p>
                ) : (
                  visibleActivities.map((activity, i) => {
                    const { icon: Icon } = activityVisual(activity.admin_action_detail, i);
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3.5 p-3.5 sm:p-4 rounded-[20px] bg-white border border-white/90 shadow-[4px_4px_12px_rgba(130,155,151,0.12),-3px_-3px_8px_rgba(255,255,255,0.95)] hover:shadow-[6px_6px_16px_rgba(130,155,151,0.18)] transition-all"
                      >
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0CC194]/15 via-[#08B594]/20 to-[#069D80]/25 border border-white shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.9),2px_2px_5px_rgba(8,169,130,0.12)] text-[#08B594] flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[#0F172A] truncate">
                            {activity.admin_user_name}
                          </p>
                          <p className="text-xs font-semibold text-[#7186A0] truncate">
                            {activity.admin_action_detail}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-[#08B594] bg-[#E2ECE9] px-3 py-1 rounded-full border border-white/60 shadow-[inset_1px_1px_2px_rgba(165,185,180,0.4)] shrink-0">
                          <Clock className="w-3 h-3 text-[#08B594]" />
                          {new Date(activity.admin_created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar Column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Actions */}
          <Card className="rounded-[26px] bg-white border border-white/90 shadow-[6px_6px_20px_rgba(145,170,165,0.18),-4px_-4px_14px_rgba(255,255,255,0.98)]">
            <CardHeader>
              <CardTitle className="text-xl font-black text-[#0F172A]">Quick Actions</CardTitle>
              <CardDescription className="text-xs font-semibold text-[#7186A0]">Instant administrative shortcuts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {[
                {
                  label: "Schedule Session",
                  path: "/sessions",
                  icon: PlusCircle,
                  color: "bg-gradient-to-br from-[#0CC194] to-[#069D80] text-white shadow-[0_3px_10px_rgba(8,169,130,0.35)]",
                },
                {
                  label: "Support Tickets",
                  path: "/support",
                  icon: LifeBuoy,
                  color: "bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] text-white shadow-[0_3px_10px_rgba(109,40,217,0.35)]",
                },
                {
                  label: "Add New Member",
                  path: "/users",
                  icon: UserPlus,
                  color: "bg-gradient-to-br from-[#A855F7] to-[#7C3AED] text-white shadow-[0_3px_10px_rgba(124,58,237,0.35)]",
                },
                {
                  label: "Fitness Programs",
                  path: "/fitness",
                  icon: Dumbbell,
                  color: "bg-gradient-to-br from-[#3B82F6] to-[#2563EB] text-white shadow-[0_3px_10px_rgba(37,99,235,0.35)]",
                },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className="w-full flex items-center gap-3.5 p-3.5 rounded-[20px] bg-white border border-white/90 shadow-[4px_4px_12px_rgba(130,155,151,0.12),-3px_-3px_8px_rgba(255,255,255,0.95)] hover:shadow-[6px_6px_16px_rgba(130,155,151,0.18)] hover:-translate-y-0.5 active:scale-98 transition-all text-left cursor-pointer group"
                >
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border border-white/80 shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.9)] ${action.color}`}
                  >
                    <action.icon className="w-5 h-5" />
                  </div>
                  <span className="flex-1 text-sm font-bold text-[#0F172A] group-hover:text-[#08B594] transition-colors">
                    {action.label}
                  </span>
                  <ChevronRight className="w-5 h-5 text-[#94A3B8] group-hover:text-[#08B594] group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Platform Usage Breakdown */}
          <Card className="rounded-[26px] bg-white border border-white/90 shadow-[6px_6px_20px_rgba(145,170,165,0.18),-4px_-4px_14px_rgba(255,255,255,0.98)]">
            <CardHeader>
              <CardTitle className="text-xl font-black text-[#0F172A]">Platform Distribution</CardTitle>
              <CardDescription className="text-xs font-semibold text-[#7186A0]">Live database ratio</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-[#08B594]" />
                </div>
              ) : usageTotal === 0 ? (
                <p className="text-center text-xs font-semibold text-[#7186A0] py-8">
                  No data yet to show distribution.
                </p>
              ) : (
                <div className="flex items-center gap-4 pt-0.5">
                  <div className="relative w-[110px] h-[110px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={usageData}
                          innerRadius={36}
                          outerRadius={52}
                          dataKey="value"
                          stroke="none"
                          startAngle={90}
                          endAngle={-270}
                        >
                          {usageData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#7186A0]">TOTAL</span>
                      <span className="text-lg font-black text-[#0F172A] leading-none mt-0.5">{usageTotal}</span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2 min-w-0">
                    {usageData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-xs font-bold text-[#334155] truncate">{item.name}</span>
                        </div>
                        <span className="text-xs font-black text-[#0F172A] ml-2 shrink-0">{item.percent}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Sessions Panel */}
          <Card className="rounded-[26px] bg-white border border-white/90 shadow-[6px_6px_20px_rgba(145,170,165,0.18),-4px_-4px_14px_rgba(255,255,255,0.98)]">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black text-[#0F172A]">Upcoming Sessions</CardTitle>
                <CardDescription className="text-xs font-semibold text-[#7186A0]">Next queued platform classes</CardDescription>
              </div>
              <button
                onClick={() => navigate("/sessions")}
                className="text-xs font-bold text-[#08B594] hover:underline"
              >
                View All
              </button>
            </CardHeader>
            <CardContent>
              {upcomingLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-[#08B594]" />
                </div>
              ) : upcomingSessions.length === 0 ? (
                <div className="text-center py-8 rounded-[20px] bg-[#F8FCFB] border border-white/90 shadow-[inset_2px_2px_6px_rgba(130,155,151,0.08)] flex flex-col items-center justify-center p-5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0CC194]/15 via-[#08B594]/20 to-[#069D80]/25 border border-white shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.9)] flex items-center justify-center mb-2 text-[#08B594]">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <h4 className="font-black text-[#0F172A] text-xs sm:text-sm mb-0.5">
                    No upcoming sessions scheduled
                  </h4>
                  <p className="text-[11px] text-[#7186A0] font-semibold mb-3">
                    Your schedule is clear. Ready to create a class?
                  </p>
                  <button
                    onClick={() => navigate("/sessions")}
                    className="bg-gradient-to-r from-[#08B594] to-[#069D80] text-white font-bold px-4 h-8 text-xs rounded-xl shadow-[0_3px_8px_rgba(8,169,130,0.35)] transition-all active:scale-95"
                  >
                    + Schedule Session
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingSessions.map((session) => (
                    <div
                      key={session.id}
                      className="p-3.5 rounded-[20px] bg-white border border-white/90 shadow-[4px_4px_12px_rgba(130,155,151,0.12),-3px_-3px_8px_rgba(255,255,255,0.95)] flex items-center justify-between gap-3 hover:shadow-[6px_6px_16px_rgba(130,155,151,0.18)] transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0CC194]/15 via-[#08B594]/20 to-[#069D80]/25 border border-white shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.9)] flex items-center justify-center text-[#08B594] shrink-0">
                          <Video className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-[#0F172A] truncate">{session.title}</h4>
                          <p className="text-xs font-semibold text-[#7186A0] truncate">
                            {new Date(session.scheduled_at).toLocaleDateString([], { month: "short", day: "numeric" })} • {new Date(session.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate("/sessions")}
                        className="h-8 px-3 rounded-xl bg-[#F0F7F5] border border-white shadow-[2px_2px_5px_rgba(180,200,196,0.2)] text-xs font-bold text-[#08B594] hover:bg-[#E6F2EE] active:scale-95 transition-all shrink-0"
                      >
                        Manage
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}