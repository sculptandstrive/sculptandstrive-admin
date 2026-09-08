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
        profiles (
          full_name
        )
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
          <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-sm">
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
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        placeholder="Search groups by name or coach..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="pl-10 bg-card border border-input text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 shadow-sm rounded-xl"
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
            className="bg-card rounded-2xl border border-border shadow-sm hover:border-primary/40 hover:shadow-md transition-all duration-200 overflow-hidden"
          >
            <div className="p-5">
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[18px] font-semibold text-foreground truncate">
                      {group.name}
                    </h3>
                  </div>
                </div>
                <Badge className="bg-muted text-muted-foreground border border-border text-xs font-semibold px-2.5 py-1 rounded-lg">
                  {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                </Badge>
              </div>

              {/* Coach */}
              <p className="text-sm text-muted-foreground mb-4">
                Coach: <span className="font-medium text-foreground">{group.coach_name}</span>
              </p>

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  {new Date(group.created_at).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-1">
                  <NavLink to={`/admin/groups/${group.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-3 text-xs font-medium rounded-lg border-border text-foreground hover:bg-muted"
                    >
                      View
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </NavLink>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-7 w-7 rounded-lg transition-colors"
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