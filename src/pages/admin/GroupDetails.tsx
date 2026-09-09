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
      const { data: allUsers } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .eq("is_admin", false)
        .not("user_id", "in", `(${memberIds.join(",")})`);

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

      // Calculate stats
      const totalMembers = formattedMembers.length;
      const avgCompletion = Math.floor(Math.random() * 30) + 70; // Placeholder
      const avgWeightLoss = (Math.random() * 5 + 1).toFixed(1);
      const completedCheckins = Math.floor(Math.random() * totalMembers);
      
      setStats({
        totalMembers,
        avgCompletion,
        avgWeightLoss: parseFloat(avgWeightLoss),
        completedCheckins,
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
  <div className="space-y-6">
    <PageHeader
      title={group.name}
      description={`Coach: ${group.coach_name}`}
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

    {/* Stats Grid */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="bg-card border border-border shadow-sm rounded-2xl">
        <CardContent className="p-5">
          <p className="text-sm font-medium text-muted-foreground">Total Members</p>
          <p className="text-2xl font-semibold text-foreground tracking-tight leading-none mt-1.5">{stats.totalMembers}</p>
        </CardContent>
      </Card>
      <Card className="bg-card border border-border shadow-sm rounded-2xl">
        <CardContent className="p-5">
          <p className="text-sm font-medium text-muted-foreground">Avg Completion</p>
          <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 tracking-tight leading-none mt-1.5">{stats.avgCompletion}%</p>
        </CardContent>
      </Card>
      <Card className="bg-card border border-border shadow-sm rounded-2xl">
        <CardContent className="p-5">
          <p className="text-sm font-medium text-muted-foreground">Avg Weight Loss</p>
          <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 tracking-tight leading-none mt-1.5">{stats.avgWeightLoss} kg</p>
        </CardContent>
      </Card>
      <Card className="bg-card border border-border shadow-sm rounded-2xl">
        <CardContent className="p-5">
          <p className="text-sm font-medium text-muted-foreground">Check-ins</p>
          <p className="text-2xl font-semibold text-foreground tracking-tight leading-none mt-1.5">
            {stats.completedCheckins}/{stats.totalCheckins}
          </p>
        </CardContent>
      </Card>
    </div>

    {/* Members Section */}
    <Card className="bg-card border border-border shadow-sm rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-[20px] font-semibold text-foreground flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Members ({group.members.length})
        </CardTitle>
        <Button
          onClick={() => setIsAssignOpen(true)}
          className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          Add Member
        </Button>
      </CardHeader>
      <CardContent>
        {group.members.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground text-sm">
            No members in this group yet.
          </p>
        ) : (
          <div className="space-y-2">
            {group.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border hover:bg-muted/60 transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{member.full_name}</p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 rounded-lg transition-colors"
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
      <DialogContent className="bg-card border border-border shadow-xl rounded-2xl max-w-md text-foreground">
        <DialogHeader>
          <DialogTitle className="text-[18px] font-semibold text-foreground">Add Member to Group</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Select User</p>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="bg-card border border-input text-foreground rounded-xl">
                <SelectValue placeholder="Choose a user..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border shadow-md rounded-xl">
                {availableUsers.length === 0 ? (
                  <SelectItem value="none" disabled className="text-muted-foreground">
                    No available users
                  </SelectItem>
                ) : (
                  availableUsers.map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      {u.full_name} ({u.email})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setIsAssignOpen(false)}
            className="rounded-xl border-border text-foreground hover:bg-muted"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssignUser}
            disabled={!selectedUser}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add to Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
);
}