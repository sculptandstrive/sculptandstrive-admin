import { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Users as UsersIcon, 
  Shield, 
  ShieldAlert, 
  ShieldCheck, HeartPulse, ClipboardCheck, 
  UserCog, 
  Search, 
  RefreshCw, 
  Loader2, 
  UserPlus, 
  Trash2
} from "lucide-react";
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


function renderSafeText(val: any, fallback = "None declared."): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "string") return val.trim() || fallback;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) {
    if (val.length === 0) return fallback;
    return val.map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(", ");
  }
  if (typeof val === "object") {
    const vals = Object.values(val).filter((v) => v !== null && v !== undefined && v !== "");
    if (vals.length === 0) return fallback;
    return vals.map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(", ");
  }
  return String(val);
}

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
        supabase.from("user_roles").select("user_id, role, expiry_time, created_at")
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

      let profileDetailsData: any[] = [];
      try {
        const detailsRes = await supabase.from("profile_details").select("user_id, first_name, last_name, phone");
        if (!detailsRes.error && detailsRes.data) {
          profileDetailsData = detailsRes.data;
        }
      } catch (err) {
        // Table profile_details may not exist in schema
      }

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const profileMap = new Map<string, string>();
      (profilesRes.data || []).forEach(p => {
        if (p.user_id) profileMap.set(p.user_id, p.full_name || p.email || "Unknown");
        if (p.id) profileMap.set(p.id, p.full_name || p.email || "Unknown");
      });
      const rolesMap = new Map((rolesRes.data || []).map(r => [r.user_id, r.role]));
      
      const detailsMap = new Map<string, any>();
      profileDetailsData.forEach(pd => {
        if (pd.user_id) detailsMap.set(pd.user_id, pd);
      });

      const clientCoachesMap = new Map<string, Array<{ id: string; name: string | null }>>();
      for (const cc of coachClientsData) {
        const coachName = profileMap.get(cc.coach_id) || null;
        const list = clientCoachesMap.get(cc.client_id) || [];
        if (!list.some(item => item.id === cc.coach_id)) {
          list.push({ id: cc.coach_id, name: coachName });
          clientCoachesMap.set(cc.client_id, list);
        }
      }

      const existingUserIds = new Set<string>();
      const formattedUsers: UserWithRole[] = [];

      // 1. Process all existing profiles
      (profilesRes.data || []).forEach((profile) => {
        const primaryId = profile.id || profile.user_id;
        const authUserId = profile.user_id || profile.id;
        if (authUserId) existingUserIds.add(authUserId);
        if (primaryId) existingUserIds.add(primaryId);

        const coachList = clientCoachesMap.get(profile.id) || clientCoachesMap.get(profile.user_id) || [];
        const primaryCoach = coachList[0] || null;
        const secondaryCoach = coachList[1] || null;
        const coaches = coachList.map((c, idx) => ({
          id: c.id,
          name: c.name,
          role: (idx === 0 ? 'Primary' : 'Secondary') as 'Primary' | 'Secondary',
        }));

        const detail = detailsMap.get(authUserId) || detailsMap.get(primaryId);
        const derivedName = profile.full_name || 
          (detail ? `${detail.first_name || ''} ${detail.last_name || ''}`.trim() : null) || 
          (profile.email ? profile.email.split('@')[0] : null) || 
          "New Member";

        const derivedEmail = profile.email || detail?.email || null;
        const assignedRole = ((rolesMap.get(profile.user_id) || rolesMap.get(profile.id) || profile.role) as AppRole) || "trial_user";

        formattedUsers.push({
          id: primaryId || authUserId,
          user_id: authUserId || primaryId,
          email: derivedEmail,
          full_name: derivedName,
          avatar_url: profile.avatar_url,
          created_at: profile.created_at || new Date().toISOString(),
          role: assignedRole,
          coach_id: primaryCoach?.id || null,
          coach_name: primaryCoach?.name || null,
          secondary_coach_id: secondaryCoach?.id || null,
          secondary_coach_name: secondaryCoach?.name || null,
          coaches,
        });
      });

      // 2. Include any user_roles entries that don't have a profile row yet
      (rolesRes.data || []).forEach((roleItem) => {
        const uid = roleItem.user_id;
        if (!uid || existingUserIds.has(uid)) return;
        existingUserIds.add(uid);

        const detail = detailsMap.get(uid);
        const derivedName = (detail ? `${detail.first_name || ''} ${detail.last_name || ''}`.trim() : null) || "New Member";
        const derivedEmail = detail?.email || (typeof uid === 'string' && uid.includes('@') ? uid : null);

        const coachList = clientCoachesMap.get(uid) || [];
        const primaryCoach = coachList[0] || null;
        const secondaryCoach = coachList[1] || null;
        const coaches = coachList.map((c, idx) => ({
          id: c.id,
          name: c.name,
          role: (idx === 0 ? 'Primary' : 'Secondary') as 'Primary' | 'Secondary',
        }));

        formattedUsers.push({
          id: uid,
          user_id: uid,
          email: derivedEmail,
          full_name: derivedName,
          avatar_url: null,
          created_at: roleItem.created_at || new Date().toISOString(),
          role: (roleItem.role as AppRole) || "trial_user",
          coach_id: primaryCoach?.id || null,
          coach_name: primaryCoach?.name || null,
          secondary_coach_id: secondaryCoach?.id || null,
          secondary_coach_name: secondaryCoach?.name || null,
          coaches,
        });
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

    const channel = supabase
      .channel("admin_users_sync_feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          fetchUsers();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_roles" },
        () => {
          fetchUsers();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coach_clients" },
        () => {
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, fetchUsers, fetchGroups]);

  const filteredUsers = useMemo(() => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return users;
    return users.filter(u =>
      (u.full_name && u.full_name.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.user_id && u.user_id.toLowerCase().includes(term)) ||
      (u.role && u.role.toLowerCase().includes(term))
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
      let newExpiry: string | null = null;
      if (roleChangeDialog.newRole === 'user') {
        const d = new Date();
        d.setDate(d.getDate() + 29);
        newExpiry = d.toISOString();
      }
      else if (roleChangeDialog.newRole === 'trial_user') {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        newExpiry = d.toISOString();
      }
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", roleChangeDialog.user.user_id)
        .maybeSingle();

      let roleErr;
      if (existingRole) {
        const { error } = await supabase
          .from("user_roles")
          .update({
            role: roleChangeDialog.newRole,
            expiry_time: newExpiry,
          })
          .eq("user_id", roleChangeDialog.user.user_id);
        roleErr = error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({
            user_id: roleChangeDialog.user.user_id,
            role: roleChangeDialog.newRole,
            expiry_time: newExpiry,
          });
        roleErr = error;
      }

      if (roleErr) throw roleErr;
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
      <PageHeader title="User Management" description="Real-time access control & member role directory.">
        <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-end lg:w-auto">
          <div className="relative w-full sm:w-[280px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7186A0]" />
            <Input
              placeholder="Search name, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 w-full rounded-2xl border border-white/80 bg-[#E2ECE9] shadow-[inset_2px_2px_4px_rgba(165,185,180,0.45),inset_-2px_-2px_4px_rgba(255,255,255,0.85)] pl-10 text-sm font-semibold text-[#0F172A] placeholder:text-[#7186A0] focus-visible:ring-2 focus-visible:ring-[#08B594]/30"
            />
          </div>
          <Button
            variant="outline"
            onClick={fetchUsers}
            className="h-11 gap-2 rounded-2xl border border-white bg-white shadow-[4px_4px_10px_rgba(145,170,165,0.18),-3px_-3px_8px_rgba(255,255,255,0.95)] px-4 font-bold text-[#334155] hover:bg-[#F0F7F5] active:scale-95 transition-all"
          >
            <RefreshCw className={`h-4 w-4 text-[#08B594] ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <div className="flex h-11 items-center px-4 rounded-2xl border border-white/80 bg-[#E2ECE9] shadow-[inset_1px_1px_2px_rgba(165,185,180,0.4),inset_-1px_-1px_2px_rgba(255,255,255,0.8)] text-xs font-black text-[#08B594] tracking-wider uppercase shrink-0">
            {filteredUsers.length} {filteredUsers.length === 1 ? "Member" : "Members"}
          </div>
        </div>
      </PageHeader>

      <div className="rounded-[26px] border border-white/90 bg-white shadow-[6px_6px_20px_rgba(145,170,165,0.18),-4px_-4px_14px_rgba(255,255,255,0.98)] overflow-hidden">
        {/* ── Mobile Card List (hidden on md+) ── */}
        <div className="md:hidden divide-y divide-[#E2ECE9]">
          {filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-sm font-semibold text-[#7186A0]">
              No members found matching your search.
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div key={user.id} className="p-4 space-y-3">
                {/* Name + Role row */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#0CC194]/15 via-[#08B594]/20 to-[#069D80]/25 border border-white shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.9),2px_2px_5px_rgba(8,169,130,0.12)] flex items-center justify-center text-xs font-black text-[#08B594] shrink-0">
                    {(user.full_name?.[0] || user.email?.[0] || "U").toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#0F172A] truncate">{user.full_name || "New Member"}</p>
                    <p className="text-xs font-semibold text-[#7186A0] truncate" title={user.email || user.user_id || ""}>
                      {user.email || (user.user_id ? (user.user_id.includes('@') ? user.user_id : `ID: ${user.user_id.slice(0, 12)}...`) : "not set")}
                    </p>
                  </div>
                  <span className={`inline-flex items-center justify-center text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-white/60 shadow-[inset_1px_1px_2px_rgba(165,185,180,0.3)] shrink-0 ${
                    user.role === 'admin'
                      ? "bg-rose-100 text-rose-600"
                      : user.role === 'coach'
                      ? "bg-purple-100 text-purple-600"
                      : "bg-[#E2ECE9] text-[#0F172A]"
                  }`}>
                    {user.role === 'trial_user' ? 'Trial' : user.role.toUpperCase()}
                  </span>
                </div>
                {/* Coach info on mobile */}
                {user.role === 'user' && (
                  <div className="flex flex-wrap gap-1.5 items-center text-xs bg-[#E2ECE9] shadow-[inset_1.5px_1.5px_3px_rgba(165,185,180,0.35)] p-2.5 rounded-xl border border-white/50">
                    <span className="text-[#7186A0] font-bold text-[10px] uppercase">Coaches:</span>
                    {user.coach_name && user.secondary_coach_name ? (
                      <>
                        <span className="bg-purple-50 text-purple-600 border border-purple-200 text-[10px] px-2 py-0.5 font-bold rounded-lg">
                          1° {user.coach_name}
                        </span>
                        <span className="bg-teal-50 text-teal-600 border border-teal-200 text-[10px] px-2 py-0.5 font-bold rounded-lg">
                          2° {user.secondary_coach_name}
                        </span>
                      </>
                    ) : user.coach_name ? (
                      <span className="bg-purple-50 text-purple-600 border border-purple-200 text-[10px] px-2 py-0.5 font-bold rounded-lg">
                        {user.coach_name}
                      </span>
                    ) : (
                      <span className="text-[#94A3B8] italic text-[11px]">None assigned</span>
                    )}
                  </div>
                )}
                {/* Action buttons row - responsive clean flow */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <div className="flex items-center gap-1.5 flex-1 min-w-[160px]">
                    {user.role === 'user' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 text-xs font-bold bg-[#F5F3FF] border border-white shadow-[2px_2px_5px_rgba(180,200,196,0.2)] hover:bg-[#EDE9FE] text-[#7C3AED] rounded-xl flex items-center justify-center gap-1 shrink-0"
                        onClick={() => {
                          setSelectedUserForCoach(user);
                          setPrimaryCoachSelection(user.coach_id || "none");
                          setSecondaryCoachSelection(user.secondary_coach_id || "none");
                          setIsAssignCoachOpen(true);
                        }}
                      >
                        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                        <span>Coach</span>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5 text-xs font-bold bg-[#F0F7F5] border border-white shadow-[2px_2px_5px_rgba(180,200,196,0.2)] hover:bg-[#E6F2EE] text-[#08B594] rounded-xl flex items-center justify-center gap-1 shrink-0"
                      onClick={() => { setSelectedUserId(user.user_id); setIsAssignGroupOpen(true); }}
                    >
                      <UsersIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>Group</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5 text-xs font-bold bg-white border border-white shadow-[2px_2px_5px_rgba(180,200,196,0.2)] hover:bg-[#F8FAFC] text-[#334155] rounded-xl flex items-center justify-center gap-1 shrink-0"
                      onClick={() => { setSelectedProfileUser(user); setProfileDialogOpen(true); fetchClientProfile(user.user_id); }}
                    >
                      <span>Profile</span>
                    </Button>
                  </div>
                  <div className="flex items-center gap-1.5 ml-auto shrink-0">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-[#94A3B8] hover:text-[#EF4444] hover:bg-rose-50 border border-white/60 bg-white shadow-[2px_2px_5px_rgba(180,200,196,0.15)] rounded-xl"
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
                      <SelectTrigger className="h-8 w-24 text-xs font-bold bg-[#E2ECE9] shadow-[inset_1px_1px_2px_rgba(165,185,180,0.4)] border border-white/60 text-[#0F172A] rounded-xl">
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border border-white bg-white p-1.5 shadow-[6px_6px_20px_rgba(145,170,165,0.2)] min-w-[120px]">
                        <SelectItem value="admin" className="text-xs font-bold text-rose-600 py-2 px-3 rounded-xl" disabled>ADMIN</SelectItem>
                        <SelectItem value="user" className="text-xs font-bold text-[#0F172A] py-2 px-3 rounded-xl">USER</SelectItem>
                        <SelectItem value="trial_user" className="text-xs font-bold text-[#08B594] py-2 px-3 rounded-xl">TRIAL</SelectItem>
                        <SelectItem value="coach" className="text-xs font-bold text-purple-600 py-2 px-3 rounded-xl">COACH</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Desktop Table (hidden on mobile) ── */}
        <div className="hidden md:block overflow-x-auto">
          <Table className="min-w-full table-fixed border-collapse">
            <TableHeader className="bg-[#F4F9F7] border-b border-[#E2ECE9]">
              <TableRow className="border-none hover:bg-transparent">
                <TableHead className="w-[190px] py-4 pl-6 text-xs font-black uppercase tracking-wider text-[#7186A0]">Member Name</TableHead>
                <TableHead className="w-[230px] py-4 text-xs font-black uppercase tracking-wider text-[#7186A0]">Email Address</TableHead>
                <TableHead className="w-[190px] py-4 text-center text-xs font-black uppercase tracking-wider text-[#7186A0]">Current Role & Coaches</TableHead>
                <TableHead className="w-[500px] py-4 text-right pr-6 text-xs font-black uppercase tracking-wider text-[#7186A0]">Management</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-sm font-semibold text-[#7186A0]">
                    No members found matching your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-[#F8FAFC] border-b border-[#E2ECE9] last:border-0 transition-colors">
                    <TableCell className="py-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#0CC194]/15 via-[#08B594]/20 to-[#069D80]/25 border border-white shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.9),2px_2px_5px_rgba(8,169,130,0.12)] flex items-center justify-center text-xs font-black text-[#08B594] shrink-0">
                          {(user.full_name?.[0] || user.email?.[0] || "U").toUpperCase()}
                        </div>
                        <span className="text-sm font-bold text-[#0F172A] truncate block max-w-[130px]" title={user.full_name || ""}>
                          {user.full_name || "New Member"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-xs font-semibold text-[#7186A0]">
                      <span className="truncate block max-w-[200px]" title={user.email || user.user_id || ""}>
                        {user.email || (user.user_id ? (user.user_id.includes('@') ? user.user_id : `ID: ${user.user_id.slice(0, 12)}...`) : "not set")}
                      </span>
                    </TableCell>
                    <TableCell className="py-4 text-center">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <span className={`inline-flex items-center justify-center text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-white/60 shadow-[inset_1px_1px_2px_rgba(165,185,180,0.35)] ${
                          user.role === 'admin'
                            ? "bg-rose-50 text-rose-600 border-rose-200"
                            : user.role === 'coach'
                            ? "bg-purple-50 text-purple-600 border-purple-200"
                            : user.role === 'trial_user'
                            ? "bg-[#E2ECE9] text-[#08B594]"
                            : "bg-[#E2ECE9] text-[#0F172A]"
                        }`}>
                          {user.role === 'trial_user' ? 'TRIAL' : user.role.toUpperCase()}
                        </span>
                        {user.role === 'user' && (
                          user.coach_name && user.secondary_coach_name ? (
                            <div className="flex flex-col gap-0.5 items-center mt-0.5">
                              <span className="inline-flex items-center justify-center text-[9px] font-bold bg-purple-50 text-purple-600 border border-purple-200/60 h-4 px-2 rounded-md truncate max-w-[135px]" title={`Primary: ${user.coach_name}`}>
                                1° {user.coach_name}
                              </span>
                              <span className="inline-flex items-center justify-center text-[9px] font-bold bg-teal-50 text-teal-600 border border-teal-200/60 h-4 px-2 rounded-md truncate max-w-[135px]" title={`Secondary: ${user.secondary_coach_name}`}>
                                2° {user.secondary_coach_name}
                              </span>
                            </div>
                          ) : user.coach_name ? (
                            <span className="inline-flex items-center justify-center text-[9px] font-bold bg-purple-50 text-purple-600 border border-purple-200/60 h-4 px-2 rounded-md truncate max-w-[135px] mt-0.5" title={`Coach: ${user.coach_name}`}>
                              {user.coach_name}
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-[#94A3B8] mt-0.5">
                              No Coach
                            </span>
                          )
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-right pr-6">
                      <div className="flex items-center gap-2 justify-end">
                        {user.role !== 'admin' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 text-xs font-bold bg-[#F5F3FF] border border-white shadow-[2px_2px_6px_rgba(180,200,196,0.22),-2px_-2px_6px_rgba(255,255,255,0.9)] hover:bg-[#EDE9FE] text-[#7C3AED] rounded-xl flex items-center justify-center gap-1.5 whitespace-nowrap transition-all active:scale-95 shrink-0"
                            onClick={() => {
                              setSelectedUserForCoach(user);
                              setPrimaryCoachSelection(user.coach_id || "none");
                              setSecondaryCoachSelection(user.secondary_coach_id || "none");
                              setIsAssignCoachOpen(true);
                            }}
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-[#7C3AED] shrink-0" />
                            <span>Assign Coaches</span>
                          </Button>
                        ) : (
                          <div className="w-[120px] shrink-0" />
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs font-bold bg-[#F0FDF4] border border-white shadow-[2px_2px_6px_rgba(180,200,196,0.22),-2px_-2px_6px_rgba(255,255,255,0.9)] hover:bg-[#DCFCE7] text-[#16A34A] rounded-xl flex items-center justify-center gap-1.5 whitespace-nowrap transition-all active:scale-95 shrink-0"
                          onClick={() => { setSelectedUserId(user.user_id); setIsAssignGroupOpen(true); }}
                        >
                          <UsersIcon className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                          <span>Assign Group</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs font-bold bg-white border border-white shadow-[2px_2px_6px_rgba(180,200,196,0.22),-2px_-2px_6px_rgba(255,255,255,0.9)] hover:bg-[#F8FAFC] text-[#334155] rounded-xl flex items-center justify-center whitespace-nowrap transition-all active:scale-95 shrink-0"
                          onClick={() => { setSelectedProfileUser(user); setProfileDialogOpen(true); fetchClientProfile(user.user_id); }}
                        >
                          View Profile
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-[#94A3B8] hover:text-[#EF4444] hover:bg-rose-50 border border-white/80 bg-white shadow-[2px_2px_6px_rgba(180,200,196,0.18),-2px_-2px_6px_rgba(255,255,255,0.85)] rounded-xl transition-all flex items-center justify-center"
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
                          <SelectTrigger className="h-8 w-[98px] px-2.5 text-xs font-bold bg-[#E2ECE9] shadow-[inset_1.5px_1.5px_3px_rgba(165,185,180,0.4),inset_-1.5px_-1.5px_3px_rgba(255,255,255,0.8)] border border-white/60 text-[#0F172A] rounded-xl disabled:opacity-75 disabled:cursor-not-allowed transition-all shrink-0 justify-between">
                            <SelectValue placeholder="Role" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border border-white/90 bg-white p-1.5 shadow-[6px_6px_22px_rgba(145,170,165,0.25)] min-w-[130px]">
                            <SelectItem value="admin" className="text-xs font-bold text-rose-600 py-2 px-3 rounded-xl focus:bg-rose-50" disabled>ADMIN</SelectItem>
                            <SelectItem value="user" className="text-xs font-bold text-[#0F172A] py-2 px-3 rounded-xl focus:bg-[#E2ECE9]/50">USER</SelectItem>
                            <SelectItem value="trial_user" className="text-xs font-bold text-[#08B594] py-2 px-3 rounded-xl focus:bg-emerald-50">TRIAL</SelectItem>
                            <SelectItem value="coach" className="text-xs font-bold text-purple-600 py-2 px-3 rounded-xl focus:bg-purple-50">COACH</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Assign Group Dialog ── */}
      <Dialog open={isAssignGroupOpen} onOpenChange={setIsAssignGroupOpen}>
        <DialogContent className="sm:max-w-[440px] rounded-[26px] bg-white border border-white p-6 sm:p-7 shadow-[8px_8px_30px_rgba(145,170,165,0.25)]">
          <DialogHeader className="space-y-2 pb-3 border-b border-[#E2ECE9]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0CC194]/15 via-[#08B594]/20 to-[#069D80]/25 border border-white shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.9)] flex items-center justify-center text-[#08B594] shrink-0">
                <UsersIcon className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-[#0F172A] tracking-tight">
                  Assign User to Group
                </DialogTitle>
                <DialogDescription className="text-xs font-semibold text-[#7186A0] mt-0.5">
                  Select a workout or coaching group for this member.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#7186A0] uppercase tracking-wider">
                Select Group
              </label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger className="h-11 rounded-2xl border border-white/80 bg-[#E2ECE9] shadow-[inset_2px_2px_4px_rgba(165,185,180,0.45),inset_-2px_-2px_4px_rgba(255,255,255,0.85)] px-3 text-sm font-semibold text-[#0F172A]">
                  <SelectValue placeholder="Choose a group..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border border-white bg-white p-1.5 shadow-[6px_6px_20px_rgba(145,170,165,0.2)]">
                  {groups.length === 0 ? (
                    <SelectItem value="none" disabled className="text-muted-foreground text-xs py-2.5 px-3">
                      No groups available
                    </SelectItem>
                  ) : (
                    groups.map((g) => (
                      <SelectItem key={g.id} value={g.id} className="rounded-xl py-2.5 px-3 text-xs font-bold text-[#0F172A] hover:bg-[#F0F7F5] hover:text-[#08B594]">
                        <span>{g.name}</span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2.5 sm:gap-2.5 pt-2 border-t border-[#E2ECE9]">
            <Button
              variant="ghost"
              className="h-11 rounded-2xl border border-white bg-white shadow-[2px_2px_6px_rgba(180,200,196,0.2)] font-bold text-[#7186A0] hover:bg-[#F0F7F5] px-5"
              onClick={() => setIsAssignGroupOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignGroup}
              disabled={!selectedGroupId || assigning}
              className="h-11 bg-gradient-to-r from-[#08B594] via-[#07AB8C] to-[#069D80] text-white font-bold text-xs px-6 rounded-2xl disabled:opacity-50 shadow-[0_4px_12px_rgba(8,169,130,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:brightness-105 active:scale-95 transition-all"
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
        <DialogContent className="sm:max-w-[500px] rounded-[26px] bg-white border border-white p-6 sm:p-7 shadow-[8px_8px_30px_rgba(145,170,165,0.25)]">
          <DialogHeader className="space-y-2 pb-3 border-b border-[#E2ECE9]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.9)] shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-[#0F172A] tracking-tight">
                  Dual-Coach Assignment
                </DialogTitle>
                <DialogDescription className="text-xs font-semibold text-[#7186A0] mt-0.5">
                  Assign primary and secondary coaches to <span className="font-bold text-[#0F172A]">{selectedUserForCoach?.full_name || selectedUserForCoach?.email}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Primary Coach Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#7186A0] uppercase tracking-wider">
                  Primary Coach
                </label>
                <span className="text-[10px] text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200/60">
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
                <SelectTrigger className="h-11 rounded-2xl border border-white/80 bg-[#E2ECE9] shadow-[inset_2px_2px_4px_rgba(165,185,180,0.45),inset_-2px_-2px_4px_rgba(255,255,255,0.85)] px-3 text-sm font-semibold text-[#0F172A]">
                  <SelectValue placeholder="Choose primary coach..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border border-white bg-white p-1.5 shadow-[6px_6px_20px_rgba(145,170,165,0.2)] max-h-64">
                  <SelectItem value="none" className="rounded-xl py-2.5 px-3 text-xs font-bold text-[#7186A0]">
                    None (Unassign Primary)
                  </SelectItem>
                  {coachesList.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="rounded-xl py-2.5 px-3 text-xs font-bold text-[#0F172A] hover:bg-[#F0F7F5]">
                      <div className="flex flex-col text-left space-y-0.5">
                        <span className="font-bold text-[#0F172A] text-xs leading-tight">{c.full_name}</span>
                        {c.email && <span className="text-[10px] text-[#7186A0] leading-normal">{c.email}</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Secondary Coach Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#7186A0] uppercase tracking-wider">
                  Secondary Coach
                </label>
                <span className="text-[10px] text-[#08B594] font-bold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200/60">
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
                <SelectTrigger className="h-11 rounded-2xl border border-white/80 bg-[#E2ECE9] shadow-[inset_2px_2px_4px_rgba(165,185,180,0.45),inset_-2px_-2px_4px_rgba(255,255,255,0.85)] px-3 text-sm font-semibold text-[#0F172A]">
                  <SelectValue placeholder="Choose secondary coach..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border border-white bg-white p-1.5 shadow-[6px_6px_20px_rgba(145,170,165,0.2)] max-h-64">
                  <SelectItem value="none" className="rounded-xl py-2.5 px-3 text-xs font-bold text-[#7186A0]">
                    None (Unassign Secondary)
                  </SelectItem>
                  {coachesList.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="rounded-xl py-2.5 px-3 text-xs font-bold text-[#0F172A] hover:bg-[#F0F7F5]">
                      <div className="flex flex-col text-left space-y-0.5">
                        <span className="font-bold text-[#0F172A] text-xs leading-tight">{c.full_name}</span>
                        {c.email && <span className="text-[10px] text-[#7186A0] leading-normal">{c.email}</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2.5 pt-2 border-t border-[#E2ECE9]">
            <Button
              variant="ghost"
              className="h-11 rounded-2xl border border-white bg-white shadow-[2px_2px_6px_rgba(180,200,196,0.2)] font-bold text-[#7186A0] hover:bg-[#F0F7F5] px-5"
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
              className="h-11 bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 text-white font-bold text-xs px-6 rounded-2xl shadow-[0_4px_12px_rgba(124,58,237,0.35)] hover:brightness-105 active:scale-95 transition-all"
            >
              {assigning ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4 mr-2" />
              )}
              Save Coaches
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Role Change Dialog ── */}
      <AlertDialog open={roleChangeDialog.open} onOpenChange={(open) => !open && setRoleChangeDialog({ open: false, user: null, newRole: null })}>
        <AlertDialogContent className="rounded-[26px] bg-white border border-white p-6 sm:p-7 shadow-[8px_8px_30px_rgba(145,170,165,0.25)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-black text-[#0F172A]">Confirm Role Change</AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-semibold text-[#7186A0]">
              Are you sure you want to change the role of{" "}
              <span className="font-bold text-[#0F172A]">{roleChangeDialog.user?.full_name || roleChangeDialog.user?.email}</span> to{" "}
              <span className="font-black text-[#08B594] uppercase">{roleChangeDialog.newRole}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="h-11 rounded-2xl border border-white bg-white shadow-[2px_2px_6px_rgba(180,200,196,0.2)] font-bold text-[#7186A0] hover:bg-[#F0F7F5] px-5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRoleChange}
              className="h-11 bg-gradient-to-r from-[#08B594] via-[#07AB8C] to-[#069D80] text-white font-bold text-xs px-6 rounded-2xl shadow-[0_4px_12px_rgba(8,169,130,0.35)] hover:brightness-105 active:scale-95 transition-all"
            >
              Confirm Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete User Dialog ── */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, user: null })}>
        <AlertDialogContent className="rounded-[26px] bg-white border border-white p-6 sm:p-7 shadow-[8px_8px_30px_rgba(145,170,165,0.25)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-black text-rose-600">Delete User Account</AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-semibold text-[#7186A0]">
              Are you sure you want to permanently delete{" "}
              <span className="font-bold text-[#0F172A]">{deleteDialog.user?.full_name || deleteDialog.user?.email}</span>?
              This action cannot be undone and will remove all their records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="h-11 rounded-2xl border border-white bg-white shadow-[2px_2px_6px_rgba(180,200,196,0.2)] font-bold text-[#7186A0] hover:bg-[#F0F7F5] px-5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deleting}
              className="h-11 bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold text-xs px-6 rounded-2xl shadow-[0_4px_12px_rgba(239,68,68,0.35)] hover:brightness-105 active:scale-95 transition-all"
            >
              {deleting ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Profile Dialog ── */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[88vh] flex flex-col rounded-[26px] bg-white border border-white p-6 sm:p-8 shadow-2xl overflow-hidden">
          <DialogHeader className="border-b border-[#E2ECE9] pb-4 shrink-0 pr-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0CC194]/20 via-[#08B594]/25 to-[#069D80]/30 border border-white shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.9),2px_2px_6px_rgba(8,169,130,0.15)] flex items-center justify-center text-base font-black text-[#08B594] shrink-0">
                  {(selectedProfileUser?.full_name?.[0] || selectedProfileUser?.email?.[0] || "U").toUpperCase()}
                </div>
                <div>
                  <DialogTitle className="text-xl font-black text-[#0F172A] tracking-tight">
                    {selectedProfileUser?.full_name || "Member Profile"}
                  </DialogTitle>
                  <p className="text-xs font-semibold text-[#7186A0] mt-0.5">
                    {selectedProfileUser?.email} • Member Since {selectedProfileUser?.created_at ? new Date(selectedProfileUser.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recently"}
                  </p>
                </div>
              </div>
            </div>
          </DialogHeader>

          {profileLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-[#08B594]" />
              <p className="text-xs font-bold text-[#7186A0]">Retrieving client record...</p>
            </div>
          ) : !profileData ? (
            <p className="text-center py-20 text-[#7186A0] text-xs font-semibold">Failed to load profile details.</p>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-6 pt-3 pr-1">
              {/* Stats Summary Panel */}
              <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-[#E2ECE9] shadow-[inset_2px_2px_4px_rgba(165,185,180,0.45),inset_-2px_-2px_4px_rgba(255,255,255,0.85)] border border-white/60">
                <div className="text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7186A0] block mb-1">Workouts Assigned</span>
                  <span className="text-xl font-black text-[#0F172A] tracking-tight leading-none">{profileData.workoutsSummary.totalCount}</span>
                </div>
                <div className="text-center border-x border-white/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7186A0] block mb-1">Sessions Done</span>
                  <span className="text-xl font-black text-[#08B594] tracking-tight leading-none">{profileData.workoutsSummary.completedCount}</span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7186A0] block mb-1">Est. Kcal Burned</span>
                  <span className="text-xl font-black text-amber-500 tracking-tight leading-none">{profileData.workoutsSummary.totalCalories.toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Column 1: Health History */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[#08B594] flex items-center gap-1.5 uppercase tracking-wider border-b border-[#E2ECE9] pb-1.5">
                    <HeartPulse className="w-3.5 h-3.5" /> Health Questionnaire
                  </h4>
                  <div className="space-y-3 bg-[#E2ECE9] shadow-[inset_1.5px_1.5px_3px_rgba(165,185,180,0.35)] border border-white/60 p-4 rounded-2xl text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#7186A0] block mb-1">Medical Conditions</span>
                      <p className="text-[#0F172A] font-semibold bg-white p-3 rounded-xl border border-white shadow-[2px_2px_5px_rgba(180,200,196,0.15)] min-h-[40px]">
                        {renderSafeText(profileData.healthHistory?.medical_conditions)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#7186A0] block mb-1">Injuries</span>
                      <p className="text-[#0F172A] font-semibold bg-white p-3 rounded-xl border border-white shadow-[2px_2px_5px_rgba(180,200,196,0.15)] min-h-[40px]">
                        {renderSafeText(profileData.healthHistory?.injuries)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#7186A0] block mb-1">Allergies</span>
                      <p className="text-[#0F172A] font-semibold bg-white p-3 rounded-xl border border-white shadow-[2px_2px_5px_rgba(180,200,196,0.15)] min-h-[40px]">
                        {renderSafeText(profileData.healthHistory?.allergies)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#7186A0] block mb-1">Medications</span>
                      <p className="text-[#0F172A] font-semibold bg-white p-3 rounded-xl border border-white shadow-[2px_2px_5px_rgba(180,200,196,0.15)] min-h-[40px]">
                        {renderSafeText(profileData.healthHistory?.medications)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Column 2: Weekly Check-ins */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[#08B594] flex items-center gap-1.5 uppercase tracking-wider border-b border-[#E2ECE9] pb-1.5">
                    <ClipboardCheck className="w-3.5 h-3.5" /> Weekly Check-in Log
                  </h4>
                  {profileData.checkins.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-14 bg-[#E2ECE9] rounded-2xl border border-white/60 shadow-[inset_1.5px_1.5px_3px_rgba(165,185,180,0.35)]">
                      <ClipboardCheck className="w-8 h-8 text-[#7186A0]/50 mb-2" />
                      <p className="text-xs text-[#7186A0] font-bold">No check-ins submitted yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                      {profileData.checkins.map((c) => (
                        <div key={c.id} className="p-3.5 rounded-2xl bg-white border border-white shadow-[2px_2px_8px_rgba(145,170,165,0.15)] space-y-2 text-xs">
                          <div className="flex justify-between items-center border-b border-[#E2ECE9] pb-1.5">
                            <span className="text-xs font-bold text-[#0F172A]">{new Date(c.checkin_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                            <span className="text-[10px] font-black text-[#08B594] bg-[#E2ECE9] px-2 py-0.5 rounded-lg border border-white/60 shadow-[inset_1px_1px_2px_rgba(165,185,180,0.3)]">{c.weight_kg} kg</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-[11px]">
                            <div>
                              <span className="text-[10px] font-bold uppercase text-[#7186A0] block">Energy</span>
                              <span className="text-[#0F172A] font-bold">{c.energy_level}/5</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase text-[#7186A0] block">Mood</span>
                              <span className="text-[#0F172A] font-bold capitalize">{c.mood}</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase text-[#7186A0] block">Sleep</span>
                              <span className="text-[#0F172A] font-bold">{c.sleep_hours ? `${c.sleep_hours} hrs` : "—"}</span>
                            </div>
                          </div>
                          {c.notes && (
                            <div className="bg-[#E2ECE9] p-2.5 rounded-xl border border-white/60 text-[11px] font-medium text-[#334155]">
                              <span className="text-[10px] font-bold uppercase text-[#7186A0] block mb-0.5">Notes:</span>
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