import { useState, useEffect } from "react";
import { useParams, NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users,
  ArrowLeft,
  Loader2,
  Trash2,
  UserPlus,
  Calendar,
  Dumbbell,
  TrendingUp,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";

interface GroupDetail {
  id: string;
  name: string;
  description: string;
  coach_id: string;
  coach_name: string;
  created_at: string;
  members: {
    id: string;
    user_id: string;
    full_name: string;
    email: string;
    joined_at: string;
  }[];
}

export default function GroupDetails() {
  const { id } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalMembers: 0,
    avgCompletion: 0,
    avgWeightLoss: 0,
    completedCheckins: 0,
    totalCheckins: 0,
  });

  const fetchGroup = async () => {
    setLoading(true);
    try {
      const { data: groupData, error: groupErr } = await supabase
        .from("workout_groups")
        .select(`
          *,
          profiles:coach_id(full_name)
        `)
        .eq("id", id)
        .maybeSingle();

      if (groupErr) throw groupErr;

      const { data: members, error: membersErr } = await supabase
        .from("group_members")
        .select(`
          id,
          user_id,
          joined_at,
          profiles:user_id(full_name, email)
        `)
        .eq("group_id", id);

      if (membersErr) throw membersErr;

      // Fetch available users (not in group)
      const memberIds = members?.map((m: any) => m.user_id) || [];
      let query = supabase
        .from("profiles")
        .select("user_id, full_name, email");

      if (memberIds.length > 0) {
        query = query.not("user_id", "in", `(${memberIds.join(",")})`);
      }

      const { data: allUsers } = await query;

      setAvailableUsers(allUsers || []);

      const formattedMembers = (members || []).map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        full_name: m.profiles?.full_name || "Unknown",
        email: m.profiles?.email || "",
        joined_at: m.joined_at,
      }));

      setGroup({
        id: groupData.id,
        name: groupData.name,
        description: groupData.description || "",
        coach_id: groupData.coach_id,
        coach_name: groupData.profiles?.full_name || "Unassigned",
        created_at: groupData.created_at,
        members: formattedMembers,
      });

      // Calculate real stats from database
      const totalMembers = formattedMembers.length;
      let calculatedAvgCompletion = 0;
      let calculatedAvgWeightLoss = 0;
      let calculatedCompletedCheckins = 0;

      if (memberIds.length > 0) {
        // Workout progress
        const { data: progressRows } = await supabase
          .from("workout_progress")
          .select("user_id, completed, progress_percentage")
          .in("user_id", memberIds);

        if (progressRows && progressRows.length > 0) {
          const totalProgress = progressRows.reduce(
            (acc: number, curr: any) => acc + (curr.completed ? 100 : (curr.progress_percentage || 0)),
            0
          );
          calculatedAvgCompletion = Math.round(totalProgress / progressRows.length);
        }

        // Weekly check-ins
        const { data: checkinRows } = await supabase
          .from("weekly_checkins")
          .select("user_id, weight, created_at")
          .in("user_id", memberIds)
          .order("created_at", { ascending: true });

        const { data: startingRows } = await supabase
          .from("starting_measurements")
          .select("user_id, weight")
          .in("user_id", memberIds);

        if (checkinRows && checkinRows.length > 0) {
          const uniqueCheckedUsers = new Set(checkinRows.map((c: any) => c.user_id));
          calculatedCompletedCheckins = uniqueCheckedUsers.size;
        }

        if (checkinRows && checkinRows.length > 0 && startingRows && startingRows.length > 0) {
          const startMap = new Map(startingRows.map((s: any) => [s.user_id, Number(s.weight) || 0]));
          const latestWeightMap = new Map();
          for (const c of checkinRows) {
            latestWeightMap.set(c.user_id, Number(c.weight) || 0);
          }

          let lossSum = 0;
          let countWithLoss = 0;
          for (const [uid, startW] of startMap.entries()) {
            if (latestWeightMap.has(uid) && startW > 0) {
              const currentW = latestWeightMap.get(uid);
              lossSum += (startW - currentW);
              countWithLoss++;
            }
          }

          if (countWithLoss > 0) {
            calculatedAvgWeightLoss = parseFloat((lossSum / countWithLoss).toFixed(1));
          }
        }
      }
      
      setStats({
        totalMembers,
        avgCompletion: calculatedAvgCompletion,
        avgWeightLoss: calculatedAvgWeightLoss,
        completedCheckins: calculatedCompletedCheckins,
        totalCheckins: totalMembers,
      });

    } catch (error: any) {
      toast({
        title: "Failed to load group",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignUser = async () => {
    if (!selectedUser) return;

    try {
      // Check if user is already a member of this group
      const { data: existing } = await supabase
        .from("group_members")
        .select("id")
        .eq("group_id", id)
        .eq("user_id", selectedUser)
        .maybeSingle();

      if (existing) {
        toast({ title: "User is already in this group" });
        setIsAssignOpen(false);
        return;
      }

      const { error } = await supabase
        .from("group_members")
        .insert({ group_id: id, user_id: selectedUser });

      if (error) throw error;

      toast({ title: "User assigned to group" });
      setIsAssignOpen(false);
      setSelectedUser("");
      fetchGroup();
    } catch (error: any) {
      toast({
        title: "Failed to assign user",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (memberId: string, userName: string) => {
    if (!window.confirm(`Remove ${userName} from this group?`)) return;

    try {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      toast({ title: `${userName} removed from group` });
      fetchGroup();
    } catch (error: any) {
      toast({
        title: "Failed to remove member",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchGroup();
  }, [id]);

  if (loading)
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );

  if (!group)
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Group not found</p>
      </div>
    );
return (
  <div className="space-y-5 sm:space-y-6">
    <PageHeader
      title={group.name}
      description={`Coach: ${group.coach_name}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <NavLink to={`/admin/groups/${id}/progress`}>
          <Button
            variant="outline"
            className="gap-2 border border-white/90 bg-white text-[#0F172A] hover:bg-[#F8FAFC] shadow-[3px_3px_8px_rgba(145,170,165,0.15),-2px_-2px_6px_rgba(255,255,255,0.95)] rounded-xl text-xs sm:text-sm font-bold"
          >
            <TrendingUp className="w-4 h-4 text-[#08B594]" />
            View Progress
          </Button>
        </NavLink>
        <Button
          variant="outline"
          onClick={() => window.history.back()}
          className="border border-white/90 bg-white text-[#0F172A] hover:bg-[#F8FAFC] shadow-[3px_3px_8px_rgba(145,170,165,0.15),-2px_-2px_6px_rgba(255,255,255,0.95)] rounded-xl text-xs sm:text-sm font-bold"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5 sm:mr-2" />
          Back
        </Button>
      </div>
    </PageHeader>

    {/* Stats Grid */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      <Card className="rounded-[22px] sm:rounded-2xl bg-white border border-white/90 shadow-[6px_6px_20px_rgba(145,170,165,0.18),-4px_-4px_14px_rgba(255,255,255,0.98)]">
        <CardContent className="p-4 sm:p-5">
          <p className="text-xs sm:text-sm font-bold text-[#7186A0]">Total Members</p>
          <p className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight leading-none mt-2">{stats.totalMembers}</p>
        </CardContent>
      </Card>
      <Card className="rounded-[22px] sm:rounded-2xl bg-white border border-white/90 shadow-[6px_6px_20px_rgba(145,170,165,0.18),-4px_-4px_14px_rgba(255,255,255,0.98)]">
        <CardContent className="p-4 sm:p-5">
          <p className="text-xs sm:text-sm font-bold text-[#7186A0]">Avg Completion</p>
          <p className="text-2xl sm:text-3xl font-black text-[#08B594] tracking-tight leading-none mt-2">{stats.avgCompletion}%</p>
        </CardContent>
      </Card>
      <Card className="rounded-[22px] sm:rounded-2xl bg-white border border-white/90 shadow-[6px_6px_20px_rgba(145,170,165,0.18),-4px_-4px_14px_rgba(255,255,255,0.98)]">
        <CardContent className="p-4 sm:p-5">
          <p className="text-xs sm:text-sm font-bold text-[#7186A0]">Avg Weight Loss</p>
          <p className="text-2xl sm:text-3xl font-black text-[#08B594] tracking-tight leading-none mt-2">{stats.avgWeightLoss} kg</p>
        </CardContent>
      </Card>
      <Card className="rounded-[22px] sm:rounded-2xl bg-white border border-white/90 shadow-[6px_6px_20px_rgba(145,170,165,0.18),-4px_-4px_14px_rgba(255,255,255,0.98)]">
        <CardContent className="p-4 sm:p-5">
          <p className="text-xs sm:text-sm font-bold text-[#7186A0]">Check-ins</p>
          <p className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight leading-none mt-2">
            {stats.completedCheckins}/{stats.totalCheckins}
          </p>
        </CardContent>
      </Card>
    </div>

    {/* Members Section */}
    <Card className="rounded-[26px] bg-white border border-white/90 shadow-[6px_6px_20px_rgba(145,170,165,0.18),-4px_-4px_14px_rgba(255,255,255,0.98)]">
      <CardHeader className="flex flex-row items-center justify-between gap-3 p-4 sm:p-6 pb-2 sm:pb-4">
        <CardTitle className="text-lg sm:text-xl font-black text-[#0F172A] flex items-center gap-2">
          <Users className="w-5 h-5 text-[#08B594]" />
          <span>Members ({group.members.length})</span>
        </CardTitle>
        <Button
          onClick={() => setIsAssignOpen(true)}
          className="gap-2 bg-gradient-to-r from-[#0CC194] to-[#079975] hover:opacity-95 text-white rounded-xl shadow-[0_3px_10px_rgba(8,169,130,0.35)] shrink-0 text-xs sm:text-sm font-bold h-9 px-3 sm:px-4"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Member</span>
        </Button>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        {group.members.length === 0 ? (
          <p className="text-center py-8 text-[#7186A0] text-sm font-medium">
            No members in this group yet.
          </p>
        ) : (
          <div className="space-y-2.5">
            {group.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8FCFB] border border-white shadow-[2px_2px_6px_rgba(145,170,165,0.12),-1.5px_-1.5px_4px_rgba(255,255,255,0.95)] hover:shadow-[3px_3px_8px_rgba(145,170,165,0.18)] transition-all"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-sm font-bold text-[#0F172A] truncate">{member.full_name}</p>
                  <p className="text-xs font-semibold text-[#7186A0] truncate">{member.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-[#94A3B8] hover:text-[#EF4444] hover:bg-rose-50 h-8 w-8 rounded-xl transition-colors"
                    onClick={() => handleRemoveMember(member.id, member.full_name)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>

    {/* Assign User Dialog */}
    <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
      <DialogContent className="rounded-3xl border border-white bg-white p-6 shadow-[8px_8px_28px_rgba(145,170,165,0.22)] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-[#0F172A]">Assign User to Group</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="rounded-xl border border-white bg-[#F8FCFB] shadow-[inset_1.5px_1.5px_3px_rgba(145,170,165,0.2)]">
              <SelectValue placeholder="Select a user" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border border-white bg-white shadow-[6px_6px_20px_rgba(145,170,165,0.2)]">
              {availableUsers.map((u) => (
                <SelectItem key={u.user_id} value={u.user_id}>
                  {u.full_name} ({u.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setIsAssignOpen(false)}
            className="rounded-xl border border-white bg-white shadow-[2px_2px_6px_rgba(145,170,165,0.15)] font-bold"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssignUser}
            className="rounded-xl bg-gradient-to-r from-[#0CC194] to-[#079975] text-white shadow-[0_3px_10px_rgba(8,169,130,0.35)] font-bold"
          >
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
);
}
