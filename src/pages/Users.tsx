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
  Trash2
} from "lucide-react";
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
  secondary_coach_id?: string | null;
  secondary_coach_name?: string | null;
  coaches?: Array<{ id: string; name: string | null; role: 'Primary' | 'Secondary' }>;
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
  const [selectedUserForCoach, setSelectedUserForCoach] = useState<UserWithRole | null>(null);
  const [primaryCoachSelection, setPrimaryCoachSelection] = useState<string>("none");
  const [secondaryCoachSelection, setSecondaryCoachSelection] = useState<string>("none");
  const [coachesList, setCoachesList] = useState<any[]>([]);
  const [loadingCoaches, setLoadingCoaches] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [updating, setUpdating] = useState(false);
  const [roleChangeDialog, setRoleChangeDialog] = useState<{
    open: boolean;
    user: UserWithRole | null;
    newRole: AppRole | null;
  }>({ open: false, user: null, newRole: null });

  // ── Delete user state ──
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: UserWithRole | null }>({
    open: false,
    user: null,
  });
  const [deleting, setDeleting] = useState(false);

  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<UserWithRole | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileData, setProfileData] = useState<{
    healthHistory: any;
    checkins: any[];
    workoutsSummary: {
      totalCount: number;
      completedCount: number;
      totalCalories: number;
    };
  } | null>(null);

  const fetchClientProfile = async (userId: string) => {
    try {
      setProfileLoading(true);
      setProfileData(null);

      const [healthRes, checkinsRes, workoutsRes, progressRes] = await Promise.all([
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
          .from("workouts")
          .select("id, completed, calories_burned")
          .eq("user_id", userId),
        supabase
          .from("workout_progress")
          .select("id, status")
          .eq("user_id", userId),
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
        workoutsSummary: {
          totalCount,
          completedCount,
          totalCalories: calories,
        },
      });
    } catch (err: any) {
      console.error("Error loading client profile data:", err);
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
        const coachClientsRes = await supabase.from("coach_clients").select("client_id, coach_id, created_at").order("created_at", { ascending: true });
        if (!coachClientsRes.error) {
          coachClientsData = coachClientsRes.data || [];
        }
      } catch (err) {
        // Table coach_clients may not exist in schema
      }

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const profileMap = new Map<string, string>();
      (profilesRes.data || []).forEach(p => {
        if (p.user_id) profileMap.set(p.user_id, p.full_name || "Unknown");
        if (p.id) profileMap.set(p.id, p.full_name || "Unknown");
      });
      const rolesMap = new Map((rolesRes.data || []).map(r => [r.user_id, r.role]));
      
      const clientCoachesMap = new Map<string, Array<{ id: string; name: string | null }>>();
      for (const cc of coachClientsData) {
        const coachName = profileMap.get(cc.coach_id) || null;
        const list = clientCoachesMap.get(cc.client_id) || [];
        if (!list.some(item => item.id === cc.coach_id)) {
          list.push({ id: cc.coach_id, name: coachName });
          clientCoachesMap.set(cc.client_id, list);
        }
      }

      const formattedUsers: UserWithRole[] = (profilesRes.data || []).map((profile) => {
        const coachList = clientCoachesMap.get(profile.id) || clientCoachesMap.get(profile.user_id) || [];
        const primaryCoach = coachList[0] || null;
        const secondaryCoach = coachList[1] || null;
        const coaches = coachList.map((c, idx) => ({
          id: c.id,
          name: c.name,
          role: (idx === 0 ? 'Primary' : 'Secondary') as 'Primary' | 'Secondary',
        }));

        return {
          id: profile.id,
          user_id: profile.user_id,
          email: profile.email,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          created_at: profile.created_at,
          role: (rolesMap.get(profile.user_id) as AppRole) || "trial_user",
          coach_id: primaryCoach?.id || null,
          coach_name: primaryCoach?.name || null,
          secondary_coach_id: secondaryCoach?.id || null,
          secondary_coach_name: secondaryCoach?.name || null,
          coaches,
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
        .select("user_id, role");

      if (roleError || !roleData || roleData.length === 0) {
        setCoachesList([]);
        return;
      }

      const coachUserIds = roleData
        .filter((r: any) => r.role === "coach" || r.role === "trainer" || r.role === "admin")
        .map((r: any) => r.user_id);

      if (coachUserIds.length === 0) {
        setCoachesList([]);
        return;
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, email")
        .in("user_id", coachUserIds);

      if (profilesError) throw profilesError;

      const formatted = (profilesData || []).map((p: any) => ({
        id: p.user_id,
        profile_id: p.id,
        full_name: p.full_name || "Unknown Coach",
        email: p.email || "",
      }));
      setCoachesList(formatted);
    } catch (error: any) {
      console.warn("Coaches fetch note:", error?.message || error);
      setCoachesList([]);
    } finally {
      setLoadingCoaches(false);
    }
  };

  const handleDirectAssignCoaches = async (
    clientProfileId: string,
    primaryCoachId: string | null,
    secondaryCoachId: string | null
  ) => {
    try {
      setAssigning(true);
      const { error: deleteError } = await supabase
        .from("coach_clients")
        .delete()
        .eq("client_id", clientProfileId);

      if (deleteError) throw deleteError;

      const rowsToInsert: Array<{ coach_id: string; client_id: string }> = [];

      if (primaryCoachId && primaryCoachId !== "none") {
        rowsToInsert.push({
          coach_id: primaryCoachId,
          client_id: clientProfileId,
        });
      }

      if (
        secondaryCoachId &&
        secondaryCoachId !== "none" &&
        secondaryCoachId !== primaryCoachId
      ) {
        rowsToInsert.push({
          coach_id: secondaryCoachId,
          client_id: clientProfileId,
        });
      }

      if (rowsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("coach_clients")
          .insert(rowsToInsert);

        if (insertError) throw insertError;
      }

      const pCoach = coachesList.find((c) => c.id === primaryCoachId);
      const sCoach = coachesList.find((c) => c.id === secondaryCoachId);
      const pName = pCoach ? pCoach.full_name : null;
      const sName = sCoach && secondaryCoachId !== primaryCoachId ? sCoach.full_name : null;
      const finalPId = primaryCoachId === "none" ? null : primaryCoachId;
      const finalSId = secondaryCoachId === "none" || secondaryCoachId === primaryCoachId ? null : secondaryCoachId;

      const updatedCoaches: Array<{ id: string; name: string | null; role: 'Primary' | 'Secondary' }> = [];
      if (finalPId) updatedCoaches.push({ id: finalPId, name: pName, role: 'Primary' });
      if (finalSId) updatedCoaches.push({ id: finalSId, name: sName, role: 'Secondary' });

      setUsers((prev) =>
        prev.map((u) =>
          u.id === clientProfileId
            ? {
                ...u,
                coach_id: finalPId,
                coach_name: pName,
                secondary_coach_id: finalSId,
                secondary_coach_name: sName,
                coaches: updatedCoaches,
              }
            : u
        )
      );

      setSelectedProfileUser((prev) =>
        prev && prev.id === clientProfileId
          ? {
              ...prev,
              coach_id: finalPId,
              coach_name: pName,
              secondary_coach_id: finalSId,
              secondary_coach_name: sName,
              coaches: updatedCoaches,
            }
          : prev
      );

      if (updatedCoaches.length === 2) {
        toast({
          title: "Dual Coaches Assigned",
          description: `Primary: ${pName} | Secondary: ${sName}. Dual permissions granted.`,
        });
      } else if (updatedCoaches.length === 1) {
        toast({
          title: "Primary Coach Assigned",
          description: `Assigned ${pName} as primary coach.`,
        });
      } else {
        toast({
          title: "Coaches Unassigned",
          description: "Coach assignments removed for this member.",
        });
      }

      setIsAssignCoachOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Failed to assign coaches",
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
      //const { error } = await supabase.from("user_roles").upsert({
        //user_id: roleChangeDialog.user.user_id,
        //role: roleChangeDialog.newRole,
        //expiry_time: newExpiry
      //}, { onConflict: "user_id" });

      const { error } = await supabase
        .from("user_roles")
        .update({
          role: roleChangeDialog.newRole,
          expiry_time: newExpiry
        })
        .eq("user_id", roleChangeDialog.user.user_id);
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

  // ── Delete user handler ──
  const handleDeleteUser = async () => {
    if (!deleteDialog.user) return;
    if (deleteDialog.user.user_id === currentUser?.id) {
      toast({ title: "Restricted", description: "You cannot delete your own account.", variant: "destructive" });
      setDeleteDialog({ open: false, user: null });
      return;
    }
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-user", {
        body: { user_id: deleteDialog.user.user_id },
      });
      if (error) {
       
        let detail = error.message;
        try {
          const body = await error.context.json();
          detail = body.error ?? detail;
        } catch {}
        throw new Error(detail);
      }
      setUsers((prev) => prev.filter((u) => u.user_id !== deleteDialog.user!.user_id));
      toast({ title: "Deleted", description: "User removed." });
    } catch (error: any) {
      toast({ title: "Failed to delete user", description: error.message, variant: "destructive" });
      console.error("Delete user error:", error);
    } finally {
      setDeleting(false);
      setDeleteDialog({ open: false, user: null });
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
        <CardHeader className="p-4 sm:p-5 border-b border-border flex flex-row items-center justify-between space-y-0 bg-muted/40">
          <CardTitle className="flex items-center gap-2 text-[18px] sm:text-[20px] font-semibold text-foreground">
            <UsersIcon className="w-4 h-4 text-primary" />
            Registry ({filteredUsers.length})
          </CardTitle>
          <div className="relative hidden sm:block">
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
          {/* ── Mobile Card List (hidden on md+) ── */}
          <div className="md:hidden divide-y divide-border">
            {filteredUsers.map((user) => (
              <div key={user.id} className="p-3 space-y-2.5">
                {/* Name + Role row */}
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                    {(user.full_name?.[0] || user.email?.[0] || "U").toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{user.full_name || "Unnamed User"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email || "not set"}</p>
                  </div>
                  <Badge variant="outline" className={`${(roleConfig[user.role] || roleConfig.user).color} text-[10px] px-1.5 py-0 border-none uppercase font-semibold shrink-0`}>
                    {user.role === 'trial_user' ? 'Trial' : user.role}
                  </Badge>
                </div>
                {/* Coach info on mobile */}
                {user.role === 'user' && (
                  <div className="flex flex-wrap gap-1.5 items-center text-[11px] bg-muted/40 p-2 rounded-lg border border-border/50">
                    <span className="text-muted-foreground font-medium">Coaches:</span>
                    {user.coach_name && user.secondary_coach_name ? (
                      <>
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[10px] px-1.5 py-0 font-medium">
                          1° {user.coach_name}
                        </Badge>
                        <Badge variant="outline" className="bg-teal-500/10 text-teal-400 border-teal-500/20 text-[10px] px-1.5 py-0 font-medium">
                          2° {user.secondary_coach_name}
                        </Badge>
                      </>
                    ) : user.coach_name ? (
                      <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[10px] px-1.5 py-0 font-medium">
                        {user.coach_name}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground italic text-[10px]">None assigned</span>
                    )}
                  </div>
                )}
                {/* Action buttons row */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {user.role === 'user' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[11px] font-semibold bg-card border-border text-purple-400 hover:bg-purple-500/10 rounded-lg flex-1 min-w-0"
                      onClick={() => {
                        setSelectedUserForCoach(user);
                        setPrimaryCoachSelection(user.coach_id || "none");
                        setSecondaryCoachSelection(user.secondary_coach_id || "none");
                        setIsAssignCoachOpen(true);
                      }}
                    >
                      <ShieldCheck className="w-3 h-3 mr-1 shrink-0" />
                      Coaches
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-[11px] font-semibold bg-card border-border text-foreground hover:bg-muted rounded-lg flex-1 min-w-0"
                    onClick={() => { setSelectedUserId(user.user_id); setIsAssignGroupOpen(true); }}
                  >
                    <UsersIcon className="w-3 h-3 mr-1 shrink-0" />
                    Group
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-[11px] font-semibold bg-card border-border text-foreground hover:bg-muted rounded-lg flex-1 min-w-0"
                    onClick={() => { setSelectedProfileUser(user); setProfileDialogOpen(true); fetchClientProfile(user.user_id); }}
                  >
                    Profile
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10 rounded-lg"
                    onClick={() => setDeleteDialog({ open: true, user })}
                    disabled={user.user_id === currentUser?.id}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                  <Select
                    value={user.role}
                    onValueChange={(val: AppRole) => handleRoleChange(user, val)}
                    disabled={user.role === 'admin' || user.user_id === currentUser?.id || updating}
                  >
                    <SelectTrigger className="h-7 w-24 text-[11px] font-semibold bg-card border-input text-foreground rounded-lg disabled:opacity-75 disabled:cursor-not-allowed focus:border-primary focus:ring-primary/20">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border border-border bg-popover p-1 shadow-lg min-w-[115px]">
                      <SelectItem value="admin" className="text-xs font-semibold text-destructive py-2" disabled>ADMIN</SelectItem>
                      <SelectItem value="user" className="text-xs font-medium py-2">USER</SelectItem>
                      <SelectItem value="trial_user" className="text-xs font-medium py-2">TRIAL</SelectItem>
                      <SelectItem value="coach" className="text-xs font-medium text-purple-400 py-2">COACH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>

          {/* ── Desktop Table (hidden on mobile) ── */}
          <div className="hidden md:block overflow-x-auto">
            <Table className="min-w-full table-fixed border-collapse">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[180px] pl-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Member Name</TableHead>
                  <TableHead className="w-[220px] text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Address</TableHead>
                  <TableHead className="w-[180px] text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Role & Coaches</TableHead>
                  <TableHead className="w-[490px] text-right pr-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Management</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/50 border-b border-border last:border-0 transition-colors duration-150">
                    <TableCell className="py-3.5 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                          {(user.full_name?.[0] || user.email?.[0] || "U").toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold text-foreground truncate block max-w-[130px]" title={user.full_name || ""}>
                          {user.full_name || "Unnamed User"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3.5 text-sm text-muted-foreground">
                      <span className="truncate block max-w-[200px]" title={user.email || ""}>
                        {user.email || "not set"}
                      </span>
                    </TableCell>
                    <TableCell className="py-3.5 text-center">
                      <div className="flex flex-col items-center justify-center gap-1.5 min-h-[50px]">
                        <Badge
                          variant="outline"
                          className={`${(roleConfig[user.role] || roleConfig.user).color} text-[11px] h-6 w-24 inline-flex items-center justify-center border-none uppercase font-semibold tracking-wider rounded-md`}
                        >
                          {user.role === 'trial_user' ? 'Trial' : user.role}
                        </Badge>
                        {user.role === 'user' || user.role === 'trial_user' ? (
                          user.coach_name && user.secondary_coach_name ? (
                            <div className="flex flex-col gap-1 items-center">
                              <span className="inline-flex items-center justify-center text-[10px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 h-5 px-2.5 rounded-full truncate max-w-[135px]" title={`Primary: ${user.coach_name}`}>
                                1° {user.coach_name}
                              </span>
                              <span className="inline-flex items-center justify-center text-[10px] font-medium bg-teal-500/10 text-teal-400 border border-teal-500/20 h-5 px-2.5 rounded-full truncate max-w-[135px]" title={`Secondary: ${user.secondary_coach_name}`}>
                                2° {user.secondary_coach_name}
                              </span>
                            </div>
                          ) : user.coach_name ? (
                            <span className="inline-flex items-center justify-center text-[10px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 h-5 px-2.5 rounded-full truncate max-w-[135px]" title={`Coach: ${user.coach_name}`}>
                              {user.coach_name}
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center text-[10px] font-medium text-muted-foreground/60 border border-border/40 bg-muted/20 h-5 px-2.5 rounded-full">
                              No Coach
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center justify-center text-[10px] text-muted-foreground/30 font-medium h-5 px-2.5">
                            —
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3.5 text-right pr-6">
                      <div className="flex items-center gap-2 justify-end">
                        {user.role !== 'admin' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-[124px] px-2.5 text-xs font-semibold bg-card border-border text-foreground hover:bg-purple-500/10 hover:text-purple-400 hover:border-purple-500/40 rounded-lg flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors shadow-xs shrink-0"
                            onClick={() => {
                              setSelectedUserForCoach(user);
                              setPrimaryCoachSelection(user.coach_id || "none");
                              setSecondaryCoachSelection(user.secondary_coach_id || "none");
                              setIsAssignCoachOpen(true);
                            }}
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            <span>Assign Coaches</span>
                          </Button>
                        ) : (
                          <div className="w-[124px] shrink-0" />
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-[114px] px-2.5 text-xs font-semibold bg-card border-border text-foreground hover:bg-muted/80 hover:border-primary/40 rounded-lg flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors shadow-xs shrink-0"
                          onClick={() => { setSelectedUserId(user.user_id); setIsAssignGroupOpen(true); }}
                        >
                          <UsersIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>Assign Group</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-[94px] px-2.5 text-xs font-semibold bg-card border-border text-foreground hover:bg-muted/80 hover:border-primary/40 rounded-lg flex items-center justify-center whitespace-nowrap transition-colors shadow-xs shrink-0"
                          onClick={() => { setSelectedProfileUser(user); setProfileDialogOpen(true); fetchClientProfile(user.user_id); }}
                        >
                          View Profile
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10 rounded-lg transition-colors flex items-center justify-center shadow-xs"
                          onClick={() => setDeleteDialog({ open: true, user })}
                          disabled={user.role === 'admin' || user.user_id === currentUser?.id}
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                        <Select
                          value={user.role}
                          onValueChange={(val: AppRole) => handleRoleChange(user, val)}
                          disabled={user.role === 'admin' || user.user_id === currentUser?.id || updating}
                        >
                          <SelectTrigger className="h-8 w-[98px] px-2.5 text-xs font-semibold bg-card border-input text-foreground rounded-lg disabled:opacity-75 disabled:cursor-not-allowed focus:border-primary focus:ring-primary/20 transition-colors shadow-xs shrink-0 justify-between">
                            <SelectValue placeholder="Role" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border border-border bg-popover p-1 shadow-lg min-w-[115px]">
                            <SelectItem value="admin" className="text-xs font-semibold text-destructive py-2" disabled>ADMIN</SelectItem>
                            <SelectItem value="user" className="text-xs font-medium py-2">USER</SelectItem>
                            <SelectItem value="trial_user" className="text-xs font-medium py-2">TRIAL</SelectItem>
                            <SelectItem value="coach" className="text-xs font-medium text-purple-400 py-2">COACH</SelectItem>
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
        <DialogContent className="sm:max-w-[440px] rounded-2xl bg-card border border-border p-6 sm:p-7 shadow-2xl">
          <DialogHeader className="space-y-2 pb-2 border-b border-border/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <UsersIcon className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground tracking-tight">
                  Assign User to Group
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Select a workout or coaching group for this member.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Select Group
              </label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger className="h-11 border-input bg-card text-foreground rounded-xl focus:border-primary focus:ring-primary/20 text-sm px-3.5">
                  <SelectValue placeholder="Choose a group..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-border bg-popover p-1.5 shadow-xl">
                  {groups.length === 0 ? (
                    <SelectItem value="none" disabled className="text-muted-foreground text-xs py-2.5 px-3">
                      No groups available
                    </SelectItem>
                  ) : (
                    groups.map((g) => (
                      <SelectItem key={g.id} value={g.id} className="rounded-lg py-2.5 px-3 text-sm focus:bg-muted focus:text-foreground">
                        <span className="font-medium text-foreground">{g.name}</span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2.5 sm:gap-2.5 pt-2 border-t border-border/60">
            <Button
              variant="outline"
              className="h-10 border-border rounded-xl text-xs font-semibold px-5 hover:bg-muted"
              onClick={() => setIsAssignGroupOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignGroup}
              disabled={!selectedGroupId || assigning}
              className="h-10 bg-[#07AC7D] hover:bg-[#06966D] text-white font-semibold text-xs px-5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
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

      {/* ── Assign Coaches Dialog (Dual-Coach Assignment) ── */}
      <Dialog open={isAssignCoachOpen} onOpenChange={setIsAssignCoachOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl bg-card border border-border p-6 sm:p-7 shadow-2xl text-foreground">
          <DialogHeader className="space-y-2 pb-2 border-b border-border/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground tracking-tight">
                  Dual-Coach Assignment
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Assign primary and secondary coaches to <span className="font-semibold text-foreground">{selectedUserForCoach?.full_name || selectedUserForCoach?.email}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Primary Coach Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Primary Coach
                </label>
                <span className="text-[11px] text-purple-400 font-medium bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                  Main point of contact
                </span>
              </div>
              <Select
                value={primaryCoachSelection}
                onValueChange={(val) => {
                  setPrimaryCoachSelection(val);
                  if (val === secondaryCoachSelection && val !== "none") {
                    setSecondaryCoachSelection("none");
                  }
                }}
              >
                <SelectTrigger className="h-12 border-input bg-card text-foreground rounded-xl focus:border-purple-500 focus:ring-purple-500/20 text-sm px-3.5">
                  <SelectValue placeholder="Choose primary coach..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-border bg-popover p-1.5 shadow-xl max-h-64">
                  <SelectItem value="none" className="rounded-lg py-2.5 px-3 text-sm text-muted-foreground">
                    None (Unassign Primary)
                  </SelectItem>
                  {coachesList.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="rounded-lg py-2.5 px-3 text-sm my-0.5">
                      <div className="flex flex-col text-left space-y-0.5">
                        <span className="font-semibold text-foreground text-sm leading-tight">{c.full_name}</span>
                        {c.email && <span className="text-xs text-muted-foreground leading-normal">{c.email}</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Secondary Coach Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Secondary Coach
                </label>
                <span className="text-[11px] text-teal-400 font-medium bg-teal-500/10 px-2 py-0.5 rounded-md border border-teal-500/20">
                  Optional Co-Coach
                </span>
              </div>
              <Select
                value={secondaryCoachSelection}
                onValueChange={(val) => {
                  setSecondaryCoachSelection(val);
                  if (val === primaryCoachSelection && val !== "none") {
                    setPrimaryCoachSelection("none");
                  }
                }}
              >
                <SelectTrigger className="h-12 border-input bg-card text-foreground rounded-xl focus:border-teal-500 focus:ring-teal-500/20 text-sm px-3.5">
                  <SelectValue placeholder="Choose secondary coach (optional)..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-border bg-popover p-1.5 shadow-xl max-h-64">
                  <SelectItem value="none" className="rounded-lg py-2.5 px-3 text-sm text-muted-foreground">
                    None (No secondary coach)
                  </SelectItem>
                  {coachesList
                    .filter((c) => c.id !== primaryCoachSelection)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id} className="rounded-lg py-2.5 px-3 text-sm my-0.5">
                        <div className="flex flex-col text-left space-y-0.5">
                          <span className="font-semibold text-foreground text-sm leading-tight">{c.full_name}</span>
                          {c.email && <span className="text-xs text-muted-foreground leading-normal">{c.email}</span>}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Help Note */}
            <div className="p-4 bg-muted/40 rounded-xl border border-border text-xs text-muted-foreground space-y-1.5 leading-relaxed">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-primary" />
                Dual Permissions Access
              </p>
              <p>Both assigned coaches will receive full dashboard permissions to monitor check-ins, view health history, assign workouts, and track progress.</p>
            </div>
          </div>

          <DialogFooter className="gap-2.5 sm:gap-2.5 pt-2 border-t border-border/60">
            <Button
              variant="outline"
              className="h-10 border-border rounded-xl text-xs font-semibold px-5 hover:bg-muted"
              onClick={() => setIsAssignCoachOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedUserForCoach) {
                  handleDirectAssignCoaches(
                    selectedUserForCoach.id,
                    primaryCoachSelection,
                    secondaryCoachSelection
                  );
                }
              }}
              disabled={assigning}
              className="h-10 bg-[#07AC7D] hover:bg-[#06966D] text-white font-semibold text-xs px-5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
            >
              {assigning ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4 mr-2" />
              )}
              Save Coach Assignment
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

      {/* ── Delete User Confirmation Dialog ── */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(o) => !deleting && setDeleteDialog((prev) => ({ ...prev, open: o }))}>
        <AlertDialogContent className="max-w-xs rounded-2xl bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[18px] font-semibold text-foreground">Delete this user?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              This permanently deletes <b className="text-foreground">{deleteDialog.user?.email}</b> and all associated data (workouts, check-ins, photos, notifications). This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel className="text-xs h-8 flex-1 border-border rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deleting}
              className="text-xs h-8 flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Client Profile Dialog ── */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-card border border-border text-foreground rounded-2xl p-6 custom-scrollbar">
          <DialogHeader className="border-b border-border pb-4 mb-4">
            <DialogTitle className="text-[18px] font-semibold flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                {(selectedProfileUser?.full_name?.[0] || selectedProfileUser?.email?.[0] || "U").toUpperCase()}
              </div>
              <div>
                <span className="text-foreground block text-lg font-bold">{selectedProfileUser?.full_name || "Client Profile"}</span>
                <span className="text-xs text-muted-foreground font-normal">{selectedProfileUser?.email}</span>
              </div>
            </DialogTitle>
            <div className="pt-2 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-muted-foreground">
              <span className="font-normal text-muted-foreground">
                Joined on {selectedProfileUser?.created_at ? new Date(selectedProfileUser.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
              </span>
              {selectedProfileUser?.role === 'user' && (
                <div className="flex flex-wrap items-center gap-4 bg-muted/40 px-3.5 py-2 rounded-xl border border-border/70">
                  {/* Primary Coach */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground tracking-tight">Primary Coach:</span>
                    <Select
                      value={selectedProfileUser?.coach_id || "none"}
                      onValueChange={(coachId) =>
                        handleDirectAssignCoaches(
                          selectedProfileUser.id,
                          coachId,
                          selectedProfileUser.secondary_coach_id || null
                        )
                      }
                      disabled={assigning}
                    >
                      <SelectTrigger className="h-8 text-xs w-44 bg-card border-input text-foreground font-medium px-3 rounded-lg focus:border-purple-500 focus:ring-purple-500/20 shadow-xs">
                        <SelectValue placeholder="None (Unassigned)" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border border-border bg-popover p-1 shadow-lg">
                        <SelectItem value="none" className="rounded-lg py-2 px-3 text-xs text-muted-foreground">
                          None (Unassigned)
                        </SelectItem>
                        {coachesList.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="rounded-lg py-2 px-3 text-xs">
                            <span className="font-medium text-foreground">{c.full_name}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Divider */}
                  <div className="hidden sm:block h-4 w-px bg-border" />

                  {/* Secondary Coach */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground tracking-tight">Secondary Coach:</span>
                    <Select
                      value={selectedProfileUser?.secondary_coach_id || "none"}
                      onValueChange={(secondaryId) =>
                        handleDirectAssignCoaches(
                          selectedProfileUser.id,
                          selectedProfileUser.coach_id || null,
                          secondaryId
                        )
                      }
                      disabled={assigning}
                    >
                      <SelectTrigger className="h-8 text-xs w-44 bg-card border-input text-foreground font-medium px-3 rounded-lg focus:border-teal-500 focus:ring-teal-500/20 shadow-xs">
                        <SelectValue placeholder="None (Optional)" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border border-border bg-popover p-1 shadow-lg">
                        <SelectItem value="none" className="rounded-lg py-2 px-3 text-xs text-muted-foreground">
                          None (Optional)
                        </SelectItem>
                        {coachesList
                          .filter((c) => c.id !== selectedProfileUser?.coach_id)
                          .map((c) => (
                            <SelectItem key={c.id} value={c.id} className="rounded-lg py-2 px-3 text-xs">
                              <span className="font-medium text-foreground">{c.full_name}</span>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
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
                  <span className="text-2xl font-semibold text-foreground tracking-tight leading-none">{profileData.workoutsSummary.totalCount}</span>
                </div>
                <div className="text-center border-x border-border">
                  <span className="text-sm font-medium text-muted-foreground block mb-1">Sessions Done</span>
                  <span className="text-2xl font-semibold text-emerald-500 tracking-tight leading-none">{profileData.workoutsSummary.completedCount}</span>
                </div>
                <div className="text-center">
                  <span className="text-sm font-medium text-muted-foreground block mb-1">Est. Kcal Burned</span>
                  <span className="text-2xl font-semibold text-amber-500 tracking-tight leading-none">{profileData.workoutsSummary.totalCalories.toLocaleString()}</span>
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

            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}