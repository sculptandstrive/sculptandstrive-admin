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
        .maybeSingle();
      
      setGroupName(groupData?.name || "Group");

      // Fetch group members
      const { data: membersData } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", id);

      const memberUserIds = (membersData || []).map((m: any) => m.user_id);
      let profileMap = new Map();
      let calculatedMembers: MemberProgress[] = [];

      if (memberUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", memberUserIds);
        if (profilesData) {
          profileMap = new Map(profilesData.map((p: any) => [p.user_id, p.full_name]));
        }

        // Fetch workout progress for all members
        const { data: progressData } = await supabase
          .from("workout_progress")
          .select("user_id, completed, progress_percentage")
          .in("user_id", memberUserIds);

        // Fetch starting measurements and checkins for weight calculation
        const { data: startingData } = await supabase
          .from("starting_measurements")
          .select("user_id, weight")
          .in("user_id", memberUserIds);

        const { data: checkinData } = await supabase
          .from("weekly_checkins")
          .select("user_id, weight, created_at")
          .in("user_id", memberUserIds)
          .order("created_at", { ascending: true });

        // Fetch session assignments for attendance
        const { data: sessionData } = await supabase
          .from("session_assignments")
          .select("user_id, status")
          .in("user_id", memberUserIds);

        // Calculate metrics per member
        calculatedMembers = memberUserIds.map((uid: string) => {
          const userProgress = (progressData || []).filter((p: any) => p.user_id === uid);
          const completion = userProgress.length > 0
            ? Math.round(
                userProgress.reduce((acc: number, curr: any) => acc + (curr.completed ? 100 : (curr.progress_percentage || 0)), 0) /
                userProgress.length
              )
            : 0;

          const startWeightRow = (startingData || []).find((s: any) => s.user_id === uid);
          const userCheckins = (checkinData || []).filter((c: any) => c.user_id === uid);
          const latestCheckin = userCheckins.length > 0 ? userCheckins[userCheckins.length - 1] : null;

          let weightDelta = "0.0";
          if (startWeightRow && latestCheckin && Number(startWeightRow.weight) > 0) {
            const diff = Number(latestCheckin.weight) - Number(startWeightRow.weight);
            weightDelta = diff.toFixed(1);
          }

          const userSessions = (sessionData || []).filter((s: any) => s.user_id === uid);
          const attendanceRate = userSessions.length > 0
            ? Math.round(
                (userSessions.filter((s: any) => s.status === "attended" || s.status === "confirmed" || s.status === "accepted").length /
                  userSessions.length) * 100
              )
            : (userCheckins.length > 0 ? 100 : 0);

          const nutritionAdherence = userCheckins.length > 0 ? 85 : (completion > 50 ? 75 : 50);

          let recovery = "Good";
          if (completion >= 80) recovery = "Excellent";
          else if (completion >= 50) recovery = "Good";
          else if (completion > 0) recovery = "Moderate";
          else recovery = "Needs Work";

          return {
            id: uid,
            user_id: uid,
            full_name: profileMap.get(uid) || "Unknown",
            workout_completion: completion,
            weight_change: weightDelta,
            nutrition_adherence: nutritionAdherence,
            attendance: attendanceRate,
            recovery_status: recovery,
          };
        });
      }

      setMembers(calculatedMembers);

      // Calculate overall stats
      const total = calculatedMembers.length;
      if (total > 0) {
        const avgComp = calculatedMembers.reduce((a, b) => a + b.workout_completion, 0) / total;
        const totalWeight = calculatedMembers.reduce((a, b) => a + (parseFloat(b.weight_change) < 0 ? Math.abs(parseFloat(b.weight_change)) : 0), 0);
        const avgAtt = calculatedMembers.reduce((a, b) => a + b.attendance, 0) / total;
        const top = calculatedMembers.reduce((a, b) =>
          a.workout_completion >= b.workout_completion ? a : b
        );

        setGroupStats({
          avgCompletion: Math.round(avgComp),
          totalWeightLoss: Math.round(totalWeight * 10) / 10,
          avgAttendance: Math.round(avgAtt),
          topPerformer: top.full_name,
        });
      } else {
        setGroupStats({
          avgCompletion: 0,
          totalWeightLoss: 0,
          avgAttendance: 0,
          topPerformer: "N/A",
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
        <CardContent className="p-5">
          <p className="text-sm font-medium text-muted-foreground">Avg Completion</p>
          <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 tracking-tight leading-none mt-1.5">{groupStats.avgCompletion}%</p>
          <Progress value={groupStats.avgCompletion} className="h-1.5 bg-muted mt-2.5" />
        </CardContent>
      </Card>
      <Card className="bg-card border border-border shadow-sm rounded-2xl">
        <CardContent className="p-5">
          <p className="text-sm font-medium text-muted-foreground">Total Weight Loss</p>
          <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 tracking-tight leading-none mt-1.5">{groupStats.totalWeightLoss} kg</p>
        </CardContent>
      </Card>
      <Card className="bg-card border border-border shadow-sm rounded-2xl">
        <CardContent className="p-5">
          <p className="text-sm font-medium text-muted-foreground">Avg Attendance</p>
          <p className="text-2xl font-semibold text-foreground tracking-tight leading-none mt-1.5">{groupStats.avgAttendance}%</p>
        </CardContent>
      </Card>
      <Card className="bg-card border border-border shadow-sm rounded-2xl">
        <CardContent className="p-5">
          <p className="text-sm font-medium text-muted-foreground">Top Performer</p>
          <p className="text-xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1.5 truncate leading-none">{groupStats.topPerformer}</p>
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