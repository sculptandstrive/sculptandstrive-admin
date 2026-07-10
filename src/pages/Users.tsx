import { useState, useEffect, useMemo, useCallback } from "react";
import { Users as UsersIcon, Shield, ShieldAlert, ShieldCheck, UserCog, Search, RefreshCw, Loader2, UserPlus } from "lucide-react";
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
  coach_name?: string | null;
}


const roleConfig: Record<AppRole, { label: string; color: string; icon: typeof Shield }> = {
  admin: { label: "Admin", color: "bg-destructive/10 text-destructive border-destructive/20", icon: ShieldAlert },
  user: { label: "User", color: "bg-muted text-muted-foreground border-border", icon: UserCog },
  trial_user: { label: 'Trial User', color: "bg-muted text-muted-foreground border-border", icon: UserCog },
  coach: { label: 'Coach', color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20", icon: ShieldCheck }
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
        }
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
      const [profilesRes, rolesRes, coachClientsRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("coach_clients").select("client_id, coach_id, profiles:coach_id(full_name)")
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const rolesMap = new Map(rolesRes.data.map(r => [r.user_id, r.role]));
      const coachMap = new Map((coachClientsRes?.data || []).map((cc: any) => [cc.client_id, cc.profiles?.full_name]));

      const formattedUsers: UserWithRole[] = (profilesRes.data || []).map((profile) => ({
        id: profile.id,
        user_id: profile.user_id,
        email: profile.email,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        created_at: profile.created_at,
        role: (rolesMap.get(profile.user_id) as AppRole) || "trial_user",
        coach_name: coachMap.get(profile.user_id) || null,
      }));

      setUsers(formattedUsers);
    } catch (error: any) {
      toast({ title: "Sync Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchCoachesList = async () => {
    setLoadingCoaches(true);
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          profiles:user_id(full_name, email)
        `)
        .eq("role", "coach");
      if (error) throw error;
      const formatted = (data || []).map((item: any) => ({
        id: item.user_id,
        full_name: item.profiles?.full_name || "Unknown Coach",
        email: item.profiles?.email || "",
      }));
      setCoachesList(formatted);
    } catch (error: any) {
      console.error("Error fetching coaches list:", error);
    } finally {
      setLoadingCoaches(false);
    }
  };

  const handleDirectAssignCoach = async (clientId: string, coachId: string) => {
    try {
      setAssigning(true);
      // Clear existing assignment if any
      await supabase
        .from("coach_clients")
        .delete()
        .eq("client_id", clientId);

      if (coachId && coachId !== "none") {
        // Insert new assignment
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

      // Find the coach name to update the local dialog state in real-time
      const assignedCoach = coachesList.find(c => c.id === coachId);
      const coachName = assignedCoach ? assignedCoach.full_name : null;

      // Update selected profile user locally so the dropdown reflects the change instantly
      setSelectedProfileUser(prev => prev ? { ...prev, coach_name: coachName } : null);

      fetchUsers(); // Refresh user list in background
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
      // Check if user is already in a group
      const { data: existing } = await supabase
        .from("group_members")
        .select("id")
        .eq("user_id", selectedUserId)
        .maybeSingle();

      if (existing) {
        // Update existing membership
        const { error } = await supabase
          .from("group_members")
          .update({ group_id: selectedGroupId })
          .eq("user_id", selectedUserId);

        if (error) throw error;
        toast({ title: "Success", description: "User's group updated." });
      } else {
        // Add new membership
        const { error } = await supabase
          .from("group_members")
          .insert({ user_id: selectedUserId, group_id: selectedGroupId });

        if (error) throw error;
        toast({ title: "Success", description: "User assigned to group." });
      }

      setIsAssignGroupOpen(false);
      setSelectedUserId("");
      setSelectedGroupId("");
      fetchUsers(); // Refresh user list
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
    setRoleChangeDialog({ open: true, user, newRole });
  };

  const confirmRoleChange = async () => {
    if (!roleChangeDialog.user || !roleChangeDialog.newRole) return;
    setUpdating(true);
    try {
      let newExpiry = new Date();
      if (roleChangeDialog.newRole === 'user') {
        newExpiry.setDate(newExpiry.getDate() + 29);
      }
      else if (roleChangeDialog.newRole === 'trial_user') {
        newExpiry.setDate(newExpiry.getDate() + 3);
      }
      const { error } = await supabase.from("user_roles").update({
        role: roleChangeDialog.newRole,
        expiry_time: newExpiry
      }).eq("user_id", roleChangeDialog.user.user_id);

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
        <Button onClick={fetchUsers} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Sync
        </Button>
      </PageHeader>

      <Card className="border-muted shadow-none overflow-hidden">
        <CardHeader className="p-5 border-b flex flex-row items-center justify-between space-y-0 bg-muted/10">
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="w-4 h-4 text-primary" />
            Registry ({filteredUsers.length})
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Filter by name/email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 w-64 text-sm rounded-[10px] bg-background border"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-full table-fixed border-collapse">
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="w-[200px] pl-6">Member Name</TableHead>
                  <TableHead className="w-[250px]">Email Address</TableHead>
                  <TableHead className="w-[120px] text-center">Current Role</TableHead>
                  <TableHead className="w-[240px] text-right pr-6">Management</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/20 border-b last:border-0 transition-colors">
                    <TableCell className="py-2 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-[10px] font-bold shrink-0">
                          {(user.full_name?.[0] || user.email?.[0] || "U").toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold truncate block max-w-[140px]" title={user.full_name || ""}>
                          {user.full_name || "Unnamed User"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-sm text-slate-500">
                      <span className="truncate block max-w-[220px]" title={user.email || ""}>
                        {user.email || "not set"}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 text-center">
                      <Badge variant="outline" className={`${roleConfig[user.role].color} text-[9px] px-2 py-0 h-4 border-none uppercase font-bold`}>
                        {user.role === 'trial_user' ? 'Trial User' : user.role}
                      </Badge>
                      {user.role === 'user' && (
                        <span className="block text-[10px] text-muted-foreground mt-1">
                          Coach: {user.coach_name || "Unassigned"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-2 text-right pr-6">
                      <div className="flex items-center gap-2 justify-end">
                        {/* ── NEW: Assign Group Button ── */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 w-28 text-[10px] bg-background"
                          onClick={() => {
                            setSelectedUserId(user.user_id);
                            setIsAssignGroupOpen(true);
                          }}
                        >
                          <UsersIcon className="w-3 h-3 mr-1" />
                          Assign Group
                        </Button>

                        
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 w-28 text-[10px] bg-background"
                          onClick={() => {
                            setSelectedProfileUser(user);
                            setProfileDialogOpen(true);
                            fetchClientProfile(user.user_id);
                          }}
                        >
                          View Profile
                        </Button>
                        <Select value={user.role} onValueChange={(val: AppRole) => handleRoleChange(user, val)} disabled={user.user_id === currentUser?.id || updating}>
                          <SelectTrigger className="h-7 w-28 text-[10px] bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin" className="text-xs font-bold text-destructive">ADMIN</SelectItem>
                            <SelectItem value="user" className="text-xs font-medium">USER</SelectItem>
                            <SelectItem value="trial_user" className="text-xs font-medium">TRIAL USER</SelectItem>
                            <SelectItem value="coach" className="text-xs font-medium text-indigo-600">COACH</SelectItem>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Assign User to Group
            </DialogTitle>
            <DialogDescription>
              Select a group to assign this user to.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-300">Select Group</p>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a group..." />
                </SelectTrigger>
                <SelectContent>
                  {groups.length === 0 ? (
                    <SelectItem value="none" disabled className="text-slate-500">
                      No groups available
                    </SelectItem>
                  ) : (
                    groups.map((g) => (
                      <SelectItem key={g.id} value={g.id} className="hover:bg-[#2dd4bf]/10">
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
              onClick={() => setIsAssignGroupOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignGroup}
              disabled={!selectedGroupId || assigning}
              className="bg-emerald-600 text-white"
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
        <AlertDialogContent className="max-w-xs rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Modify Permissions?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Assign <b>{roleChangeDialog.newRole?.toUpperCase()}</b> access to this account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel className="text-xs h-8 flex-1">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange} className="text-xs h-8 flex-1">Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Client Profile Dialog ── */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-background border border-border text-foreground rounded-xl p-5 custom-scrollbar">
          <DialogHeader className="border-b border-border pb-4 mb-4">
            <DialogTitle className="text-base font-semibold flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#1e293b]/10 flex items-center justify-center text-xs font-black text-[#1e293b]">
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
                  <span className="font-semibold text-[#1e293b] dark:text-slate-300">Assign Coach:</span>
                  <Select
                    value={
                      coachesList.find(c => c.full_name === selectedProfileUser?.coach_name)?.id || "none"
                    }
                    onValueChange={(coachId) => handleDirectAssignCoach(selectedProfileUser.user_id, coachId)}
                    disabled={assigning}
                  >
                    <SelectTrigger className="h-8 text-xs w-48 bg-background border-border text-foreground font-semibold px-2.5">
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
              <Loader2 className="w-8 h-8 animate-spin text-[#1e293b]" />
              <p className="text-sm text-muted-foreground font-medium">Retrieving client record...</p>
            </div>
          ) : !profileData ? (
            <p className="text-center py-20 text-muted-foreground text-sm">Failed to load profile details.</p>
          ) : (
            <div className="space-y-6">
              {/* Stats Summary Panel */}
              <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-muted/30 border border-border/80">
                <div className="text-center">
                  <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block mb-1">Workouts Assigned</span>
                  <span className="text-xl font-bold text-foreground">{profileData.workoutsSummary.totalCount}</span>
                </div>
                <div className="text-center border-x border-border/80">
                  <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block mb-1">Sessions Done</span>
                  <span className="text-xl font-bold text-emerald-600">{profileData.workoutsSummary.completedCount}</span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block mb-1">Est. Kcal Burned</span>
                  <span className="text-xl font-bold text-orange-600">{profileData.workoutsSummary.totalCalories.toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Column 1: Health History */}
                <div className="space-y-4">
                  <h4 className="font-bold text-sm text-foreground uppercase tracking-widest border-b border-border pb-1.5">Health Questionnaire</h4>
                  <div className="space-y-4 bg-muted/20 border border-border/60 p-4 rounded-xl text-xs">
                    <div>
                      <span className="text-muted-foreground font-bold block mb-1">Medical Conditions</span>
                      <p className="text-foreground bg-background p-2.5 rounded border border-border min-h-[40px]">
                        {profileData.healthHistory?.medical_conditions || "None declared."}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-bold block mb-1">Injuries</span>
                      <p className="text-foreground bg-background p-2.5 rounded border border-border min-h-[40px]">
                        {profileData.healthHistory?.injuries || "None declared."}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-bold block mb-1">Allergies</span>
                      <p className="text-foreground bg-background p-2.5 rounded border border-border min-h-[40px]">
                        {profileData.healthHistory?.allergies || "None declared."}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-bold block mb-1">Medications</span>
                      <p className="text-foreground bg-background p-2.5 rounded border border-border min-h-[40px]">
                        {profileData.healthHistory?.medications || "None declared."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Column 2: Weekly Check-ins */}
                <div className="space-y-4">
                  <h4 className="font-bold text-sm text-foreground uppercase tracking-widest border-b border-border pb-1.5">Weekly Check-in Log</h4>
                  {profileData.checkins.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-8 text-center bg-muted/20 rounded-xl border border-border">No check-ins submitted yet.</p>
                  ) : (
                    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
                      {profileData.checkins.map((c) => (
                        <div key={c.id} className="p-3 rounded-xl bg-card border border-border/80 space-y-2 text-xs">
                          <div className="flex justify-between items-center border-b border-border pb-1.5">
                            <span className="text-foreground font-bold">{new Date(c.checkin_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                            <span className="text-foreground font-bold bg-muted px-2 py-0.5 rounded border border-border">{c.weight_kg} kg</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-[11px]">
                            <div>
                              <span className="text-muted-foreground block">Energy</span>
                              <span className="text-foreground font-semibold">{c.energy_level}/5</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">Mood</span>
                              <span className="text-foreground font-semibold capitalize">{c.mood}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">Sleep</span>
                              <span className="text-foreground font-semibold">{c.sleep_hours ? `${c.sleep_hours} hrs` : "—"}</span>
                            </div>
                          </div>
                          {c.notes && (
                            <div className="bg-muted/40 p-2 rounded border border-border text-[11px] text-muted-foreground">
                              <span className="text-[10px] text-muted-foreground block font-bold mb-0.5">Notes:</span>
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
              <div className="space-y-4 pt-4 border-t border-border">
                <h4 className="font-bold text-sm text-foreground uppercase tracking-widest border-b border-border pb-1.5">Progress Photos</h4>
                {profileData.photos.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-8 text-center bg-muted/20 rounded-xl border border-border">No progress photos uploaded yet.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {profileData.photos.map((p) => (
                      <div key={p.id} className="relative rounded-xl overflow-hidden border border-border bg-card flex flex-col group">
                        <div className="aspect-[3/4] w-full overflow-hidden bg-slate-100 flex items-center justify-center">
                          <img
                            src={p.image_path}
                            alt={`Progress photo ${p.taken_at}`}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                        </div>
                        <div className="p-2 bg-muted/40 text-center text-[10px] font-bold text-muted-foreground border-t border-border/80">
                          {new Date(p.taken_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
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