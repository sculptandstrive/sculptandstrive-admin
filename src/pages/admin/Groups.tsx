import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Plus,
  Search,
  Loader2,
  Trash2,
  Edit2,
  ChevronRight,
  UserPlus,
  Calendar,
  TrendingUp,
  Dumbbell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { NavLink } from "react-router-dom";

interface Group {
  id: string;
  name: string;
  description: string;
  coach_id: string;
  coach_name: string;
  member_count: number;
  created_at: string;
}

export default function Groups() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [selectedCoach, setSelectedCoach] = useState("");
  const [coaches, setCoaches] = useState<any[]>([]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("workout_groups")
        .select(`
          *,
          profiles:coach_id(full_name),
          group_members(count)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((g: any) => ({
        id: g.id,
        name: g.name,
        description: g.description || "",
        coach_id: g.coach_id,
        coach_name: g.profiles?.full_name || "Unassigned",
        member_count: g.group_members?.[0]?.count || 0,
        created_at: g.created_at,
      }));
      setGroups(formatted);
    } catch (error: any) {
      toast({
        title: "Failed to fetch groups",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCoaches = async () => {
    try {
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (roleError || !roleData || roleData.length === 0) {
        setCoaches([]);
        return;
      }

      const coachIds = roleData
        .filter((r: any) => r.role === "coach" || r.role === "trainer" || r.role === "admin")
        .map((r: any) => r.user_id);

      if (coachIds.length === 0) {
        setCoaches([]);
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", coachIds);

      const profileMap = new Map((profileData || []).map((p: any) => [p.user_id, p.full_name]));
      const formattedCoaches = coachIds.map((uid: string) => ({
        user_id: uid,
        full_name: profileMap.get(uid) || "Unknown Coach",
      }));
      setCoaches(formattedCoaches);
    } catch (err) {
      console.error("Error fetching coaches:", err);
      setCoaches([]);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast({
        title: "Group name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("workout_groups")
        .insert({
          name: newGroupName,
          description: newGroupDescription,
          coach_id: selectedCoach || user?.id,
        })
        .select();

      if (error) throw error;

      toast({
        title: "Group created successfully",
        description: `${newGroupName} is now available`,
      });
      setIsCreateDialogOpen(false);
      setNewGroupName("");
      setNewGroupDescription("");
      setSelectedCoach("");
      fetchGroups();
    } catch (error: any) {
      toast({
        title: "Failed to create group",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm("Delete this group? Members will be removed.")) return;

    try {
      // Delete group members first to avoid FK constraint errors
      await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId);

      const { error } = await supabase
        .from("workout_groups")
        .delete()
        .eq("id", groupId);

      if (error) throw error;

      toast({ title: "Group deleted" });
      fetchGroups();
    } catch (error: any) {
      toast({
        title: "Failed to delete group",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchCoaches();
  }, []);

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.coach_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading)
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
    return (
  <div className="space-y-6">
    <PageHeader
      title="Group Management"
      description="Create and manage workout groups"
    >
      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      >
        <DialogTrigger asChild>
          <Button className="gap-2 bg-gradient-to-r from-[#08B594] via-[#07AB8C] to-[#069D80] text-white shadow-[0_4px_12px_rgba(8,169,130,0.35),inset_0_1px_1px_rgba(255,255,255,0.5)] hover:brightness-105 active:scale-95 rounded-2xl h-10 px-4 font-bold transition-all">
            <Plus className="w-4 h-4" /> Create Group
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-card border border-border shadow-xl rounded-2xl max-w-md text-foreground">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-semibold text-foreground">
              Create New Group
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                Group Name <span className="text-destructive">*</span>
              </p>
              <Input
                placeholder="e.g. Morning Fat Loss"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="bg-card border border-input text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Description</p>
              <Input
                placeholder="Group description..."
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                className="bg-card border border-input text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Coach</p>
              <Select value={selectedCoach} onValueChange={setSelectedCoach}>
                <SelectTrigger className="bg-card border border-input text-foreground rounded-xl">
                  <SelectValue placeholder="Select coach (default: you)" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border shadow-md rounded-xl">
                  {coaches.map((c) => (
                    <SelectItem key={c.user_id} value={c.user_id}>
                      {c.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              className="rounded-xl border-border text-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateGroup}
              disabled={!newGroupName.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageHeader>

    {/* Search Bar */}
    <div className="relative">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7186A0] pointer-events-none" />
      <Input
        placeholder="Search groups by name or coach..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="pl-10 h-11 bg-[#E2ECE9] shadow-[inset_2px_2px_4px_rgba(165,185,180,0.45),inset_-2px_-2px_4px_rgba(255,255,255,0.85)] border-0 text-[#0F172A] font-medium placeholder:text-[#7186A0]/70 rounded-2xl"
      />
    </div>

    {/* Groups Grid */}
    {filteredGroups.length === 0 ? (
      <div className="text-center py-20 bg-card rounded-2xl border border-border shadow-sm">
        <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-muted-foreground text-sm">
          {searchTerm ? "No groups found matching your search" : "No groups created yet"}
        </p>
        <p className="text-muted-foreground/70 text-xs mt-1">
          {!searchTerm && 'Click "Create Group" to get started'}
        </p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredGroups.map((group) => (
          <motion.div
            key={group.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[24px] border border-white/90 shadow-[6px_6px_18px_rgba(130,155,151,0.14),-4px_-4px_14px_rgba(255,255,255,0.95)] hover:shadow-[8px_8px_24px_rgba(130,155,151,0.22),-6px_-6px_20px_rgba(255,255,255,0.98)] transition-all duration-300 overflow-hidden"
          >
            <div className="p-5">
              {/* Header */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0CC194]/15 via-[#08B594]/20 to-[#069D80]/25 border border-white/80 shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.9),2px_2px_5px_rgba(8,169,130,0.12)] flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-[#08B594]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[18px] font-bold text-[#0F172A] truncate">
                      {group.name}
                    </h3>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#7186A0] bg-[#E2ECE9] shadow-[inset_1px_1px_2px_rgba(165,185,180,0.4),inset_-1px_-1px_2px_rgba(255,255,255,0.8)] border border-white/60 px-2.5 py-1 rounded-full">
                  {group.member_count} {group.member_count === 1 ? 'MEMBER' : 'MEMBERS'}
                </span>
              </div>

              {/* Coach */}
              <p className="text-xs text-[#7186A0] mb-4 font-medium">
                Coach: <span className="font-bold text-[#0F172A]">{group.coach_name}</span>
              </p>

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-white/80">
                <span className="text-xs font-semibold text-[#7186A0]">
                  {new Date(group.created_at).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-1.5">
                  <NavLink to={`/admin/groups/${group.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8.5 px-3.5 text-xs font-bold bg-[#F0F7F5] border border-white shadow-[2px_2px_5px_rgba(180,200,196,0.2),-2px_-2px_5px_rgba(255,255,255,0.9)] hover:bg-[#E6F2EE] text-[#08B594] rounded-xl transition-all"
                    >
                      View
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </NavLink>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-[#8899A6] hover:text-red-500 hover:bg-red-50 h-8.5 w-8.5 rounded-xl transition-colors"
                    onClick={() => handleDeleteGroup(group.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    )}
  </div>
);
  
}