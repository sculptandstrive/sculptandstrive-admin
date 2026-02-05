import { HelpCircle, MessageCircle, Book, FileQuestion, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const supportTickets = [
  { id: 1, subject: "Cannot access live session", user: "Sarah M.", status: "open", priority: "high", time: "2 hours ago" },
  { id: 2, subject: "Billing question", user: "James W.", status: "in_progress", priority: "medium", time: "5 hours ago" },
  { id: 3, subject: "App crashes on login", user: "Emily R.", status: "open", priority: "high", time: "1 day ago" },
  { id: 4, subject: "Feature request: Meal reminders", user: "Tom A.", status: "resolved", priority: "low", time: "2 days ago" },
];

const helpResources = [
  { title: "Getting Started Guide", views: 1245, icon: Book },
  { title: "Trainer FAQ", views: 892, icon: FileQuestion },
  { title: "Billing & Subscriptions", views: 654, icon: MessageCircle },
  { title: "Technical Troubleshooting", views: 543, icon: HelpCircle },
];

export default function Support() {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="destructive">Open</Badge>;
      case "in_progress":
        return <Badge className="bg-warning text-warning-foreground">In Progress</Badge>;
      case "resolved":
        return <Badge className="bg-success text-success-foreground">Resolved</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case "medium":
        return <Clock className="w-4 h-4 text-warning" />;
      case "low":
        return <CheckCircle className="w-4 h-4 text-success" />;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <PageHeader 
        title="Support / Help" 
        description="Manage support tickets and help resources."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Tickets</p>
                <p className="text-3xl font-bold text-foreground">23</p>
              </div>
              <div className="p-3 rounded-xl bg-destructive/10">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Response Time</p>
                <p className="text-3xl font-bold text-foreground">2.4h</p>
              </div>
              <div className="p-3 rounded-xl bg-accent/10">
                <Clock className="w-6 h-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolved (Week)</p>
                <p className="text-3xl font-bold text-foreground">47</p>
              </div>
              <div className="p-3 rounded-xl bg-success/10">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-card animate-slide-up">
          <CardHeader>
            <CardTitle className="font-display">Recent Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {supportTickets.map((ticket) => (
                <div 
                  key={ticket.id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  {getPriorityIcon(ticket.priority)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{ticket.subject}</p>
                    <p className="text-sm text-muted-foreground">{ticket.user} • {ticket.time}</p>
                  </div>
                  {getStatusBadge(ticket.status)}
                  <Button variant="outline" size="sm">View</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card animate-slide-up">
          <CardHeader>
            <CardTitle className="font-display">Help Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {helpResources.map((resource) => (
                <div 
                  key={resource.title}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="p-2 rounded-lg bg-accent/10">
                    <resource.icon className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm">{resource.title}</p>
                    <p className="text-xs text-muted-foreground">{resource.views.toLocaleString()} views</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
