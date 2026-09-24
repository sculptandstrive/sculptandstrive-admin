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
      case "Excellent": return "text-[#07AC7D] bg-[#E6F7F3] border-[#BEE7DC]";
      case "Good": return "text-[#16A34A] bg-[#F0FDF4] border-[#BBF7D0]";
      case "Moderate": return "text-[#EA580C] bg-[#FFF7ED] border-[#FFEDD5]";
      default: return "text-[#DC2626] bg-[#FEF2F2] border-[#FECACA]";
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
          className="border-[#DCE8E5] text-[#0F172A] hover:bg-[#F8FBFA] shadow-sm rounded-xl font-semibold"
        >
          <ArrowLeft className="w-4 h-4 mr-2 text-[#7186A0]" />
          Back
        </Button>
      </PageHeader>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border border-white/90 shadow-[5px_5px_16px_rgba(145,170,165,0.18),-3px_-3px_12px_rgba(255,255,255,0.95)] rounded-[24px] overflow-hidden">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-[#7186A0] uppercase tracking-wider">Avg Completion</p>
            <p className="text-2xl font-bold text-[#07AC7D] tracking-tight leading-none mt-2">{groupStats.avgCompletion}%</p>
            {/* Recessed Progress Track */}
            <div className="h-2 w-full rounded-full bg-[#E2ECE9] shadow-[inset_1px_1px_2.5px_rgba(165,185,180,0.4),inset_-1px_-1px_2.5px_rgba(255,255,255,0.8)] mt-3 p-0.5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#0CC194] to-[#07AC7D] transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, groupStats.avgCompletion))}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-white/90 shadow-[5px_5px_16px_rgba(145,170,165,0.18),-3px_-3px_12px_rgba(255,255,255,0.95)] rounded-[24px] overflow-hidden">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-[#7186A0] uppercase tracking-wider">Total Weight Loss</p>
            <p className="text-2xl font-bold text-[#07AC7D] tracking-tight leading-none mt-2">{groupStats.totalWeightLoss} kg</p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-white/90 shadow-[5px_5px_16px_rgba(145,170,165,0.18),-3px_-3px_12px_rgba(255,255,255,0.95)] rounded-[24px] overflow-hidden">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-[#7186A0] uppercase tracking-wider">Avg Attendance</p>
            <p className="text-2xl font-bold text-[#0F172A] tracking-tight leading-none mt-2">{groupStats.avgAttendance}%</p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-white/90 shadow-[5px_5px_16px_rgba(145,170,165,0.18),-3px_-3px_12px_rgba(255,255,255,0.95)] rounded-[24px] overflow-hidden">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-[#7186A0] uppercase tracking-wider">Top Performer</p>
            <p className="text-xl font-bold text-[#07AC7D] mt-2 truncate leading-none">{groupStats.topPerformer}</p>
          </CardContent>
        </Card>
      </div>

      {/* Members Progress Table */}
      <Card className="bg-white border border-white/90 shadow-[6px_6px_20px_rgba(145,170,165,0.2),-4px_-4px_14px_rgba(255,255,255,0.95)] rounded-[28px] overflow-hidden">
        <CardHeader className="px-5 py-4 border-b border-[#E2ECE9]/70 bg-[#F8FBFA]/80 flex flex-row items-center justify-between">
          <CardTitle className="text-base sm:text-[19px] font-bold text-[#0F172A] flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#E6F7F3] border border-[#BEE7DC] text-[#07AC7D] flex items-center justify-center shadow-sm shrink-0">
              <TrendingUp className="w-3.5 h-3.5 text-[#07AC7D]" />
            </div>
            Member Progress Comparison
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2ECE9] bg-[#F8FBFA] text-left text-xs font-bold text-[#7186A0] uppercase tracking-wider">
                  <th className="py-3 px-4">Member</th>
                  <th className="text-center py-3 px-3.5">Workout</th>
                  <th className="text-center py-3 px-3.5">Weight</th>
                  <th className="text-center py-3 px-3.5">Nutrition</th>
                  <th className="text-center py-3 px-3.5">Attendance</th>
                  <th className="text-center py-3 px-3.5">Recovery</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2ECE9]/70">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-[#F8FBFA]/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-sm text-[#0F172A]">{member.full_name}</span>
                    </td>
                    <td className="text-center py-3.5 px-3.5">
                      <span className="text-[#0F172A] font-bold text-sm">{member.workout_completion}%</span>
                      <div className="w-full max-w-[60px] mx-auto mt-1 h-1.5 rounded-full bg-[#E2ECE9] shadow-[inset_1px_1px_2px_rgba(165,185,180,0.35)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#07AC7D]"
                          style={{ width: `${Math.min(100, Math.max(0, member.workout_completion))}%` }}
                        />
                      </div>
                    </td>
                    <td className="text-center py-3.5 px-3.5">
                      <span className={`font-bold text-sm ${parseFloat(member.weight_change) < 0 ? "text-[#07AC7D]" : parseFloat(member.weight_change) === 0 ? "text-[#7186A0]" : "text-[#EF4444]"}`}>
                        {parseFloat(member.weight_change) > 0 ? "+" : ""}{member.weight_change} kg
                      </span>
                    </td>
                    <td className="text-center py-3.5 px-3.5">
                      <span className="text-[#0F172A] font-bold text-sm">{member.nutrition_adherence}%</span>
                    </td>
                    <td className="text-center py-3.5 px-3.5">
                      <span className="text-[#0F172A] font-bold text-sm">{member.attendance}%</span>
                    </td>
                    <td className="text-center py-3.5 px-3.5">
                      <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-[1px_1px_2px_rgba(165,185,180,0.06)] ${getRecoveryColor(member.recovery_status)}`}>
                        {member.recovery_status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {members.length === 0 && (
            <p className="text-center py-8 text-[#7186A0] text-sm font-semibold">No members in this group yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}