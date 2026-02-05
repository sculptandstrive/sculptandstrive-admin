import { TrendingUp, Target, Award, Scale, LineChart } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const memberProgress = [
  { id: 1, name: "Sarah Mitchell", goal: "Lose 10kg", progress: 75, startWeight: 72, currentWeight: 64.5, targetWeight: 62 },
  { id: 2, name: "James Wilson", goal: "Build Muscle", progress: 60, startWeight: 78, currentWeight: 82, targetWeight: 85 },
  { id: 3, name: "Emily Ross", goal: "Run 5K", progress: 90, milestone: "4.5km achieved" },
  { id: 4, name: "Tom Anderson", goal: "Improve Strength", progress: 45, milestone: "Bench press: 80kg" },
];

const achievements = [
  { title: "Weight Goals Met", value: 234, change: "+12%", icon: Scale },
  { title: "Challenges Completed", value: 1847, change: "+8%", icon: Award },
  { title: "Personal Records", value: 562, change: "+15%", icon: TrendingUp },
  { title: "Goals Active", value: 1235, change: "+5%", icon: Target },
];

export default function ProgressPage() {
  return (
    <DashboardLayout>
      <PageHeader 
        title="Progress" 
        description="Track member progress, goals, and achievements."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {achievements.map((stat) => (
          <Card key={stat.title} className="shadow-card animate-slide-up">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold text-foreground">{stat.value.toLocaleString()}</p>
                  <p className="text-sm text-success font-medium">{stat.change} this month</p>
                </div>
                <div className="p-3 rounded-xl gradient-accent">
                  <stat.icon className="w-6 h-6 text-accent-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-card animate-slide-up">
          <CardHeader>
            <CardTitle className="font-display">Member Goal Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {memberProgress.map((member) => (
                <div key={member.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.goal}</p>
                    </div>
                    <span className="text-lg font-bold text-accent">{member.progress}%</span>
                  </div>
                  <Progress value={member.progress} className="h-2" />
                  {member.currentWeight && (
                    <p className="text-xs text-muted-foreground">
                      {member.startWeight}kg → {member.currentWeight}kg (Target: {member.targetWeight}kg)
                    </p>
                  )}
                  {member.milestone && (
                    <p className="text-xs text-success">{member.milestone}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card animate-slide-up">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <LineChart className="w-5 h-5 text-accent" />
              Progress Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
              <p className="text-muted-foreground">Chart visualization coming soon</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
