import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { AdminClientProgress } from "@/components/AdminClientProgress"; 
import {
  TrendingUp,
  Loader2,
  Users,
  LineChart,
  Target,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

interface MemberGrowthData {
  date: string;
  count: number;
  newMembers: number;
}

export default function ProgressPage() {

  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [memberGrowthData, setMemberGrowthData] = useState<MemberGrowthData[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSupabaseData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let progressRecords: any[] = [];
        //const { data: rawProgress, error: progressError } = await supabase
         // .from("progress_records")
          //.select("*");
          const { data: rawProgress, error: progressError } = await supabase
  .from("current_measurements")
  .select("*")
  .order("created_at", { ascending: false });

        if (!progressError && rawProgress) {
          const userIds = [...new Set(rawProgress.map((r: any) => r.user_id).filter(Boolean))];
          if (userIds.length > 0) {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("user_id, full_name")
              .in("user_id", userIds);

            const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);
            progressRecords = rawProgress.map((r: any) => ({
              ...r,
              profiles: profileMap.get(r.user_id) || null,
            }));
          } else {
            progressRecords = rawProgress;
          }
        }
        setAllMembers(progressRecords);

        const { data: rolesData, error: rolesError } = await supabase
          .from("user_roles")
          .select("*")
          .eq("role", "user")
          .order("created_at", { ascending: true });

        if (rolesError) throw rolesError;
        setUserRoles(rolesData || []);

        if (rolesData && rolesData.length > 0) {
          const growthData = calculateMemberGrowth(rolesData);
          setMemberGrowthData(growthData);
        }
      } catch (err: any) {
        console.error("Supabase Sync Error:", err.message);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSupabaseData();
  }, []);

  const calculateMemberGrowth = (roles: UserRole[]): MemberGrowthData[] => {
    if (roles.length === 0) return [];

    const dateGroups: { [key: string]: number } = {};

    roles.forEach((role) => {
      const date = new Date(role.created_at);
      const dateKey = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      dateGroups[dateKey] = (dateGroups[dateKey] || 0) + 1;
    });

    const sortedDates = Object.keys(dateGroups).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });

    let cumulativeCount = 0;
    const growthData: MemberGrowthData[] = sortedDates.map((date) => {
      const newMembers = dateGroups[date];
      cumulativeCount += newMembers;

      return {
        date,
        count: cumulativeCount,
        newMembers,
      };
    });

    if (growthData.length > 30) {
      return aggregateByWeek(roles);
    }

    return growthData;
  };

  const aggregateByWeek = (roles: UserRole[]): MemberGrowthData[] => {
    const weekGroups: { [key: string]: { count: number; newMembers: number } } =
      {};

    let cumulativeCount = 0;
    const sortedRoles = [...roles].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    sortedRoles.forEach((role) => {
      const date = new Date(role.created_at);
      const monday = new Date(date);
      monday.setDate(date.getDate() - date.getDay() + 1);
      const weekKey = monday.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      cumulativeCount++;

      if (!weekGroups[weekKey]) {
        weekGroups[weekKey] = { count: 0, newMembers: 0 };
      }
      weekGroups[weekKey].count = cumulativeCount;
      weekGroups[weekKey].newMembers++;
    });

    return Object.entries(weekGroups).map(([date, data]) => ({
      date,
      count: data.count,
      newMembers: data.newMembers,
    }));
  };

  const memberGrowthStats = useMemo(() => {
    if (userRoles.length === 0)
      return { total: 0, thisMonth: 0, thisWeek: 0, growthRate: 0 };

    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const thisMonthMembers = userRoles.filter(
      (role) => new Date(role.created_at) >= oneMonthAgo,
    ).length;

    const thisWeekMembers = userRoles.filter(
      (role) => new Date(role.created_at) >= oneWeekAgo,
    ).length;

    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const lastMonthMembers = userRoles.filter((role) => {
      const createdAt = new Date(role.created_at);
      return createdAt >= twoMonthsAgo && createdAt < oneMonthAgo;
    }).length;

    const growthRate =
      lastMonthMembers > 0
        ? Math.round(
          ((thisMonthMembers - lastMonthMembers) / lastMonthMembers) * 100,
        )
        : 100;

    return {
      total: userRoles.length,
      thisMonth: thisMonthMembers,
      thisWeek: thisWeekMembers,
      growthRate,
    };
  }, [userRoles]);

  const stats = useMemo(() => {
    return [
      {
        title: "Total Members",
        value: memberGrowthStats.total,
        change: `+${memberGrowthStats.growthRate}%`,
        icon: Users,
      },
      {
        title: "New This Month",
        value: memberGrowthStats.thisMonth,
        change: `${memberGrowthStats.thisWeek} this week`,
        icon: TrendingUp,
      },
    ];
  }, [memberGrowthStats]);

  //const calculateProgress = (member: any) => {
  //  const { start_weight, target_weight, current_weight, progress_percentage } =
  //    member;

  //  if (start_weight && target_weight && current_weight) {
  //    const totalDist = Math.abs(start_weight - target_weight);
      //const actualDist = Math.abs(start_weight - current_weight);
     // if (totalDist === 0) return 100;
      //return Math.min(Math.round((actualDist / totalDist) * 100), 100);
   // }
    //return progress_percentage || 0;
  //};
  const calculateProgress = (member: any) => {
  return member.weight_kg ? Math.round(member.weight_kg) : 0;
};

  if (isLoading) {
    return (
      <>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#71D0F7]" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Progress"
        description="Global member analytics and growth tracking synced from Supabase."
      />

      {/* Aggregate Cards */}
      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className="bg-white border border-white/90 shadow-[5px_5px_14px_rgba(168,190,185,0.25),-4px_-4px_12px_rgba(255,255,255,0.95)] rounded-[26px]"
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-semibold text-foreground tracking-tight leading-none mt-1.5">
                    {stat.value.toLocaleString()}
                  </p>
                  {stat.change && (
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-2">
                      {stat.change}
                    </p>
                  )}
                </div>
                <div className="bg-primary/10 rounded-xl p-2.5 shrink-0">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Member Growth Chart */}
        <Card className="bg-white border border-white/90 shadow-[6px_6px_20px_rgba(145,170,165,0.2),-4px_-4px_14px_rgba(255,255,255,0.95)] rounded-[28px] overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#E2ECE9] text-[#08B594] border border-white/60 shadow-[inset_1.5px_1.5px_3px_rgba(165,185,180,0.45),inset_-1.5px_-1.5px_3px_rgba(255,255,255,0.85)] flex items-center justify-center shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-[18px] font-bold text-[#0F172A]">
                  Member Growth
                </CardTitle>
                <p className="text-xs font-medium text-[#7186A0]">
                  Total members with 'user' role over time
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {memberGrowthData.length === 0 ? (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-[#E2ECE9] bg-[#F4F9F8] shadow-[inset_2px_2px_5px_rgba(165,185,180,0.15)]">
                <div className="text-center">
                  <p className="text-[#7186A0] font-semibold text-sm">
                    No growth data available yet.
                  </p>
                  <p className="text-xs text-[#7186A0]/70 mt-1">
                    Charts will render as members join.
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={memberGrowthData} margin={{ top: 6, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient
                        id="memberGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#08B594"
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="95%"
                          stopColor="#08B594"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#E2ECE9"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      stroke="#8899A6"
                      tick={{
                        fill: "#7186A0",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#8899A6"
                      tick={{
                        fill: "#7186A0",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid rgba(255,255,255,0.9)",
                        borderRadius: "16px",
                        color: "#0F172A",
                        boxShadow: "6px 6px 18px rgba(145,170,165,0.22), -3px -3px 10px rgba(255,255,255,0.95)",
                      }}
                      labelStyle={{ color: "#0F172A", fontWeight: 700 }}
                      formatter={(value: any, name: string) => {
                        if (name === "count") return [value, "Total Members"];
                        if (name === "newMembers")
                          return [value, "New Members"];
                        return [value, name];
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#08B594"
                      strokeWidth={3}
                      fill="url(#memberGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Growth Rate Trends Chart */}
        <Card className="bg-white border border-white/90 shadow-[6px_6px_20px_rgba(145,170,165,0.2),-4px_-4px_14px_rgba(255,255,255,0.95)] rounded-[28px] overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#E6F7F3] text-[#0D9488] border border-white/60 shadow-[inset_1.5px_1.5px_3px_rgba(165,185,180,0.45),inset_-1.5px_-1.5px_3px_rgba(255,255,255,0.85)] flex items-center justify-center shrink-0">
                <LineChart className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-[18px] font-bold text-[#0F172A]">
                  Growth Rate Trends
                </CardTitle>
                <p className="text-xs font-medium text-[#7186A0]">
                  New member signups per period
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {memberGrowthData.length === 0 ? (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-[#E2ECE9] bg-[#F4F9F8] shadow-[inset_2px_2px_5px_rgba(165,185,180,0.15)]">
                <div className="text-center">
                  <p className="text-[#7186A0] font-semibold text-sm">
                    No growth data available yet.
                  </p>
                  <p className="text-xs text-[#7186A0]/70 mt-1">
                    Charts will render as members join.
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={memberGrowthData} margin={{ top: 6, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#E2ECE9"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      stroke="#8899A6"
                      tick={{
                        fill: "#7186A0",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#8899A6"
                      tick={{
                        fill: "#7186A0",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid rgba(255,255,255,0.9)",
                        borderRadius: "16px",
                        color: "#0F172A",
                        boxShadow: "6px 6px 18px rgba(145,170,165,0.22), -3px -3px 10px rgba(255,255,255,0.95)",
                      }}
                      formatter={(value: any) => [value, "New Members"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="newMembers"
                      stroke="#08B594"
                      strokeWidth={3}
                      dot={{ fill: "#08B594", r: 4, strokeWidth: 2, stroke: "#FFFFFF" }}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mt-6">
        <Card className="bg-white border border-white/90 shadow-[6px_6px_20px_rgba(145,170,165,0.2),-4px_-4px_14px_rgba(255,255,255,0.95)] rounded-[28px] overflow-hidden">
          <CardHeader className="p-4 sm:p-5 pb-3 border-b border-[#E2ECE9]/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E6F7F3] to-[#D1F2EA] text-[#07AC7D] border border-[#BEE7DC] shadow-[2px_2px_5px_rgba(165,185,180,0.18),-1.5px_-1.5px_4px_rgba(255,255,255,0.9)] flex items-center justify-center shrink-0">
                  <Target className="w-4 h-4 text-[#07AC7D]" />
                </div>
                <div>
                  <CardTitle className="text-[17px] font-bold text-[#0F172A]">Member Goal Progress</CardTitle>
                  <p className="text-[11px] font-semibold text-[#7186A0]">Top client target tracking</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-2">
            <div className="space-y-3">
              {allMembers.length === 0 ? (
                <div className="text-center py-8 rounded-2xl bg-[#F8FBFA] border border-[#E2ECE9] text-[#7186A0] text-xs font-semibold">
                  No records found in progress_records table.
                </div>
              ) : (
                allMembers.slice(0, 5).map((member) => {
                  const progressValue = calculateProgress(member);
                  const rawName = member.profiles?.full_name || member.user_name || "Member";
                  const memberName = typeof rawName === "string" ? rawName : "Member";
                  const initial = (memberName.charAt(0) || "M").toUpperCase();
                  return (
                    <div
                      key={member.id}
                      className="p-3 sm:p-3.5 rounded-2xl bg-[#F8FBFA] border border-[#E2ECE9]/80 shadow-[2px_2px_6px_rgba(165,185,180,0.12),-1.5px_-1.5px_5px_rgba(255,255,255,0.9)] hover:shadow-[3px_3px_8px_rgba(165,185,180,0.18)] transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E6F7F3] to-[#D1F2EA] border border-[#BEE7DC] text-[#07AC7D] font-black text-xs flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_3px_rgba(165,185,180,0.15)]">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-[#0F172A] truncate">
                              {memberName}
                            </p>
                            <span className="text-[10.5px] font-semibold text-[#7186A0] bg-white px-2 py-0.5 rounded-md border border-[#DCE8E5] shadow-[1px_1px_2px_rgba(165,185,180,0.1)] inline-block mt-0.5">
                              Weight: {member.weight_kg || "--"} kg
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0">
                          <span className="text-xs font-bold text-[#07AC7D] bg-[#E6F7F3] border border-[#BEE7DC] px-2.5 py-1 rounded-full shadow-[1px_1px_2px_rgba(165,185,180,0.08)]">
                            {progressValue}%
                          </span>
                        </div>
                      </div>

                      {/* 3D Recessed Progress Track */}
                      <div className="h-2.5 w-full rounded-full bg-[#E2ECE9] shadow-[inset_1.5px_1.5px_3px_rgba(165,185,180,0.4),inset_-1.5px_-1.5px_3px_rgba(255,255,255,0.85)] p-0.5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#0CC194] to-[#07AC7D] shadow-[0_0_6px_rgba(8,181,148,0.4)] transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, progressValue))}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <AdminClientProgress />
    </>
  );
}