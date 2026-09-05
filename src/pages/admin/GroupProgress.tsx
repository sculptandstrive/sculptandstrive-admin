import { useState, useEffect } from "react";
import { useParams, NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users,
  ArrowLeft,
  Loader2,
  TrendingUp,
  Dumbbell,
  Calendar,
  Award,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";

interface MemberProgress {
  id: string;
  user_id: string;
  full_name: string;
  workout_completion: number;
  weight_change: string;
  nutrition_adherence: number;
  attendance: number;
  recovery_status: string;
}

export default function GroupProgress() {
  const { id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState("");
  const [members, setMembers] = useState<MemberProgress[]>([]);
  const [groupStats, setGroupStats] = useState({
    avgCompletion: 0,
    totalWeightLoss: 0,
    avgAttendance: 0,
    topPerformer: "",
  });

  const fetchProgress = async () => {
    setLoading(true);
    try {
      // Fetch group details
      const { data: groupData } = await supabase
        .from("workout_groups")
        .select("name")
        .eq("id", id)
        .single();
      
      setGroupName(groupData?.name || "Group");

      // Fetch members with progress (mock data for now)
      const { data: membersData } = await supabase
        .from("group_members")
        .select(`
          user_id,
          profiles:user_id(full_name)
        `)
        .eq("group_id", id);

      const mockProgress: MemberProgress[] = (membersData || []).map((m: any, i: number) => ({
        id: m.user_id,
        user_id: m.user_id,
        full_name: m.profiles?.full_name || "Unknown",
        workout_completion: Math.floor(Math.random() * 40) + 60,
        weight_change: (Math.random() * 6 - 2).toFixed(1),
        nutrition_adherence: Math.floor(Math.random() * 40) + 60,
        attendance: Math.floor(Math.random() * 30) + 70,
        recovery_status: ["Excellent", "Good", "Moderate", "Needs Work"][
          Math.floor(Math.random() * 4)
        ],
      }));

      setMembers(mockProgress);

      // Calculate stats
      const total = mockProgress.length;
      if (total > 0) {
        const avgComp = mockProgress.reduce((a, b) => a + b.workout_completion, 0) / total;
        const totalWeight = mockProgress.reduce((a, b) => a + parseFloat(b.weight_change), 0);
        const avgAtt = mockProgress.reduce((a, b) => a + b.attendance, 0) / total;
        const top = mockProgress.reduce((a, b) => 
          a.workout_completion > b.workout_completion ? a : b
        );

        setGroupStats({
          avgCompletion: Math.round(avgComp),
          totalWeightLoss: Math.round(totalWeight * 10) / 10,
          avgAttendance: Math.round(avgAtt),
          topPerformer: top.full_name,
        });
      }

    } catch (error: any) {
      toast({
        title: "Failed to load progress data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, [id]);

  if (loading)
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );

  const getRecoveryColor = (status: string) => {
    switch (status) {
      case "Excellent": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "Good": return "text-green-400 bg-green-500/10 border-green-500/20";
      case "Moderate": return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      default: return "text-destructive bg-destructive/10 border-destructive/20";
    }
  };
return (
  <div className="space-y-6">
    <PageHeader
      title="Group Progress"
      description={`${groupName} · ${members.length} members`}
    >
      <Button
        variant="outline"
        onClick={() => window.history.back()}
        className="border-border text-foreground hover:bg-muted shadow-sm rounded-xl"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>
    </PageHeader>

    {/* Stats Summary */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="bg-card border border-border shadow-sm rounded-2xl">
        <CardContent className="pt-6">
          <p className="text-sm font-medium text-muted-foreground">Avg Completion</p>
          <p className="text-[30px] sm:text-[32px] font-bold text-emerald-500 mt-1">{groupStats.avgCompletion}%</p>
          <Progress value={groupStats.avgCompletion} className="h-1.5 bg-muted mt-2" />
        </CardContent>
      </Card>
      <Card className="bg-card border border-border shadow-sm rounded-2xl">
        <CardContent className="pt-6">
          <p className="text-sm font-medium text-muted-foreground">Total Weight Loss</p>
          <p className="text-[30px] sm:text-[32px] font-bold text-emerald-500 mt-1">{groupStats.totalWeightLoss} kg</p>
        </CardContent>
      </Card>
      <Card className="bg-card border border-border shadow-sm rounded-2xl">
        <CardContent className="pt-6">
          <p className="text-sm font-medium text-muted-foreground">Avg Attendance</p>
          <p className="text-[30px] sm:text-[32px] font-bold text-foreground mt-1">{groupStats.avgAttendance}%</p>
        </CardContent>
      </Card>
      <Card className="bg-card border border-border shadow-sm rounded-2xl">
        <CardContent className="pt-6">
          <p className="text-sm font-medium text-muted-foreground">Top Performer</p>
          <p className="text-[20px] font-bold text-emerald-500 mt-1 truncate">{groupStats.topPerformer}</p>
        </CardContent>
      </Card>
    </div>

    {/* Members Progress Table */}
    <Card className="bg-card border border-border shadow-sm rounded-2xl">
      <CardHeader>
        <CardTitle className="text-[20px] font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Member Progress Comparison
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left py-3 px-3 text-xs text-muted-foreground font-semibold uppercase tracking-wider">Member</th>
                <th className="text-center py-3 px-3 text-xs text-muted-foreground font-semibold uppercase tracking-wider">Workout</th>
                <th className="text-center py-3 px-3 text-xs text-muted-foreground font-semibold uppercase tracking-wider">Weight</th>
                <th className="text-center py-3 px-3 text-xs text-muted-foreground font-semibold uppercase tracking-wider">Nutrition</th>
                <th className="text-center py-3 px-3 text-xs text-muted-foreground font-semibold uppercase tracking-wider">Attendance</th>
                <th className="text-center py-3 px-3 text-xs text-muted-foreground font-semibold uppercase tracking-wider">Recovery</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b border-border hover:bg-muted/50 transition-all">
                  <td className="py-3 px-3">
                    <span className="font-medium text-foreground">{member.full_name}</span>
                  </td>
                  <td className="text-center py-3 px-3">
                    <span className="text-foreground font-bold">{member.workout_completion}%</span>
                    <div className="w-full max-w-[60px] mx-auto mt-1">
                      <Progress value={member.workout_completion} className="h-1 bg-muted" />
                    </div>
                  </td>
                  <td className="text-center py-3 px-3">
                    <span className={`font-bold ${parseFloat(member.weight_change) < 0 ? "text-emerald-500" : "text-destructive"}`}>
                      {parseFloat(member.weight_change) < 0 ? "" : "+"}{member.weight_change} kg
                    </span>
                  </td>
                  <td className="text-center py-3 px-3">
                    <span className="text-foreground font-bold">{member.nutrition_adherence}%</span>
                  </td>
                  <td className="text-center py-3 px-3">
                    <span className="text-foreground font-bold">{member.attendance}%</span>
                  </td>
                  <td className="text-center py-3 px-3">
                    <Badge variant="outline" className={`text-[10px] ${getRecoveryColor(member.recovery_status)}`}>
                      {member.recovery_status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {members.length === 0 && (
          <p className="text-center py-8 text-muted-foreground text-sm">No members in this group yet.</p>
        )}
      </CardContent>
    </Card>
  </div>
);
}