import { useState, useEffect } from "react";
import { Apple, Utensils, Droplets, Flame, Filter, Loader2, Search, Check, UserPlus, Users, UserCheck } from "lucide-react";
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
  const [sortBy, setSortBy] = useState<string>("newest");
  const [recipeCount, setRecipeCount] = useState<number>(0);
  const [globalAvgCals, setGlobalAvgCals] = useState<number>(0);
  const [globalWaterAvg, setGlobalWaterAvg] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAdminDashboardData();
  }, []);

  useEffect(() => {
    let result = [...mealPlans];
    if (searchQuery) {
      result = result.filter(plan => 
        plan.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (sortBy === "calories-high") result.sort((a, b) => b.calories - a.calories);
    else if (sortBy === "protein-high") result.sort((a, b) => b.protein - a.protein);
    else if (sortBy === "members") result.sort((a, b) => b.members - a.members);
    
    setFilteredPlans(result);
  }, [searchQuery, mealPlans, sortBy]);

  const fetchAdminDashboardData = async () => {
    try {
      setLoading(true);

      //  Fetch all 
      const [plansRes, profilesRes, assignmentsRes, logsRes, waterRes, recipeRes] = await Promise.all([
        supabase.from('meal_plans').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name, email'),
        supabase.from('user_meal_plans').select('user_id, plan_id'),
        supabase.from('nutrition_logs').select('calories'),
        supabase.from('water_intake').select('amount_ml'),
        supabase.from('recipes').select('*', { count: 'exact', head: true })
      ]);

      const rawPlans = (plansRes.data as any[]) || [];
      const assignments = assignmentsRes.data || [];

      // calculate plan member counts
    
      const dynamicPlans: MealPlan[] = rawPlans.map(plan => ({
        ...plan,
        members: assignments.filter(a => a.plan_id === plan.id).length
      }));
      setMealPlans(dynamicPlans);

      //Join Profiles & Active Plan Names
      if (profilesRes.data) {
        const formattedUsers = profilesRes.data.map((profile) => {
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

      //  Calculate Averages
      const totalCals = logsRes.data?.reduce((sum, log) => sum + (log.calories || 0), 0) || 0;
      const avgCals = logsRes.data?.length ? Math.round(totalCals / logsRes.data.length) : 0;
      
      const totalWater = waterRes.data?.reduce((sum, log) => sum + (log.amount_ml || 0), 0) || 0;
      const waterAvgPct = waterRes.data?.length 
        ? Math.min(Math.round((totalWater / waterRes.data.length / 3000) * 100), 100) 
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

  const handleAssignPlan = async (userId: string, planId: string) => {
    try {
      const { error } = await supabase
        .from('user_meal_plans')
        .upsert({ user_id: userId, plan_id: planId }, { onConflict: 'user_id' });

      if (error) throw error;

      toast({ title: "Updated", description: "Assignment refreshed successfully." });
      // Refreshing data triggers 
      fetchAdminDashboardData(); 
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <PageHeader title="Nutrition Admin" description="Live system monitoring and assignment.">
        <div className="flex gap-2">
          <Input 
            placeholder="Search plans..." 
            className="w-[250px]" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
        </div>
      </PageHeader>

      {/* Dynamic Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard label="Live Meal Plans" value={mealPlans.length} icon={Utensils} color="gradient-accent" />
        <StatCard label="Total Recipes" value={recipeCount} icon={Apple} color="bg-success/10" />
        <StatCard label="Global Avg Cals" value={globalAvgCals} icon={Flame} color="bg-warning/10" />
        <StatCard label="Water Intake Avg" value={`${globalWaterAvg}%`} icon={Droplets} color="bg-accent/10" />
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Global Meal Plans - Now showing REAL user counts */}
        <Card className="shadow-card border-none bg-slate-50/50">
          <CardHeader><CardTitle>Global Meal Plans</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPlans.map((plan) => (
                <div key={plan.id} className="p-6 rounded-xl border bg-white hover:border-accent hover:shadow-md transition-all">
                  <div className="flex justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-lg">{plan.name}</h4>
                      <Badge variant="secondary" className="font-mono text-[10px] uppercase">ID: {plan.id.slice(0,8)}</Badge>
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
                            {u.active_plan_name === plan.name && <Check className="w-4 h-4 text-success"/>}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-slate-100 p-2 rounded-lg"><p className="text-xs text-muted-foreground uppercase font-bold">Calories</p><p className="font-bold">{plan.calories}</p></div>
                    <div className="bg-slate-100 p-2 rounded-lg"><p className="text-xs text-muted-foreground uppercase font-bold">Protein</p><p className="font-bold">{plan.protein}g</p></div>
                    <div className="bg-accent/10 p-2 rounded-lg text-accent"><p className="text-xs uppercase font-bold">Active Users</p><p className="font-bold">{plan.members}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Dynamic User Management Table */}
        <Card className="shadow-card overflow-hidden">
          <CardHeader className="bg-slate-50 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-slate-700"><Users className="w-5 h-5"/> Live Customer Roster</CardTitle>
              <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-200">{users.length} Users Tracked</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="pl-6">Customer</TableHead>
                  <TableHead>Contact Email</TableHead>
                  <TableHead className="text-right pr-6">Current Assignment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="pl-6 font-semibold">{user.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell className="text-right pr-6">
                      {user.active_plan_name ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100">{user.active_plan_name}</Badge>
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

// Helper Component for Stats
function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <Card className="shadow-card border-none">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="text-3xl font-black mt-1">{value}</p>
          </div>
          <div className={`p-4 rounded-2xl ${color}`}>
            <Icon className="w-6 h-6 text-accent-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}