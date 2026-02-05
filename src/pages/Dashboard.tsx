import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  Activity,
  UserCheck,
  Clock,
  BarChart3
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from "recharts";

// Member growth data (last 6 months)
const memberGrowthData = [
  { month: "Aug", members: 2120, newSignups: 180 },
  { month: "Sep", members: 2340, newSignups: 220 },
  { month: "Oct", members: 2480, newSignups: 140 },
  { month: "Nov", members: 2590, newSignups: 110 },
  { month: "Dec", members: 2710, newSignups: 120 },
  { month: "Jan", members: 2847, newSignups: 137 },
];

// Revenue data (last 6 months)
const revenueData = [
  { month: "Aug", revenue: 38500, subscriptions: 28000, sessions: 10500 },
  { month: "Sep", revenue: 41200, subscriptions: 30200, sessions: 11000 },
  { month: "Oct", revenue: 43800, subscriptions: 31500, sessions: 12300 },
  { month: "Nov", revenue: 45100, subscriptions: 32800, sessions: 12300 },
  { month: "Dec", revenue: 44600, subscriptions: 32000, sessions: 12600 },
  { month: "Jan", revenue: 48352, subscriptions: 35000, sessions: 13352 },
];

const recentActivity = [
  { id: 1, user: "Sarah Mitchell", action: "Completed workout session", time: "2 min ago", type: "fitness" },
  { id: 2, user: "James Wilson", action: "Subscribed to Premium", time: "15 min ago", type: "subscription" },
  { id: 3, user: "Coach Maria", action: "Added new HIIT class", time: "32 min ago", type: "session" },
  { id: 4, user: "Tom Anderson", action: "Updated nutrition plan", time: "1 hour ago", type: "nutrition" },
  { id: 5, user: "Emily Ross", action: "Achieved weight goal", time: "2 hours ago", type: "progress" },
];

const topTrainers = [
  { id: 1, name: "Coach Maria", specialty: "HIIT & Cardio", members: 156, rating: 4.9 },
  { id: 2, name: "Coach David", specialty: "Strength Training", members: 142, rating: 4.8 },
  { id: 3, name: "Coach Elena", specialty: "Yoga & Wellness", members: 128, rating: 4.9 },
];

export default function Dashboard() {
  return (
    <DashboardLayout>
      <PageHeader 
        title="Dashboard" 
        description="Welcome back! Here's an overview of your platform."
      >
        <Button className="gradient-accent text-accent-foreground hover:opacity-90 transition-opacity">
          <Calendar className="w-4 h-4 mr-2" />
          View Schedule
        </Button>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Members"
          value="2,847"
          change="+12.5% from last month"
          changeType="positive"
          icon={Users}
        />
        <StatCard
          title="Active Sessions"
          value="124"
          change="23 live now"
          changeType="positive"
          icon={Activity}
        />
        <StatCard
          title="Revenue (MTD)"
          value="$48,352"
          change="+8.2% from last month"
          changeType="positive"
          icon={DollarSign}
        />
        <StatCard
          title="Trainer Requests"
          value="18"
          change="5 pending approval"
          changeType="neutral"
          icon={UserCheck}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2 shadow-card animate-slide-up">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display">Recent Activity</CardTitle>
            <Button variant="ghost" size="sm" className="text-accent hover:text-accent/80">
              View all
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div 
                  key={activity.id} 
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full gradient-accent flex items-center justify-center flex-shrink-0">
                    <Activity className="w-5 h-5 text-accent-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{activity.user}</p>
                    <p className="text-sm text-muted-foreground truncate">{activity.action}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {activity.time}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Trainers */}
        <Card className="shadow-card animate-slide-up">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display">Top Trainers</CardTitle>
            <Button variant="ghost" size="sm" className="text-accent hover:text-accent/80">
              View all
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topTrainers.map((trainer, index) => (
                <div 
                  key={trainer.id} 
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
                      <span className="text-sm font-bold text-primary-foreground">
                        {trainer.name.split(' ')[1][0]}
                      </span>
                    </div>
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-xs font-bold rounded-full flex items-center justify-center">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{trainer.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{trainer.specialty}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">{trainer.members}</p>
                    <p className="text-xs text-muted-foreground">members</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Overview */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-card animate-slide-up">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-accent" />
              Member Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={memberGrowthData}>
                  <defs>
                    <linearGradient id="memberGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="signupGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="month" 
                    className="text-xs fill-muted-foreground"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs fill-muted-foreground"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="members" 
                    name="Total Members"
                    stroke="hsl(var(--accent))" 
                    fill="url(#memberGradient)"
                    strokeWidth={2}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="newSignups" 
                    name="New Signups"
                    stroke="hsl(var(--primary))" 
                    fill="url(#signupGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card animate-slide-up">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              Revenue Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="month" 
                    className="text-xs fill-muted-foreground"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs fill-muted-foreground"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                  />
                  <Legend />
                  <Bar 
                    dataKey="subscriptions" 
                    name="Subscriptions"
                    fill="hsl(var(--accent))" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="sessions" 
                    name="Sessions"
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
