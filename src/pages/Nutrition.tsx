import { useState, useEffect } from "react";
import { Apple, Utensils, Droplets, Flame, Loader2, Search, Check, UserPlus, Users, Plus } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

// --- Interfaces ---
interface MealPlan {
  id: string;
  name: string;
  meals: number;
  calories: number;
  protein: number;
  members: number; 
}

interface UserAssignment {
  id: string;
  full_name: string;
  email: string;
  active_plan_name: string | null;
}

export default function NutritionAdmin() {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [filteredPlans, setFilteredPlans] = useState<MealPlan[]>([]);
  const [users, setUsers] = useState<UserAssignment[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [recipeCount, setRecipeCount] = useState<number>(0);
  const [globalAvgCals, setGlobalAvgCals] = useState<number>(0);
  const [globalWaterAvg, setGlobalWaterAvg] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  //  manual creation plan 
  const [newPlan, setNewPlan] = useState({ name: "", calories: 2000, protein: 150, meals: 4 });
  
  const { toast } = useToast();

  //  Data Fetching 
  useEffect(() => {
    fetchAdminDashboardData();
  }, []);

  //  Client-side Search Filtering 
  useEffect(() => {
    const result = mealPlans.filter(plan => 
      plan.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredPlans(result);
  }, [searchQuery, mealPlans]);

  const fetchAdminDashboardData = async () => {
    try {
      setLoading(true);
      
      const [plansRes, profilesRes, assignmentsRes, logsRes, waterRes, recipeRes] = await Promise.all([
        (supabase as any).from('meal_plans').select('*').order('created_at', { ascending: false }),
        (supabase as any).from('profiles').select('id, full_name, email'),
        (supabase as any).from('user_meal_plans').select('user_id, plan_id'),
        (supabase as any).from('nutrition_logs').select('calories'),
        (supabase as any).from('water_intake').select('amount_ml'),
        (supabase as any).from('recipes').select('*', { count: 'exact', head: true })
      ]);

      const rawPlans = (plansRes.data as any[]) || [];
      const assignments = (assignmentsRes.data as any[]) || [];

      // Calculate active members per plan dynamically
      const dynamicPlans: MealPlan[] = rawPlans.map(plan => ({
        ...plan,
        members: assignments.filter(a => a.plan_id === plan.id).length
      }));
      setMealPlans(dynamicPlans);

      // Map users to their active meal plans
      if (profilesRes.data) {
        const formattedUsers = (profilesRes.data as any[]).map((profile) => {
          const userAssignment = assignments.find(a => a.user_id === profile.id);
          const activePlan = dynamicPlans.find(p => p.id === userAssignment?.plan_id);
          return {
            id: profile.id,
            full_name: profile.full_name || "Unknown User",
            email: profile.email || "No Email",
            active_plan_name: activePlan ? activePlan.name : null
          };
        });
        setUsers(formattedUsers);
      }

      // Aggregate global stats
      const totalCals = (logsRes.data as any[])?.reduce((sum, log) => sum + (log.calories || 0), 0) || 0;
      const avgCals = (logsRes.data as any[])?.length ? Math.round(totalCals / (logsRes.data as any[]).length) : 0;
      
      const waterData = (waterRes.data as any[]) || [];
      const totalWater = waterData.reduce((sum, log) => sum + (Number(log.amount_ml) || 0), 0);
      const waterAvgPct = waterData.length 
        ? Math.min(Math.round(((totalWater / waterData.length) / 3000) * 100), 100) 
        : 0;

      setGlobalAvgCals(avgCals);
      setGlobalWaterAvg(waterAvgPct);
      setRecipeCount(recipeRes.count || 0);

    } catch (error: any) {
      console.error("Critical Sync Error:", error);
      toast({ title: "Sync Error", description: "Database connection unstable.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  //Admin Actions 
  const handleCreatePlan = async () => {
    try {
      if (!newPlan.name.trim()) {
        toast({ title: "Validation Error", description: "Plan name is required", variant: "destructive" });
        return;
      }
      
      const { error } = await (supabase as any)
        .from('meal_plans')
        .insert([newPlan]);

      if (error) throw error;
      
      toast({ title: "Plan Created", description: `${newPlan.name} is now live.` });
      setIsDialogOpen(false);
      setNewPlan({ name: "", calories: 2000, protein: 150, meals: 4 }); // Reset form
      fetchAdminDashboardData(); 
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleAssignPlan = async (userId: string, planId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('user_meal_plans')
        .upsert({ user_id: userId, plan_id: planId }, { onConflict: 'user_id' });

      if (error) throw error;
      
      toast({ title: "Plan Assigned", description: "User has been moved to the new plan." });
      fetchAdminDashboardData(); 
    } catch (error: any) {
      toast({ title: "Assignment Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <PageHeader title="Nutrition Admin" description="System monitoring and assignment.">
        <div className="flex gap-2">
          {/* Create Plan Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4" /> Create New Plan
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Meal Plan</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Plan Title</p>
                  <Input 
                    placeholder="e.g., Vegan Shred" 
                    value={newPlan.name}
                    onChange={(e) => setNewPlan({...newPlan, name: e.target.value})} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Daily Calories</p>
                    <Input 
                      type="number" 
                      placeholder="2000" 
                      onChange={(e) => setNewPlan({...newPlan, calories: Number(e.target.value)})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Protein (g)</p>
                    <Input 
                      type="number" 
                      placeholder="150" 
                      onChange={(e) => setNewPlan({...newPlan, protein: Number(e.target.value)})} 
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreatePlan} className="bg-emerald-600">Save Plan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search plans..." 
              className="w-[200px] pl-9" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
          </div>
          
          <Button variant="outline" onClick={fetchAdminDashboardData} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sync Data"}
          </Button>
        </div>
      </PageHeader>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard label="Live Meal Plans" value={mealPlans.length} icon={Utensils} color="bg-primary/10" />
        <StatCard label="Total Recipes" value={recipeCount} icon={Apple} color="bg-emerald-500/10" />
        <StatCard label="Global Avg Cals" value={globalAvgCals} icon={Flame} color="bg-orange-500/10" />
        <StatCard label="Water Intake Avg" value={`${globalWaterAvg}%`} icon={Droplets} color="bg-blue-500/10" />
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Meal Plans Grid */}
        <Card className="shadow-sm border-none bg-slate-50/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Utensils className="w-5 h-5 text-primary" /> Active Meal Plans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPlans.map((plan) => (
                <div key={plan.id} className="p-6 rounded-xl border bg-white hover:border-primary/50 transition-all shadow-sm">
                  <div className="flex justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-lg">{plan.name}</h4>
                      <Badge variant="secondary" className="font-mono text-[10px] mt-1">ID: {plan.id.slice(0,8)}</Badge>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2"><UserPlus className="w-4 h-4"/> Assign</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="max-h-64 overflow-y-auto w-64 shadow-xl">
                        <DropdownMenuLabel>Choose Customer</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {users.map(u => (
                          <DropdownMenuItem key={u.id} className="flex justify-between" onClick={() => handleAssignPlan(u.id, plan.id)}>
                            <span>{u.full_name}</span>
                            {u.active_plan_name === plan.name && <Check className="w-4 h-4 text-emerald-500"/>}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Calories</p>
                      <p className="font-bold">{plan.calories}</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Protein</p>
                      <p className="font-bold">{plan.protein}g</p>
                    </div>
                    <div className="bg-primary/5 p-2 rounded-lg text-primary border border-primary/10">
                      <p className="text-[10px] uppercase font-bold">Active Users</p>
                      <p className="font-bold">{plan.members}</p>
                    </div>
                  </div>
                </div>
              ))}
              {filteredPlans.length === 0 && (
                <div className="col-span-full py-12 text-center bg-white rounded-xl border border-dashed">
                  <p className="text-muted-foreground italic">No meal plans found.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* User Roster Table */}
        <Card className="shadow-sm border-none overflow-hidden">
          <CardHeader className="bg-white border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary"/> Customer Roster
              </CardTitle>
              <Badge variant="outline">{users.length} Users Tracked</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="pl-6">Customer</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right pr-6">Current Assignment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="pl-6 font-medium">{user.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell className="text-right pr-6">
                      {user.active_plan_name ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50">
                          {user.active_plan_name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No plan active</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

//  StatCard Helper Component 
function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <Card className="shadow-sm border-none">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
            <p className="text-2xl font-black mt-1">{value}</p>
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="w-5 h-5 text-slate-700" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}