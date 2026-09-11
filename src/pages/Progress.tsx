import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  TrendingUp,
  Loader2,
  Users,
  LineChart,
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
            className="border border-border rounded-2xl shadow-sm bg-card"
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

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Member Growth Chart */}
        <Card className="border border-border rounded-2xl shadow-sm bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[18px] font-semibold text-foreground">
              <Users className="h-4 w-4 text-primary" />
              Member Growth
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Total members with 'user' role over time
            </p>
          </CardHeader>
          <CardContent>
            {memberGrowthData.length === 0 ? (
              <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-muted/40">
                <div className="text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground italic">
                    No member data found in user_roles table.
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-2">
                    Members will appear as they sign up.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={memberGrowthData}>
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
                            stopColor="#10B981"
                            stopOpacity={0.25}
                          />
                          <stop
                            offset="95%"
                            stopColor="#10B981"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
                        stroke="hsl(var(--muted-foreground))"
                        tick={{
                          fill: "hsl(var(--muted-foreground))",
                          fontSize: 12,
                        }}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        tick={{
                          fill: "hsl(var(--muted-foreground))",
                          fontSize: 12,
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "12px",
                          color: "hsl(var(--foreground))",
                          boxShadow: "0 4px 18px rgba(0,0,0,0.2)",
                        }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
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
                        stroke="#10B981"
                        strokeWidth={3}
                        fill="url(#memberGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border rounded-2xl shadow-sm bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[18px] font-semibold text-foreground">
              <LineChart className="h-5 w-5 text-primary" />
              Growth Rate Trends
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              New member signups per period
            </p>
          </CardHeader>
          <CardContent>
            {memberGrowthData.length === 0 ? (
              <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-muted/40">
                <div className="text-center">
                  <p className="text-muted-foreground italic">
                    No growth data available yet.
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-2">
                    Charts will render as members join.
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={memberGrowthData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      tick={{
                        fill: "hsl(var(--muted-foreground))",
                        fontSize: 12,
                      }}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      tick={{
                        fill: "hsl(var(--muted-foreground))",
                        fontSize: 12,
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "12px",
                        color: "hsl(var(--foreground))",
                        boxShadow: "0 4px 18px rgba(0,0,0,0.2)",
                      }}
                      formatter={(value: any) => [value, "New Members"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="newMembers"
                      stroke="#10B981"
                      strokeWidth={3}
                      dot={{ fill: "#10B981", strokeWidth: 2 }}
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
        <Card className="border border-border rounded-2xl shadow-sm bg-card">
          <CardHeader>
            <CardTitle className="text-[18px] font-semibold text-foreground">Member Goal Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {allMembers.length === 0 ? (
                <p className="text-center py-10 text-muted-foreground italic">
                  No records found in progress_records table.
                </p>
              ) : (
                allMembers.slice(0, 5).map((member) => {
                  const progressValue = calculateProgress(member);
                  return (
                    <div key={member.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-foreground">
                          {member.profiles?.full_name || member.user_name || "Member"}
                        </p>
                        <span className="text-sm font-medium text-primary">
                          {progressValue}%
                        </span>
                      </div>
                      <Progress value={progressValue} className="h-2 bg-muted [&>div]:bg-primary" />
                     
                      <p className="text-xs text-muted-foreground italic">
  {`Weight: ${member.weight_kg}kg`}
</p>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}