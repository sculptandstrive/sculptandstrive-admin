import { useMemo, useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  TrendingUp,
  Target,
  Award,
  Scale,
  LineChart,
  Loader2,
  AlertCircle,
  Users,
  Calendar,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);

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

        // Fetch progress records
        const { data: progressData, error: progressError } = await supabase
          .from("progress_records")
          .select("*");

        if (progressError) throw progressError;
        setAllMembers(progressData || []);

        // Fetch user roles (only users with role = 'user')
        const { data: rolesData, error: rolesError } = await supabase
          .from("user_roles")
          .select("*")
          .eq("role", "user")
          .order("created_at", { ascending: true });

        if (rolesError) throw rolesError;
        setUserRoles(rolesData || []);

        // Calculate member growth data
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

  // Calculate member growth over time
  const calculateMemberGrowth = (roles: UserRole[]): MemberGrowthData[] => {
    if (roles.length === 0) return [];

    // Group by date
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

    // Convert to array and calculate cumulative count
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

    // If we have more than 30 data points, aggregate by week
    if (growthData.length > 30) {
      return aggregateByWeek(roles);
    }

    return growthData;
  };

  // Aggregate data by week for better visualization
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
      // Get the Monday of the week
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

  // Calculate growth statistics
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

    // Calculate growth rate (new members this month vs last month)
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

  //  DYNAMIC CALCULATIONS
  const stats = useMemo(() => {
    const goalsMet = allMembers.filter((m) => {
      const start = m.start_weight;
      const current = m.current_weight;
      const target = m.target_weight;

      if (target && start && current) {
        return start > target
          ? current <= target // Weight Loss Met
          : current >= target; // Muscle Gain Met
      }
      return (m.progress_percentage || 0) >= 100;
    }).length;

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
      // {
      //   title: "Weight Goals Met",
      //   value: goalsMet,
      //   change: "+12%",
      //   icon: Scale,
      // },
    ];
  }, [allMembers, memberGrowthStats]);

  const calculateProgress = (member: any) => {
    const { start_weight, target_weight, current_weight, progress_percentage } =
      member;

    if (start_weight && target_weight && current_weight) {
      const totalDist = Math.abs(start_weight - target_weight);
      const actualDist = Math.abs(start_weight - current_weight);
      if (totalDist === 0) return 100;
      return Math.min(Math.round((actualDist / totalDist) * 100), 100);
    }
    return progress_percentage || 0;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Progress"
        description="Global member analytics and growth tracking synced from Supabase."
      />

      {/* Aggregate Cards */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className="shadow-card border-none bg-card/50 backdrop-blur"
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold">
                    {stat.value.toLocaleString()}
                  </p>
                  <p className="text-sm font-medium text-success">
                    {stat.change}
                  </p>
                </div>
                <div className="gradient-accent rounded-xl p-3">
                  <stat.icon className="h-6 w-6 text-accent-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Member Growth Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-accent" />
              Member Growth
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Total members with 'user' role over time
            </p>
          </CardHeader>
          <CardContent>
            {memberGrowthData.length === 0 ? (
              <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/10">
                <div className="text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground italic">
                    No member data found in user_roles table.
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-2">
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
                            stopColor="hsl(var(--accent))"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="hsl(var(--accent))"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--muted-foreground) / 0.2)"
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
                          borderRadius: "8px",
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
                        stroke="hsl(var(--accent))"
                        strokeWidth={3}
                        fill="url(#memberGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Growth Summary */}
                {/* <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Total</p>
                    <p className="text-2xl font-bold text-accent">
                      {memberGrowthStats.total}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">
                      This Month
                    </p>
                    <p className="text-2xl font-bold text-success">
                      +{memberGrowthStats.thisMonth}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">
                      This Week
                    </p>
                    <p className="text-2xl font-bold text-success">
                      +{memberGrowthStats.thisWeek}
                    </p>
                  </div>
                </div> */}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5 text-accent" />
              Growth Rate Trends
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              New member signups per period
            </p>
          </CardHeader>
          <CardContent>
            {memberGrowthData.length === 0 ? (
              <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/10">
                <div className="text-center">
                  <p className="text-muted-foreground italic">
                    No growth data available yet.
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-2">
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
                      stroke="hsl(var(--muted-foreground) / 0.2)"
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
                        borderRadius: "8px",
                      }}
                      formatter={(value: any) => [value, "New Members"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="newMembers"
                      stroke="hsl(var(--accent))"
                      strokeWidth={3}
                      dot={{ fill: "hsl(var(--accent))", strokeWidth: 2 }}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats Row */}
      {/* <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mt-6"> */}
      {/* <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Member Goal Progress</CardTitle>
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
                          <p className="font-medium">
                            {member.user_name || "Member " + member.id}
                          </p>
                          <span className="font-bold text-accent">
                            {progressValue}%
                          </span>
                        </div>
                        <Progress value={progressValue} className="h-2" />
                        <p className="text-xs text-muted-foreground italic">
                          {member.target_weight
                            ? `${member.start_weight}kg → ${member.current_weight}kg (Target: ${member.target_weight}kg)`
                            : member.milestone_note || "Milestone goal"}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card> */}

      {/* Recent Members */}
      {/* <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-accent" />
              Recent Members
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Latest users who joined the platform
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userRoles.length === 0 ? (
                <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/10">
                  <p className="text-center text-muted-foreground italic">
                    No members found in user_roles table.
                  </p>
                </div>
              ) : (
                [...userRoles]
                  .sort(
                    (a, b) =>
                      new Date(b.created_at).getTime() -
                      new Date(a.created_at).getTime(),
                  )
                  .slice(0, 10)
                  .map((role) => {
                    const joinDate = new Date(role.created_at);
                    const now = new Date();
                    const diffInDays = Math.floor(
                      (now.getTime() - joinDate.getTime()) /
                        (1000 * 60 * 60 * 24),
                    );

                    let timeAgo = "";
                    if (diffInDays === 0) {
                      timeAgo = "Today";
                    } else if (diffInDays === 1) {
                      timeAgo = "Yesterday";
                    } else if (diffInDays < 7) {
                      timeAgo = `${diffInDays} days ago`;
                    } else if (diffInDays < 30) {
                      const weeks = Math.floor(diffInDays / 7);
                      timeAgo = `${weeks} week${weeks > 1 ? "s" : ""} ago`;
                    } else {
                      const months = Math.floor(diffInDays / 30);
                      timeAgo = `${months} month${months > 1 ? "s" : ""} ago`;
                    }

                    return (
                      <div
                        key={role.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center">
                            <Users className="w-5 h-5 text-accent-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              User {role.user_id.slice(0, 8)}...
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {timeAgo}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-full font-medium">
                            {role.role}
                          </span>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </CardContent>
        </Card> */}

      {/* Growth Rate Trends */}
      {/* </div> */}
    </DashboardLayout>
  );
}
