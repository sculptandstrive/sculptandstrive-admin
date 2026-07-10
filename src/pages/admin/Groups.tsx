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
    const { data, error } = await supabase
      .from("user_roles")
      .select(`
        user_id,
        profiles:user_id(full_name)
      `)
      .eq("role", "coach");
    if (!error && data) {
      const formattedCoaches = data.map((item: any) => ({
        user_id: item.user_id,
        full_name: item.profiles?.full_name || "Unknown Coach",
      }));
      setCoaches(formattedCoaches);
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
        <Loader2 className="animate-spin text-[#2dd4bf]" />
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
          <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="w-4 h-4" /> Create Group
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-white border-[#F5F7F9] shadow-lg rounded-xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900 text-xl font-bold">
              Create New Group
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Group Name <span className="text-red-400">*</span>
              </p>
              <Input
                placeholder="e.g. Morning Fat Loss"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="bg-[#F5F7F9] border-[#F5F7F9] text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-emerald-500/20"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Description</p>
              <Input
                placeholder="Group description..."
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                className="bg-[#F5F7F9] border-[#F5F7F9] text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-emerald-500/20"
              />
            </div>
            <div className="space-y-2">
              <p>Coach</p>
              <Select value={selectedCoach} onValueChange={setSelectedCoach}>
                <SelectTrigger>
                  <SelectValue placeholder="Select coach (default: you)" />
                </SelectTrigger>
                <SelectContent>
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
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateGroup}
              disabled={!newGroupName.trim()}
              className="bg-emerald-600 text-white"
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
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <Input
        placeholder="Search groups by name or coach..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="pl-10 bg-white border-[#F5F7F9] text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-emerald-500/20"
      />
    </div>

    {/* Groups Grid */}
    {filteredGroups.length === 0 ? (
      <div className="text-center py-20 bg-white rounded-xl border border-[#F5F7F9]">
        <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="text-gray-500 text-sm">
          {searchTerm ? "No groups found matching your search" : "No groups created yet"}
        </p>
        <p className="text-gray-400 text-xs mt-1">
          {!searchTerm && 'Click "Create Group" to get started'}
        </p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGroups.map((group) => (
          <motion.div
            key={group.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-[#F5F7F9] hover:border-emerald-500/30 hover:shadow-lg transition-all duration-200 overflow-hidden"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xl font-semibold text-gray-900 truncate">
                      {group.name}
                    </h4>
                  </div>
                </div>
                <Badge className="bg-[#F5F7F9] text-gray-500 border-none text-[10px] font-medium px-2.5 py-1">
                  {group.member_count}
                </Badge>
              </div>

              {/* Coach */}
              <p className="text-base text-slate-500 mb-4">
                Coach: {group.coach_name}
              </p>

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-[#F5F7F9]">
                <span className="text-sm text-slate-400">
                  {new Date(group.created_at).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-1">
                  <NavLink to={`/admin/groups/${group.id}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-3 text-xs font-medium rounded-lg"
                    >
                      View
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </NavLink>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-300 hover:text-red-500 hover:bg-red-50 h-7 w-7 rounded-lg"
                    onClick={() => handleDeleteGroup(group.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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