import { Calendar as CalendarIcon, Video, Users as UsersIcon, Clock, Play, Plus } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const upcomingSessions = [
  { id: 1, title: "Morning HIIT Blast", trainer: "Coach Maria", time: "9:00 AM", duration: "45 min", participants: 24, type: "live", status: "upcoming" },
  { id: 2, title: "Yoga Flow", trainer: "Coach Elena", time: "10:30 AM", duration: "60 min", participants: 18, type: "live", status: "upcoming" },
  { id: 3, title: "Strength Foundations", trainer: "Coach David", time: "12:00 PM", duration: "50 min", participants: 32, type: "live", status: "live" },
  { id: 4, title: "Core Conditioning", trainer: "Coach Maria", time: "2:00 PM", duration: "30 min", participants: 15, type: "recorded", status: "upcoming" },
  { id: 5, title: "Evening Cardio", trainer: "Coach David", time: "6:00 PM", duration: "45 min", participants: 28, type: "live", status: "upcoming" },
];

export default function Sessions() {
  return (
    <DashboardLayout>
      <PageHeader 
        title="Sessions" 
        description="Manage live and recorded workout sessions."
      >
        <Button className="gradient-accent text-accent-foreground hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4 mr-2" />
          Add Session
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Live Now</p>
                <p className="text-3xl font-bold text-foreground">3</p>
              </div>
              <div className="p-3 rounded-xl bg-success/10">
                <Video className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Sessions</p>
                <p className="text-3xl font-bold text-foreground">12</p>
              </div>
              <div className="p-3 rounded-xl bg-accent/10">
                <CalendarIcon className="w-6 h-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Participants</p>
                <p className="text-3xl font-bold text-foreground">247</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <UsersIcon className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card animate-slide-up">
        <CardHeader>
          <CardTitle className="font-display">Today's Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {upcomingSessions.map((session) => (
              <div 
                key={session.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center flex-shrink-0">
                  {session.status === "live" ? (
                    <Video className="w-6 h-6 text-accent-foreground animate-pulse" />
                  ) : (
                    <Play className="w-6 h-6 text-accent-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground truncate">{session.title}</p>
                    {session.status === "live" && (
                      <Badge variant="destructive" className="animate-pulse-glow">LIVE</Badge>
                    )}
                    <Badge variant={session.type === "live" ? "default" : "secondary"}>
                      {session.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{session.trainer}</p>
                </div>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {session.time}
                  </div>
                  <div className="flex items-center gap-1">
                    <UsersIcon className="w-4 h-4" />
                    {session.participants}
                  </div>
                  <span className="text-foreground font-medium">{session.duration}</span>
                </div>
                <Button variant="outline" size="sm">
                  View
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
