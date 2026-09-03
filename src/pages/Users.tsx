import { useState, useEffect, useMemo, useCallback } from "react";
import { Users as UsersIcon, Shield, ShieldAlert, ShieldCheck, UserCog, Search, RefreshCw, Loader2, UserPlus, Play } from "lucide-react";
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
  admin: { label: "Admin", color: "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20", icon: ShieldAlert },
  user: { label: "User", color: "bg-[#F5F7F9] text-[#64748B] border-[#E2E8F0]", icon: UserCog },
  trial_user: { label: 'Trial User', color: "bg-[#F5F7F9] text-[#64748B] border-[#E2E8F0]", icon: UserCog },
  coach: { label: 'Coach', color: "bg-[#7C5CFC]/10 text-[#7C5CFC] border-[#7C5CFC]/20", icon: ShieldCheck }
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
    videos: any[];
    videosLoading: boolean;
  } | null>(null);

  const fetchClientProfile = async (userId: string) => {
    try {
      setProfileLoading(true);
      setProfileData(null);

      const [healthRes, checkinsRes, photosRes, workoutsRes] = await Promise.all([
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
          .select("completed, calories_burned")
          .eq("user_id", userId)
      ]);

      const workouts = workoutsRes.data || [];
      const completed = workouts.filter((w: any) => w.completed);
      const calories = workouts.reduce((sum: number, w: any) => sum + (w.calories_burned || 0), 0);

      setProfileData({
        healthHistory: healthRes.data || null,
        checkins: checkinsRes.data || [],
        photos: photosRes.data || [],
        workoutsSummary: {
          totalCount: workouts.length,
          completedCount: completed.length,
          totalCalories: calories,
        },
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
      let newExpiry = new Date();
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
  if (!isAdmin) return <div className="p-20 text-center"><ShieldAlert className="mx-auto h-12 w-12 text-[#EF4444]/50" /></div>;

  return (
    <>
      <PageHeader title="User Management" description="Real-time access control.">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#64748B]" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 bg-white text-xs border-[#CBD5E1] rounded-[8px] focus-visible:border-[#71D0F7] focus-visible:ring-[3px] focus-visible:ring-[#71D0F7]/[.12]"
          />
        </div>
      </PageHeader>

      <Card className="border border-[#E2E8F0] rounded-[14px] shadow-[0_4px_18px_rgba(15,23,42,0.05)] overflow-hidden bg-white">
        <CardHeader className="p-5 border-b border-[#E2E8F0] flex flex-row items-center justify-between space-y-0 bg-[#F5F7F9]">
          <CardTitle className="flex items-center gap-2 text-[20px] font-semibold text-[#111827]">
            <UsersIcon className="w-4 h-4 text-[#71D0F7]" />
            Registry ({filteredUsers.length})
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <Input
              placeholder="Filter by name/email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 w-64 text-sm rounded-[10px] bg-white border-[#CBD5E1] focus-visible:border-[#71D0F7] focus-visible:ring-[3px] focus-visible:ring-[#71D0F7]/[.12]"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-full table-fixed border-collapse">
              <TableHeader className="bg-[#F5F7F9]">
                <TableRow>
                  <TableHead className="w-[200px] pl-6 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Member Name</TableHead>
                  <TableHead className="w-[250px] text-xs font-semibold text-[#64748B] uppercase tracking-wider">Email Address</TableHead>
                  <TableHead className="w-[120px] text-center text-xs font-semibold text-[#64748B] uppercase tracking-wider">Current Role</TableHead>
                  <TableHead className="w-[240px] text-right pr-6 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Management</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-[#F5F7F9] border-b border-[#E2E8F0] last:border-0 transition-colors duration-150">
                    <TableCell className="py-2.5 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-[8px] bg-[#E8F8F8] flex items-center justify-center text-xs font-semibold text-[#4DB8F5] shrink-0">
                          {(user.full_name?.[0] || user.email?.[0] || "U").toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold text-[#111827] truncate block max-w-[140px]" title={user.full_name || ""}>
                          {user.full_name || "Unnamed User"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 text-sm text-[#64748B]">
                      <span className="truncate block max-w-[220px]" title={user.email || ""}>
                        {user.email || "not set"}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5 text-center">
                      <Badge variant="outline" className={`${(roleConfig[user.role] || roleConfig.user).color} text-xs px-2 py-0.5 border-none uppercase font-semibold`}>
                        {user.role === 'trial_user' ? 'Trial User' : user.role}
                      </Badge>
                      {user.role === 'user' && (
                        <span className="block text-[11px] text-[#64748B] mt-1 font-medium">
                          Coach: {user.coach_name || "Unassigned"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-2.5 text-right pr-6">
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-28 text-xs font-semibold bg-white border-[#E2E8F0] text-[#334155] hover:bg-[#F5F7F9] rounded-[8px]"
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
                          className="h-8 w-28 text-xs font-semibold bg-white border-[#E2E8F0] text-[#334155] hover:bg-[#F5F7F9] rounded-[8px]"
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
                          <SelectTrigger className="h-8 w-28 text-xs font-semibold bg-white border-[#CBD5E1] rounded-[8px] disabled:opacity-75 disabled:cursor-not-allowed focus:border-[#71D0F7] focus:ring-[3px] focus:ring-[#71D0F7]/[.12]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin" className="text-xs font-semibold text-[#EF4444]" disabled>ADMIN</SelectItem>
                            <SelectItem value="user" className="text-xs font-medium">USER</SelectItem>
                            <SelectItem value="trial_user" className="text-xs font-medium">TRIAL USER</SelectItem>
                            <SelectItem value="coach" className="text-xs font-medium text-[#7C5CFC]">COACH</SelectItem>
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
        <DialogContent className="rounded-[14px]">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-semibold text-[#111827]">
              Assign User to Group
            </DialogTitle>
            <DialogDescription className="text-sm font-normal text-[#526581]">
              Select a group to assign this user to.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-[#475569]">Select Group</p>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger className="border-[#CBD5E1] rounded-[8px] focus:border-[#71D0F7] focus:ring-[3px] focus:ring-[#71D0F7]/[.12]">
                  <SelectValue placeholder="Choose a group..." />
                </SelectTrigger>
                <SelectContent>
                  {groups.length === 0 ? (
                    <SelectItem value="none" disabled className="text-[#94A3B8]">
                      No groups available
                    </SelectItem>
                  ) : (
                    groups.map((g) => (
                      <SelectItem key={g.id} value={g.id} className="hover:bg-[#E8F8F8]">
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
              className="border-[#E2E8F0] rounded-[10px]"
              onClick={() => setIsAssignGroupOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignGroup}
              disabled={!selectedGroupId || assigning}
              className="bg-[#71D0F7] hover:bg-[#4DB8F5] text-white rounded-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
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
        <AlertDialogContent className="max-w-xs rounded-[14px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[18px] font-semibold text-[#111827]">Modify Permissions?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#64748B]">
              Assign <b className="text-[#111827]">{roleChangeDialog.newRole?.toUpperCase()}</b> access to this account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel className="text-xs h-8 flex-1 border-[#E2E8F0] rounded-[8px]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange} className="text-xs h-8 flex-1 bg-[#71D0F7] hover:bg-[#4DB8F5] rounded-[8px]">Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Client Profile Dialog ── */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-white border border-[#E2E8F0] text-[#111827] rounded-[14px] p-5 custom-scrollbar">
          <DialogHeader className="border-b border-[#E2E8F0] pb-4 mb-4">
            <DialogTitle className="text-[18px] font-semibold flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#E8F8F8] flex items-center justify-center text-xs font-semibold text-[#4DB8F5]">
                {(selectedProfileUser?.full_name?.[0] || selectedProfileUser?.email?.[0] || "U").toUpperCase()}
              </div>
              <div>
                <span className="text-[#111827] block">{selectedProfileUser?.full_name || "Client Profile"}</span>
                <span className="text-xs text-[#64748B] font-normal">{selectedProfileUser?.email}</span>
              </div>
            </DialogTitle>
            <DialogDescription className="text-xs text-[#64748B] flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <span>Joined on {selectedProfileUser?.created_at ? new Date(selectedProfileUser.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</span>
              {selectedProfileUser?.role === 'user' && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#334155]">Assign Coach:</span>
                  <Select
                    value={selectedProfileUser?.coach_id || "none"}
                    onValueChange={(coachId) => handleDirectAssignCoach(selectedProfileUser.user_id, coachId)}
                    disabled={assigning}
                  >
                    <SelectTrigger className="h-8 text-xs w-48 bg-white border-[#CBD5E1] text-[#111827] font-semibold px-2.5 rounded-[8px] focus:border-[#71D0F7] focus:ring-[3px] focus:ring-[#71D0F7]/[.12]">
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
              <Loader2 className="w-8 h-8 animate-spin text-[#71D0F7]" />
              <p className="text-sm text-[#64748B] font-medium">Retrieving client record...</p>
            </div>
          ) : !profileData ? (
            <p className="text-center py-20 text-[#64748B] text-sm">Failed to load profile details.</p>
          ) : (
            <div className="space-y-6">
              {/* Stats Summary Panel */}
              <div className="grid grid-cols-3 gap-4 p-4 rounded-[14px] bg-[#F5F7F9] border border-[#E2E8F0]">
                <div className="text-center">
                  <span className="text-sm font-medium text-[#64748B] block mb-1">Workouts Assigned</span>
                  <span className="text-[30px] sm:text-[32px] font-bold text-[#111827] leading-none">{profileData.workoutsSummary.totalCount}</span>
                </div>
                <div className="text-center border-x border-[#E2E8F0]">
                  <span className="text-sm font-medium text-[#64748B] block mb-1">Sessions Done</span>
                  <span className="text-[30px] sm:text-[32px] font-bold text-[#059669] leading-none">{profileData.workoutsSummary.completedCount}</span>
                </div>
                <div className="text-center">
                  <span className="text-sm font-medium text-[#64748B] block mb-1">Est. Kcal Burned</span>
                  <span className="text-[30px] sm:text-[32px] font-bold text-[#F59E0B] leading-none">{profileData.workoutsSummary.totalCalories.toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Column 1: Health History */}
                <div className="space-y-4">
                  <h4 className="text-xs font-medium text-[#64748B] uppercase tracking-widest border-b border-[#E2E8F0] pb-1.5">Health Questionnaire</h4>
                  <div className="space-y-4 bg-[#F5F7F9] border border-[#E2E8F0] p-4 rounded-[14px] text-xs">
                    <div>
                      <span className="text-xs font-medium text-[#64748B] block mb-1">Medical Conditions</span>
                      <p className="text-[#111827] bg-white p-2.5 rounded-[8px] border border-[#E2E8F0] min-h-[40px]">
                        {profileData.healthHistory?.medical_conditions || "None declared."}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-[#64748B] block mb-1">Injuries</span>
                      <p className="text-[#111827] bg-white p-2.5 rounded-[8px] border border-[#E2E8F0] min-h-[40px]">
                        {profileData.healthHistory?.injuries || "None declared."}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-[#64748B] block mb-1">Allergies</span>
                      <p className="text-[#111827] bg-white p-2.5 rounded-[8px] border border-[#E2E8F0] min-h-[40px]">
                        {profileData.healthHistory?.allergies || "None declared."}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-[#64748B] block mb-1">Medications</span>
                      <p className="text-[#111827] bg-white p-2.5 rounded-[8px] border border-[#E2E8F0] min-h-[40px]">
                        {profileData.healthHistory?.medications || "None declared."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Column 2: Weekly Check-ins */}
                <div className="space-y-4">
                  <h4 className="text-xs font-medium text-[#64748B] uppercase tracking-widest border-b border-[#E2E8F0] pb-1.5">Weekly Check-in Log</h4>
                  {profileData.checkins.length === 0 ? (
                    <p className="text-xs text-[#64748B] italic py-8 text-center bg-[#F5F7F9] rounded-[14px] border border-[#E2E8F0]">No check-ins submitted yet.</p>
                  ) : (
                    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
                      {profileData.checkins.map((c) => (
                        <div key={c.id} className="p-3 rounded-[14px] bg-white border border-[#E2E8F0] space-y-2 text-xs">
                          <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-1.5">
                            <span className="text-xs font-medium text-[#111827]">{new Date(c.checkin_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                            <span className="text-xs font-medium text-[#111827] bg-[#F5F7F9] px-2 py-0.5 rounded-[8px] border border-[#E2E8F0]">{c.weight_kg} kg</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-[11px]">
                            <div>
                              <span className="text-xs font-medium text-[#64748B] block mb-1">Energy</span>
                              <span className="text-[#111827] font-semibold">{c.energy_level}/5</span>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-[#64748B] block mb-1">Mood</span>
                              <span className="text-[#111827] font-semibold capitalize">{c.mood}</span>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-[#64748B] block mb-1">Sleep</span>
                              <span className="text-[#111827] font-semibold">{c.sleep_hours ? `${c.sleep_hours} hrs` : "—"}</span>
                            </div>
                          </div>
                          {c.notes && (
                            <div className="bg-[#F5F7F9] p-2 rounded-[8px] border border-[#E2E8F0] text-[11px] text-[#64748B]">
                              <span className="text-xs font-medium text-[#64748B] block mb-0.5">Notes:</span>
                              {c.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Photos Row */}
              <div className="space-y-4 pt-4 border-t border-[#E2E8F0]">
                <h4 className="text-xs font-medium text-[#64748B] uppercase tracking-widest border-b border-[#E2E8F0] pb-1.5">Progress Photos</h4>
                {profileData.photos.length === 0 ? (
                  <p className="text-xs text-[#64748B] italic py-8 text-center bg-[#F5F7F9] rounded-[14px] border border-[#E2E8F0]">No progress photos uploaded yet.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {profileData.photos.map((p) => (
                      <div key={p.id} className="relative rounded-[14px] overflow-hidden border border-[#E2E8F0] bg-white flex flex-col group">
                        <div className="aspect-[3/4] w-full overflow-hidden bg-[#F5F7F9] flex items-center justify-center">
                          <img
                            src={p.image_path}
                            alt={`Progress photo ${p.taken_at}`}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                        </div>
                        <div className="p-2 bg-[#F5F7F9] text-center text-xs font-medium text-[#64748B] border-t border-[#E2E8F0]">
                          {new Date(p.taken_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tutorial Videos Row */}
              <div className="space-y-4 pt-4 border-t border-[#E2E8F0]">
                <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-1.5">
                  <h4 className="text-xs font-medium text-[#64748B] uppercase tracking-widest">Tutorial Videos</h4>
                  <span className="text-[11px] font-medium text-[#64748B]">{profileData.videos?.length || 0} available</span>
                </div>
                {profileData.videosLoading ? (
                  <div className="flex items-center justify-center py-8 gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#71D0F7]" />
                    <span className="text-xs text-[#64748B]">Loading videos...</span>
                  </div>
                ) : !profileData.videos || profileData.videos.length === 0 ? (
                  <p className="text-xs text-[#64748B] italic py-8 text-center bg-[#F5F7F9] rounded-[14px] border border-[#E2E8F0]">No tutorial videos available.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {profileData.videos.map((v: any) => (
                      <div key={v.id} className="rounded-[14px] overflow-hidden border border-[#E2E8F0] bg-white flex flex-col group">
                        <a
                          href={v.video_url_large || v.video_url_small || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block aspect-video w-full overflow-hidden bg-[#F5F7F9] relative"
                        >
                          {v.thumbnail_url ? (
                            <img
                              src={v.thumbnail_url}
                              alt={v.title || "Tutorial video"}
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#94A3B8] text-xs">No thumbnail</div>
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
                          <p className="text-xs font-semibold text-[#111827] line-clamp-2">{v.title || "Untitled video"}</p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {v.category && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-[#E2E8F0] text-[#64748B] font-medium">
                                {v.category}
                              </Badge>
                            )}
                            {v.level && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-[#E2E8F0] text-[#64748B] font-medium">
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