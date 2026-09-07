import { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Users as UsersIcon, 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  UserCog, 
  Search, 
  RefreshCw, 
  Loader2, 
  UserPlus, 
  Play,
  CheckCircle,
  Clock,
  XCircle,
  Dumbbell,
  Calendar,
  Trophy,
  Flame,
  Award
} from "lucide-react";
import { format } from "date-fns";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

type AppRole = "admin" | "user" | 'trial_user' | 'coach';

interface UserWithRole {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  role: AppRole;
  coach_id?: string | null;
  coach_name?: string | null;
}


const roleConfig: Record<AppRole, { label: string; color: string; icon: typeof Shield }> = {
  admin: { label: "Admin", color: "bg-destructive/10 text-destructive border-destructive/20", icon: ShieldAlert },
  user: { label: "User", color: "bg-muted text-muted-foreground border-border", icon: UserCog },
  trial_user: { label: 'Trial User', color: "bg-muted text-muted-foreground border-border", icon: UserCog },
  coach: { label: 'Coach', color: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: ShieldCheck }
};

export default function Users() {
  const [isAssignGroupOpen, setIsAssignGroupOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [groups, setGroups] = useState<any[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAssignCoachOpen, setIsAssignCoachOpen] = useState(false);
  const [selectedCoachId, setSelectedCoachId] = useState("");
  const [coachesList, setCoachesList] = useState<any[]>([]);
  const [loadingCoaches, setLoadingCoaches] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [updating, setUpdating] = useState(false);
  const [roleChangeDialog, setRoleChangeDialog] = useState<{
    open: boolean;
    user: UserWithRole | null;
    newRole: AppRole | null;
  }>({ open: false, user: null, newRole: null });

  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<UserWithRole | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileData, setProfileData] = useState<{
    healthHistory: any;
    checkins: any[];
    photos: any[];
    workoutsSummary: {
      totalCount: number;
      completedCount: number;
      totalCalories: number;
    };
    userWorkouts: any[];
    videos: any[];
    videosLoading: boolean;
  } | null>(null);

  const fetchClientProfile = async (userId: string) => {
    try {
      setProfileLoading(true);
      setProfileData(null);

      const [healthRes, checkinsRes, photosRes, workoutsRes, progressRes] = await Promise.all([
        supabase
          .from("health_history")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("weekly_checkins")
          .select("*")
          .eq("user_id", userId)
          .order("checkin_date", { ascending: false }),
        supabase
          .from("progress_photos")
          .select("*")
          .eq("user_id", userId)
          .order("taken_at", { ascending: false }),
        supabase
          .from("workouts")
          .select("id, completed, calories_burned")
          .eq("user_id", userId),
        supabase
          .from("workout_progress")
          .select("id, workout_id, workout_name, scheduled_date, status, duration_minutes, calories_burned, completed_at")
          .eq("user_id", userId)
          .order("scheduled_date", { ascending: false })
          .limit(30),
      ]);

      const workouts = workoutsRes.data || [];
      const progressLogs = progressRes.data || [];
      const completedProgressLogs = progressLogs.filter((p: any) => p.status === "completed");

      const completedCount = completedProgressLogs.length > 0
        ? completedProgressLogs.length
        : workouts.filter((w: any) => w.completed).length;

      const totalCount = Math.max(workouts.length, progressLogs.length);
      const calories = workouts.reduce((sum: number, w: any) => sum + (w.calories_burned || 0), 0);

      setProfileData({
        healthHistory: healthRes.data || null,
        checkins: checkinsRes.data || [],
        photos: photosRes.data || [],
        workoutsSummary: {
          totalCount,
          completedCount,
          totalCalories: calories,
        },
        userWorkouts: progressLogs,
        videos: [],
        videosLoading: true,
      });

      let videosData: any[] = [];
      try {
        const videosRes = await supabase
          .from("tutorials")
          .select("id, title, description, thumbnail_url, video_url_small, video_url_large, duration, category, level, audience, status, is_published, content_type")
          .or("content_type.eq.tutorial,content_type.is.null")
          .eq("status", "published")
          .order("created_at", { ascending: false });
        if (!videosRes.error) {
          videosData = videosData.concat(videosRes.data || []);
        }
      } catch (err) {
        console.error("Error fetching tutorial videos:", err);
      }

      try {
        const playlistLinksRes = await supabase
          .from("tutorial_playlist_videos")
          .select("video_id, tutorial_playlists!inner(audience, is_published)");
        if (!playlistLinksRes.error && playlistLinksRes.data) {
          const allowedIds = new Set(
            (playlistLinksRes.data as any[])
              .filter((row) => {
                const pl = row.tutorial_playlists;
                return pl?.is_published !== false;
              })
              .map((row) => row.video_id)
          );
          videosData = videosData.filter((v) => allowedIds.has(v.id));
        }
      } catch (err) {
        // Fall back to the unfiltered list if the join isn't accessible
      }

      setProfileData((prev) =>
        prev
          ? {
              ...prev,
              videos: videosData,
              videosLoading: false,
            }
          : prev
      );
    } catch (err: any) {
      console.error("Error loading client profile data:", err);
      setProfileData((prev) => (prev ? { ...prev, videosLoading: false } : prev));
    } finally {
      setProfileLoading(false);
    }
  };

  const { toast } = useToast();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const { user: currentUser } = useAuth();

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role")
      ]);

      let coachClientsData: any[] = [];
      try {
        const coachClientsRes = await supabase.from("coach_clients").select("client_id, coach_id").order("created_at", { ascending: false });
        if (!coachClientsRes.error) {
          coachClientsData = coachClientsRes.data || [];
        }
      } catch (err) {
        // Table coach_clients may not exist in schema
      }

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const profileMap = new Map((profilesRes.data || []).map(p => [p.user_id, p.full_name]));
      const rolesMap = new Map((rolesRes.data || []).map(r => [r.user_id, r.role]));
      const coachMap = new Map<string, { id: string; name: string | null }>();

      for (const cc of coachClientsData) {
        if (!coachMap.has(cc.client_id)) {
          const coachName = profileMap.get(cc.coach_id) || null;
          coachMap.set(cc.client_id, { id: cc.coach_id, name: coachName });
        }
      }

      const formattedUsers: UserWithRole[] = (profilesRes.data || []).map((profile) => {
        const coachInfo = coachMap.get(profile.user_id);
        return {
          id: profile.id,
          user_id: profile.user_id,
          email: profile.email,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          created_at: profile.created_at,
          role: (rolesMap.get(profile.user_id) as AppRole) || "trial_user",
          coach_id: coachInfo?.id || null,
          coach_name: coachInfo?.name || null,
        };
      });

      setUsers(formattedUsers);
    } catch (error: any) {
      toast({ title: "Sync Error", description: error.message || "Failed to fetch users", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchCoachesList = async () => {
    setLoadingCoaches(true);
    try {
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "coach");

      if (roleError) throw roleError;

      const coachUserIds = (roleData || []).map((r) => r.user_id);
      if (coachUserIds.length === 0) {
        setCoachesList([]);
        return;
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", coachUserIds);

      if (profilesError) throw profilesError;

      const formatted = (profilesData || []).map((p: any) => ({
        id: p.user_id,
        full_name: p.full_name || "Unknown Coach",
        email: p.email || "",
      }));
      setCoachesList(formatted);
    } catch (error: any) {
      console.error("Error fetching coaches list:", error?.message || error);
    } finally {
      setLoadingCoaches(false);
    }
  };

  const handleDirectAssignCoach = async (clientId: string, coachId: string) => {
    try {
      setAssigning(true);
      const { error: deleteError } = await supabase
        .from("coach_clients")
        .delete()
        .eq("client_id", clientId);

      if (deleteError) throw deleteError;

      if (coachId && coachId !== "none") {
        const { error } = await supabase
          .from("coach_clients")
          .insert({
            coach_id: coachId,
            client_id: clientId,
          });

        if (error) throw error;
        toast({ title: "Success", description: "Coach assigned successfully." });
      } else {
        toast({ title: "Success", description: "Coach unassigned successfully." });
      }

      const assignedCoach = coachesList.find((c) => c.id === coachId);
      const coachName = assignedCoach ? assignedCoach.full_name : null;
      const finalCoachId = coachId === "none" ? null : coachId;

      setUsers((prev) =>
        prev.map((u) => (u.user_id === clientId ? { ...u, coach_id: finalCoachId, coach_name: coachName } : u))
      );

      setSelectedProfileUser((prev) => (prev ? { ...prev, coach_id: finalCoachId, coach_name: coachName } : null));

      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Failed to assign coach",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAssigning(false);
    }
  };

  const fetchGroups = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("workout_groups")
        .select("id, name")
        .order("name", { ascending: true });
      
      if (error) throw error;
      setGroups(data || []);
    } catch (error: any) {
      console.error("Error fetching groups:", error);
    }
  }, []);

  const handleAssignGroup = async () => {
    if (!selectedUserId || !selectedGroupId) return;
    
    setAssigning(true);
    try {
      const { data: existing } = await supabase
        .from("group_members")
        .select("id")
        .eq("user_id", selectedUserId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("group_members")
          .update({ group_id: selectedGroupId })
          .eq("user_id", selectedUserId);

        if (error) throw error;
        toast({ title: "Success", description: "User's group updated." });
      } else {
        const { error } = await supabase
          .from("group_members")
          .insert({ user_id: selectedUserId, group_id: selectedGroupId });

        if (error) throw error;
        toast({ title: "Success", description: "User assigned to group." });
      }

      setIsAssignGroupOpen(false);
      setSelectedUserId("");
      setSelectedGroupId("");
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Failed to assign user",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAssigning(false);
    }
  };
  useEffect(() => {
    if (!isAdmin) return;
    fetchUsers();
    fetchGroups();
    fetchCoachesList();
  }, [isAdmin, fetchUsers, fetchGroups]);

  const filteredUsers = useMemo(() => {
    const term = searchQuery.toLowerCase();
    return users.filter(u =>
      u.full_name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term)
    );
  }, [users, searchQuery]);

  const handleRoleChange = (user: UserWithRole, newRole: AppRole) => {
    if (user.user_id === currentUser?.id) {
      toast({ title: "Restricted", description: "You cannot demote yourself.", variant: "destructive" });
      return;
    }
    if (user.role === 'admin') {
      toast({ title: "Restricted", description: "Admin accounts created in DB cannot be manually changed to user.", variant: "destructive" });
      return;
    }
    setRoleChangeDialog({ open: true, user, newRole });
  };

  const confirmRoleChange = async () => {
    if (!roleChangeDialog.user || !roleChangeDialog.newRole) return;
    if (roleChangeDialog.user.role === 'admin') {
      toast({ title: "Restricted", description: "Admin accounts created in DB cannot be manually changed to user.", variant: "destructive" });
      setRoleChangeDialog({ open: false, user: null, newRole: null });
      return;
    }
    setUpdating(true);
    try {
      const newExpiry = new Date();
      if (roleChangeDialog.newRole === 'user') {
        newExpiry.setDate(newExpiry.getDate() + 29);
      }
      else if (roleChangeDialog.newRole === 'trial_user') {
        newExpiry.setDate(newExpiry.getDate() + 3);
      }
      const { error } = await supabase.from("user_roles").upsert({
        user_id: roleChangeDialog.user.user_id,
        role: roleChangeDialog.newRole,
        expiry_time: newExpiry
      }, { onConflict: "user_id" });

      if (error) throw error;
      setUsers(prev => prev.map(u => u.user_id === roleChangeDialog.user?.user_id ? { ...u, role: roleChangeDialog.newRole! } : u));
      toast({ title: "Success", description: "Role updated." });
    } catch (error: any) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } finally {
      setUpdating(false);
      setRoleChangeDialog({ open: false, user: null, newRole: null });
    }
  };

  if (adminLoading) return <div className="p-4"><Skeleton className="h-64 w-full" /></div>;
  if (!isAdmin) return <div className="p-20 text-center"><ShieldAlert className="mx-auto h-12 w-12 text-destructive/50" /></div>;

  return (
    <>
      <PageHeader title="User Management" description="Real-time access control.">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 bg-card text-xs border-input rounded-xl focus-visible:border-primary focus-visible:ring-primary/20"
          />
        </div>
      </PageHeader>

      <Card className="border border-border rounded-2xl shadow-sm overflow-hidden bg-card">
        <CardHeader className="p-5 border-b border-border flex flex-row items-center justify-between space-y-0 bg-muted/40">
          <CardTitle className="flex items-center gap-2 text-[20px] font-semibold text-foreground">
            <UsersIcon className="w-4 h-4 text-primary" />
            Registry ({filteredUsers.length})
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Filter by name/email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 w-64 text-sm rounded-xl bg-card border-input focus-visible:border-primary focus-visible:ring-primary/20"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-full table-fixed border-collapse">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[200px] pl-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Member Name</TableHead>
                  <TableHead className="w-[250px] text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Address</TableHead>
                  <TableHead className="w-[120px] text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Role</TableHead>
                  <TableHead className="w-[240px] text-right pr-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Management</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/50 border-b border-border last:border-0 transition-colors duration-150">
                    <TableCell className="py-2.5 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                          {(user.full_name?.[0] || user.email?.[0] || "U").toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold text-foreground truncate block max-w-[140px]" title={user.full_name || ""}>
                          {user.full_name || "Unnamed User"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 text-sm text-muted-foreground">
                      <span className="truncate block max-w-[220px]" title={user.email || ""}>
                        {user.email || "not set"}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5 text-center">
                      <Badge variant="outline" className={`${(roleConfig[user.role] || roleConfig.user).color} text-xs px-2 py-0.5 border-none uppercase font-semibold`}>
                        {user.role === 'trial_user' ? 'Trial User' : user.role}
                      </Badge>
                      {user.role === 'user' && (
                        <span className="block text-[11px] text-muted-foreground mt-1 font-medium">
                          Coach: {user.coach_name || "Unassigned"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-2.5 text-right pr-6">
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-28 text-xs font-semibold bg-card border-border text-foreground hover:bg-muted rounded-xl"
                          onClick={() => {
                            setSelectedUserId(user.user_id);
                            setIsAssignGroupOpen(true);
                          }}
                        >
                          <UsersIcon className="w-3.5 h-3.5 mr-1" />
                          Assign Group
                        </Button>

                        
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-28 text-xs font-semibold bg-card border-border text-foreground hover:bg-muted rounded-xl"
                          onClick={() => {
                            setSelectedProfileUser(user);
                            setProfileDialogOpen(true);
                            fetchClientProfile(user.user_id);
                          }}
                        >
                          View Profile
                        </Button>
                        <Select 
                          value={user.role} 
                          onValueChange={(val: AppRole) => handleRoleChange(user, val)} 
                          disabled={user.role === 'admin' || user.user_id === currentUser?.id || updating}
                        >
                          <SelectTrigger className="h-8 w-28 text-xs font-semibold bg-card border-input text-foreground rounded-xl disabled:opacity-75 disabled:cursor-not-allowed focus:border-primary focus:ring-primary/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin" className="text-xs font-semibold text-destructive" disabled>ADMIN</SelectItem>
                            <SelectItem value="user" className="text-xs font-medium">USER</SelectItem>
                            <SelectItem value="trial_user" className="text-xs font-medium">TRIAL USER</SelectItem>
                            <SelectItem value="coach" className="text-xs font-medium text-purple-400">COACH</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      

      {/* ── Assign Group Dialog ── */}
      <Dialog open={isAssignGroupOpen} onOpenChange={setIsAssignGroupOpen}>
        <DialogContent className="rounded-2xl bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-semibold text-foreground">
              Assign User to Group
            </DialogTitle>
            <DialogDescription className="text-sm font-normal text-muted-foreground">
              Select a group to assign this user to.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Select Group</p>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger className="border-input bg-card text-foreground rounded-xl focus:border-primary focus:ring-primary/20">
                  <SelectValue placeholder="Choose a group..." />
                </SelectTrigger>
                <SelectContent>
                  {groups.length === 0 ? (
                    <SelectItem value="none" disabled className="text-muted-foreground">
                      No groups available
                    </SelectItem>
                  ) : (
                    groups.map((g) => (
                      <SelectItem key={g.id} value={g.id} className="hover:bg-primary/10">
                        {g.name}
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
              className="border-border rounded-xl"
              onClick={() => setIsAssignGroupOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignGroup}
              disabled={!selectedGroupId || assigning}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {assigning ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              Assign to Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>





      <AlertDialog open={roleChangeDialog.open} onOpenChange={(o) => !updating && setRoleChangeDialog(prev => ({ ...prev, open: o }))}>
        <AlertDialogContent className="max-w-xs rounded-2xl bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[18px] font-semibold text-foreground">Modify Permissions?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Assign <b className="text-foreground">{roleChangeDialog.newRole?.toUpperCase()}</b> access to this account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel className="text-xs h-8 flex-1 border-border rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange} className="text-xs h-8 flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl">Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Client Profile Dialog ── */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-card border border-border text-foreground rounded-2xl p-5 custom-scrollbar">
          <DialogHeader className="border-b border-border pb-4 mb-4">
            <DialogTitle className="text-[18px] font-semibold flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                {(selectedProfileUser?.full_name?.[0] || selectedProfileUser?.email?.[0] || "U").toUpperCase()}
              </div>
              <div>
                <span className="text-foreground block">{selectedProfileUser?.full_name || "Client Profile"}</span>
                <span className="text-xs text-muted-foreground font-normal">{selectedProfileUser?.email}</span>
              </div>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <span>Joined on {selectedProfileUser?.created_at ? new Date(selectedProfileUser.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</span>
              {selectedProfileUser?.role === 'user' && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">Assign Coach:</span>
                  <Select
                    value={selectedProfileUser?.coach_id || "none"}
                    onValueChange={(coachId) => handleDirectAssignCoach(selectedProfileUser.user_id, coachId)}
                    disabled={assigning}
                  >
                    <SelectTrigger className="h-8 text-xs w-48 bg-card border-input text-foreground font-semibold px-2.5 rounded-xl focus:border-primary focus:ring-primary/20">
                      <SelectValue placeholder="No Coach assigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Unassign)</SelectItem>
                      {coachesList.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          {profileLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground font-medium">Retrieving client record...</p>
            </div>
          ) : !profileData ? (
            <p className="text-center py-20 text-muted-foreground text-sm">Failed to load profile details.</p>
          ) : (
            <div className="space-y-6">
              {/* Stats Summary Panel */}
              <div className="grid grid-cols-3 gap-4 p-4 rounded-2xl bg-muted/40 border border-border">
                <div className="text-center">
                  <span className="text-sm font-medium text-muted-foreground block mb-1">Workouts Assigned</span>
                  <span className="text-[30px] sm:text-[32px] font-bold text-foreground leading-none">{profileData.workoutsSummary.totalCount}</span>
                </div>
                <div className="text-center border-x border-border">
                  <span className="text-sm font-medium text-muted-foreground block mb-1">Sessions Done</span>
                  <span className="text-[30px] sm:text-[32px] font-bold text-emerald-500 leading-none">{profileData.workoutsSummary.completedCount}</span>
                </div>
                <div className="text-center">
                  <span className="text-sm font-medium text-muted-foreground block mb-1">Est. Kcal Burned</span>
                  <span className="text-[30px] sm:text-[32px] font-bold text-amber-500 leading-none">{profileData.workoutsSummary.totalCalories.toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Column 1: Health History */}
                <div className="space-y-4">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-widest border-b border-border pb-1.5">Health Questionnaire</h4>
                  <div className="space-y-4 bg-muted/40 border border-border p-4 rounded-2xl text-xs">
                    <div>
                      <span className="text-xs font-medium text-muted-foreground block mb-1">Medical Conditions</span>
                      <p className="text-foreground bg-card p-2.5 rounded-xl border border-border min-h-[40px]">
                        {profileData.healthHistory?.medical_conditions || "None declared."}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground block mb-1">Injuries</span>
                      <p className="text-foreground bg-card p-2.5 rounded-xl border border-border min-h-[40px]">
                        {profileData.healthHistory?.injuries || "None declared."}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground block mb-1">Allergies</span>
                      <p className="text-foreground bg-card p-2.5 rounded-xl border border-border min-h-[40px]">
                        {profileData.healthHistory?.allergies || "None declared."}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground block mb-1">Medications</span>
                      <p className="text-foreground bg-card p-2.5 rounded-xl border border-border min-h-[40px]">
                        {profileData.healthHistory?.medications || "None declared."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Column 2: Weekly Check-ins */}
                <div className="space-y-4">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-widest border-b border-border pb-1.5">Weekly Check-in Log</h4>
                  {profileData.checkins.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-8 text-center bg-muted/40 rounded-2xl border border-border">No check-ins submitted yet.</p>
                  ) : (
                    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
                      {profileData.checkins.map((c) => (
                        <div key={c.id} className="p-3 rounded-2xl bg-card border border-border space-y-2 text-xs">
                          <div className="flex justify-between items-center border-b border-border pb-1.5">
                            <span className="text-xs font-medium text-foreground">{new Date(c.checkin_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                            <span className="text-xs font-medium text-foreground bg-muted px-2 py-0.5 rounded-lg border border-border">{c.weight_kg} kg</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-[11px]">
                            <div>
                              <span className="text-xs font-medium text-muted-foreground block mb-1">Energy</span>
                              <span className="text-foreground font-semibold">{c.energy_level}/5</span>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-muted-foreground block mb-1">Mood</span>
                              <span className="text-foreground font-semibold capitalize">{c.mood}</span>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-muted-foreground block mb-1">Sleep</span>
                              <span className="text-foreground font-semibold">{c.sleep_hours ? `${c.sleep_hours} hrs` : "—"}</span>
                            </div>
                          </div>
                          {c.notes && (
                            <div className="bg-muted/60 p-2 rounded-xl border border-border text-[11px] text-muted-foreground">
                              <span className="text-xs font-medium text-muted-foreground block mb-0.5">Notes:</span>
                              {c.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Workout History Sessions Row */}
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between border-b border-border pb-1.5">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                    <Dumbbell className="w-3.5 h-3.5 text-primary" />
                    Workout Session Logs
                  </h4>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {profileData.userWorkouts?.length || 0} recorded
                  </span>
                </div>

                {!profileData.userWorkouts || profileData.userWorkouts.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-8 text-center bg-muted/40 rounded-2xl border border-border">
                    No workout sessions recorded yet.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {profileData.userWorkouts.map((w: any) => {
                      const isCompleted = w.status === "completed";
                      const isInProgress = w.status === "in_progress";

                      return (
                        <div
                          key={w.id}
                          className="flex items-center justify-between p-3 rounded-2xl bg-card border border-border text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {isCompleted ? (
                              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            ) : isInProgress ? (
                              <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate">
                                {w.workout_name || "Workout Session"}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {format(new Date(w.scheduled_date), "EEE, MMM d, yyyy")}
                                {w.completed_at && ` • at ${format(new Date(w.completed_at), "h:mm a")}`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 flex-shrink-0 ml-4">
                            {w.duration_minutes > 0 && (
                              <span className="text-muted-foreground text-[11px]">
                                {w.duration_minutes}m
                              </span>
                            )}
                            {w.calories_burned > 0 && (
                              <span className="text-muted-foreground text-[11px]">
                                {w.calories_burned} kcal
                              </span>
                            )}
                            <Badge
                              variant="outline"
                              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-lg ${
                                isCompleted
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                  : isInProgress
                                  ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {w.status}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Progress Photos Row */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-widest border-b border-border pb-1.5">Progress Photos</h4>
                {profileData.photos.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-8 text-center bg-muted/40 rounded-2xl border border-border">No progress photos uploaded yet.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {profileData.photos.map((p) => (
                      <div key={p.id} className="relative rounded-2xl overflow-hidden border border-border bg-card flex flex-col group">
                        <div className="aspect-[3/4] w-full overflow-hidden bg-muted flex items-center justify-center">
                          <img
                            src={p.image_path}
                            alt={`Progress photo ${p.taken_at}`}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                        </div>
                        <div className="p-2 bg-muted/60 text-center text-xs font-medium text-muted-foreground border-t border-border">
                          {new Date(p.taken_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tutorial Videos Row */}
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between border-b border-border pb-1.5">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Tutorial Videos</h4>
                  <span className="text-[11px] font-medium text-muted-foreground">{profileData.videos?.length || 0} available</span>
                </div>
                {profileData.videosLoading ? (
                  <div className="flex items-center justify-center py-8 gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">Loading videos...</span>
                  </div>
                ) : !profileData.videos || profileData.videos.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-8 text-center bg-muted/40 rounded-2xl border border-border">No tutorial videos available.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {profileData.videos.map((v: any) => (
                      <div key={v.id} className="rounded-2xl overflow-hidden border border-border bg-card flex flex-col group">
                        <a
                          href={v.video_url_large || v.video_url_small || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block aspect-video w-full overflow-hidden bg-muted relative"
                        >
                          {v.thumbnail_url ? (
                            <img
                              src={v.thumbnail_url}
                              alt={v.title || "Tutorial video"}
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No thumbnail</div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="w-8 h-8 text-white" />
                          </div>
                          {v.duration && (
                            <span className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
                              {v.duration}
                            </span>
                          )}
                        </a>
                        <div className="p-2.5 space-y-1">
                          <p className="text-xs font-semibold text-foreground line-clamp-2">{v.title || "Untitled video"}</p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {v.category && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground font-medium">
                                {v.category}
                              </Badge>
                            )}
                            {v.level && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground font-medium">
                                {v.level}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}