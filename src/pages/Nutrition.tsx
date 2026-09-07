import { useState, useEffect } from "react";
import {
  Apple,
  Utensils,
  Droplets,
  Flame,
  Loader2,
  Search,
  Check,
  UserPlus,
  Users,
  Plus,
  UserMinus,
  Trash2,
  RefreshCw,
  ChevronDown,
  Calculator as CalculatorIcon,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { useAuth } from "@/contexts/AuthContext";
import Calculator from "@/components/nutrition/Calculator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type MacroMode = "values" | "percentage";

interface MealPlan {
  id: string;
  name: string;
  meals: number;
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
  water: number;
  members: number;
}

interface UserAssignment {
  id: string;
  full_name: string;
  email: string;
  active_plan_name: string | null;
}

const DEFAULT_PLAN = {
  name: "",
  calories: "2000",
  protein: "150",
  meals: 4,
  fats: "40",
  carbs: "140",
  water: "3000",
};

function pctToGrams(
  calories: number,
  pct: number,
  type: "protein" | "carbs" | "fats",
): number {
  const factor = type === "fats" ? 9 : 4;
  return Math.round(((pct / 100) * calories) / factor);
}


export default function NutritionAdmin() {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [assignType, setAssignType] = useState<"individual" | "group">("individual");
  const [selectedGroupForPlan, setSelectedGroupForPlan] = useState("");
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedUserForPlan, setSelectedUserForPlan] = useState("");
  const [filteredPlans, setFilteredPlans] = useState<MealPlan[]>([]);
  const [users, setUsers] = useState<UserAssignment[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [recipeCount, setRecipeCount] = useState<number>(0);
  const [globalAvgCals, setGlobalAvgCals] = useState<number>(0);
  const [globalWaterAvg, setGlobalWaterAvg] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [macroMode, setMacroMode] = useState<MacroMode>("values");
  const [macroModeOpen, setMacroModeOpen] = useState(false);
  const [newPlan, setNewPlan] = useState(DEFAULT_PLAN);
  const { toast } = useToast();

  useEffect(() => {
    fetchAdminDashboardData();
    fetchGroups();
  }, []);

  useEffect(() => {
    const result = mealPlans.filter((plan) =>
      plan.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    setFilteredPlans(result);
  }, [searchQuery, mealPlans]);

  // Reset form + mode when dialog closes
  useEffect(() => {
    if (!isDialogOpen) {
      setNewPlan(DEFAULT_PLAN);
      setMacroMode("values");
    }
  }, [isDialogOpen]);

  const fetchAdminDashboardData = async () => {
    try {
      setLoading(true);
      const [
        plansRes,
        profilesRes,
        assignmentsRes,
        logsRes,
        waterRes,
        recipeRes,
      ] = await Promise.all([
        (supabase as any)
          .from("meal_plans")
          .select("*")
          .order("created_at", { ascending: false }),
        (supabase as any).from("profiles").select("user_id, full_name, email"),
        (supabase as any).from("user_meal_plans").select("user_id, plan_id"),
        (supabase as any).from("nutrition_logs").select("calories"),
        (supabase as any).from("water_intake").select("amount_ml"),
        (supabase as any)
          .from("recipes")
          .select("*", { count: "exact", head: true }),
      ]);

      setRecipeCount(recipeRes.count || 0);

      if (logsRes.data && logsRes.data.length > 0) {
        const totalCals = logsRes.data.reduce(
          (sum: number, log: any) => sum + (Number(log.calories) || 0),
          0,
        );
        setGlobalAvgCals(Math.round(totalCals / logsRes.data.length));
      } else {
        setGlobalAvgCals(0);
      }

      if (waterRes.data && waterRes.data.length > 0) {
        const totalWater = waterRes.data.reduce(
          (sum: number, log: any) => sum + (Number(log.amount_ml) || 0),
          0,
        );
        const avgMl = totalWater / waterRes.data.length;
        setGlobalWaterAvg(Math.min(Math.round((avgMl / 2000) * 100), 100));
      } else {
        setGlobalWaterAvg(0);
      }

      const rawPlans = (plansRes.data as any[]) || [];
      const assignments = (assignmentsRes.data as any[]) || [];

      const dynamicPlans: MealPlan[] = rawPlans.map((plan) => ({
        ...plan,
        members: assignments.filter((a) => a.plan_id === plan.id).length,
      }));
      setMealPlans(dynamicPlans);

      if (profilesRes.data) {
        const formattedUsers = (profilesRes.data as any[]).map((profile) => {
          const userAssignment = assignments.find(
            (a) => a.user_id === profile.user_id,
          );
          const activePlan = dynamicPlans.find(
            (p) => p.id === userAssignment?.plan_id,
          );
          return {
            id: profile.user_id,
            full_name: profile.full_name || "Unknown User",
            email: profile.email || "No Email",
            active_plan_name: activePlan ? activePlan.name : null,
          };
        });
        setUsers(formattedUsers);
      }
    } catch (error: any) {
      toast({
        title: "Sync Error",
        description: "Database connection unstable.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
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
  };

  const handleCreatePlan = async () => {
    const calVal = Number(newPlan.calories);
    const waterVal = Number(newPlan.water);

    // ── Resolve macro values ───────────────────────────────────────────────
    let proVal: number;
    let fatsVal: number;
    let carbsVal: number;

    if (macroMode === "percentage") {
      const proteinPct = Number(newPlan.protein);
      const fatsPct = Number(newPlan.fats);
      const carbsPct = Number(newPlan.carbs);

      // Percentage validations
      if (proteinPct + fatsPct + carbsPct !== 100) {
        toast({
          title: "Validation Error",
          description:
            "Protein, Fats and Carbs percentages must add up to 100%.",
          variant: "destructive",
        });
        return;
      }
      if (proteinPct < 0 || fatsPct < 0 || carbsPct < 0) {
        toast({
          title: "Validation Error",
          description: "Percentages cannot be negative.",
          variant: "destructive",
        });
        return;
      }

      proVal = pctToGrams(calVal, proteinPct, "protein");
      fatsVal = pctToGrams(calVal, fatsPct, "fats");
      carbsVal = pctToGrams(calVal, carbsPct, "carbs");
    } else {
      proVal = Number(newPlan.protein);
      fatsVal = Number(newPlan.fats);
      carbsVal = Number(newPlan.carbs);
    }

    // ── Common validations ─────────────────────────────────────────────────
    if (!newPlan.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Plan name is required.",
        variant: "destructive",
      });
      return;
    }
    if (calVal > 6000 || calVal < 1200) {
      toast({
        title: "Validation Error",
        description: "Calories must be between 1200 and 6000.",
        variant: "destructive",
      });
      return;
    }
    if (macroMode === "values") {
      if (proVal > 400 || proVal < 0) {
        toast({
          title: "Validation Error",
          description: "Protein must be between 0g and 400g.",
          variant: "destructive",
        });
        return;
      }
      if (fatsVal > 400 || fatsVal < 0) {
        toast({
          title: "Validation Error",
          description: "Fats must be between 0g and 400g.",
          variant: "destructive",
        });
        return;
      }
      if (carbsVal > 600 || carbsVal < 100) {
        toast({
          title: "Validation Error",
          description: "Carbs must be between 100g and 600g.",
          variant: "destructive",
        });
        return;
      }
    }
    if (waterVal > 12000 || waterVal < 1000) {
      toast({
        title: "Validation Error",
        description: "Water must be between 1000ml and 12000ml.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await (supabase as any).from("meal_plans").insert([
        {
          name: newPlan.name.trim(),
          meals: newPlan.meals,
          calories: calVal,
          protein: proVal,
          fats: fatsVal,
          carbs: carbsVal,
          water: waterVal,
        },
      ]);
      if (error) throw error;

      toast({ title: "Plan Created", description: "New plan is now live." });
      setIsDialogOpen(false);
      fetchAdminDashboardData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeletePlan = async (planId: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this plan? This cannot be undone.",
    );
    if (!confirmDelete) return;
    try {
      const { error } = await (supabase as any)
        .from("meal_plans")
        .delete()
        .eq("id", planId);
      if (error) throw error;
      toast({
        title: "Plan Deleted",
        description: "The meal plan has been removed successfully.",
      });
      fetchAdminDashboardData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Cannot delete plan. Ensure no users are assigned.",
        variant: "destructive",
      });
    }
  };

  const handleAssignPlan = async (userId: string, planId: string) => {
    try {
      const { error } = await (supabase as any)
        .from("user_meal_plans")
        .upsert(
          { user_id: userId, plan_id: planId },
          { onConflict: "user_id" },
        );
      if (error) throw error;
      toast({ title: "Plan Assigned", description: "User moved to new plan." });
      fetchAdminDashboardData();
    } catch (error: any) {
      toast({
        title: "Assignment Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemovePlan = async (userId: string, planId: string) => {
    try {
      const { error } = await (supabase as any)
        .from("user_meal_plans")
        .delete()
        .eq("user_id", userId)
        .eq("plan_id", planId);
      if (error) throw error;
      toast({ title: "Plan Removed", description: "User access revoked." });
      fetchAdminDashboardData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const calVal = Number(newPlan.calories) || 0;
  const previewProteinG =
    macroMode === "percentage"
      ? pctToGrams(calVal, Number(newPlan.protein) || 0, "protein")
      : null;
  const previewFatsG =
    macroMode === "percentage"
      ? pctToGrams(calVal, Number(newPlan.fats) || 0, "fats")
      : null;
  const previewCarbsG =
    macroMode === "percentage"
      ? pctToGrams(calVal, Number(newPlan.carbs) || 0, "carbs")
      : null;
  const pctTotal =
    macroMode === "percentage"
      ? (Number(newPlan.protein) || 0) +
      (Number(newPlan.fats) || 0) +
      (Number(newPlan.carbs) || 0)
      : 100;

  return (
    <div className="min-w-0 w-full">

      <PageHeader
        title="Nutrition Admin"
        description="Manage meal plans, nutrition metrics, and member assignments."
      >
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end lg:w-auto">
          <div className="relative order-2 w-full sm:order-1 sm:w-[220px] lg:w-[240px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search plans..."
              aria-label="Search meal plans"
              className="h-10 w-full rounded-[10px] border-border bg-card pl-9 text-sm text-foreground placeholder:text-muted-foreground shadow-none focus-visible:border-[#07AC7D] focus-visible:ring-[#07AC7D]/15"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Button
            variant="outline"
            onClick={fetchAdminDashboardData}
            className="order-3 h-10 w-full gap-2 rounded-[10px] border-border bg-card px-4 text-foreground shadow-none hover:border-[#07AC7D] hover:bg-muted sm:order-2 sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>Sync Data</span>
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="order-1 h-10 w-full gap-2 rounded-[10px] bg-[#07AC7D] px-4 text-white shadow-none hover:bg-[#06966D] sm:order-3 sm:w-auto">
                <Plus className="h-4 w-4" />
                <span>Create New Plan</span>
              </Button>
            </DialogTrigger>

            <DialogContent className="max-h-[90vh] w-[calc(100%-1rem)] max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xl">
              <DialogHeader>
                <DialogTitle className="text-[18px] font-semibold text-foreground">
                  Add New Meal Plan
                </DialogTitle>
              </DialogHeader>

              <div className="grid gap-4 py-2">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Plan Title <span className="font-normal text-muted-foreground/80">(Max 20 chars)</span>
                  </p>
                  <Input
                    maxLength={20}
                    placeholder="e.g., Vegan Shred"
                    value={newPlan.name}
                    onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                    className="h-11 rounded-[10px] border-border bg-background text-foreground focus-visible:border-[#07AC7D] focus-visible:ring-[#07AC7D]/15"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Macro Input Mode</p>
                  <div className="relative w-full">
                    <button
                      type="button"
                      onClick={() => setMacroModeOpen((v) => !v)}
                      className="flex h-11 w-full items-center justify-between rounded-[10px] border border-border bg-background px-3 text-sm font-medium text-foreground shadow-none transition-colors hover:border-[#07AC7D] focus:outline-none focus:ring-2 focus:ring-[#07AC7D]/15"
                    >
                      <span>
                        {macroMode === "values"
                          ? "Enter by Value (grams)"
                          : "Enter by Percentage (%)"}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform ${macroModeOpen ? "rotate-180" : ""
                          }`}
                      />
                    </button>

                    {macroModeOpen && (
                      <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-[10px] border border-border bg-popover text-popover-foreground shadow-lg">
                        {(["values", "percentage"] as MacroMode[]).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => {
                              setMacroMode(mode);
                              setMacroModeOpen(false);
                              setNewPlan((p) => ({
                                ...p,
                                protein: mode === "percentage" ? "30" : "150",
                                fats: mode === "percentage" ? "25" : "40",
                                carbs: mode === "percentage" ? "45" : "140",
                              }));
                            }}
                            className={`flex w-full items-center justify-between px-3 py-3 text-left text-sm transition-colors hover:bg-muted ${macroMode === mode ? "bg-muted font-semibold text-emerald-500" : "text-foreground"
                              }`}
                          >
                            <span>
                              {mode === "values"
                                ? "Enter by Value (grams)"
                                : "Enter by Percentage (%)"}
                            </span>
                            {macroMode === mode && <Check className="h-4 w-4 text-emerald-500" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {macroMode === "percentage"
                      ? "Enter macro split as % of total calories. Must sum to 100%."
                      : "Enter macro amounts directly in grams."}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Assign To</p>
                    <Select
                      value={assignType}
                      onValueChange={(v) => setAssignType(v as "individual" | "group")}
                    >
                      <SelectTrigger className="h-11 w-full rounded-[10px] border-border bg-background text-foreground">
                        <SelectValue placeholder="Select assignment type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="group">Group</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {assignType === "individual" ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">Select User</p>
                      <Select value={selectedUserForPlan} onValueChange={setSelectedUserForPlan}>
                        <SelectTrigger className="h-11 w-full rounded-[10px] border-border bg-background text-foreground">
                          <SelectValue placeholder="Choose a user..." />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">Select Group</p>
                      <Select value={selectedGroupForPlan} onValueChange={setSelectedGroupForPlan}>
                        <SelectTrigger className="h-11 w-full rounded-[10px] border-border bg-background text-foreground">
                          <SelectValue placeholder="Choose a group..." />
                        </SelectTrigger>
                        <SelectContent>
                          {groups.length === 0 ? (
                            <SelectItem value="none" disabled>
                              No groups available
                            </SelectItem>
                          ) : (
                            groups.map((g) => (
                              <SelectItem key={g.id} value={g.id}>
                                {g.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Daily Calories</p>
                    <Input
                      type="number"
                      value={newPlan.calories}
                      onChange={(e) => setNewPlan({ ...newPlan, calories: e.target.value })}
                      className="h-11 rounded-[10px] border-border bg-background text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Water (ml)</p>
                    <Input
                      type="number"
                      value={newPlan.water}
                      onChange={(e) => setNewPlan({ ...newPlan, water: e.target.value })}
                      className="h-11 rounded-[10px] border-border bg-background text-foreground"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-3">
                  {[
                    { key: "protein", label: "Protein" },
                    { key: "fats", label: "Fats" },
                    { key: "carbs", label: "Carbs" },
                  ].map(({ key, label }) => (
                    <div key={key} className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">
                        {label} {macroMode === "percentage" ? "(%)" : "(g)"}
                      </p>
                      <Input
                        type="number"
                        value={newPlan[key as keyof typeof newPlan] as string | number}
                        onChange={(e) => setNewPlan({ ...newPlan, [key]: e.target.value })}
                        className="h-11 rounded-[10px] border-border bg-background text-foreground"
                      />
                      {macroMode === "percentage" && key === "protein" && previewProteinG !== null && (
                        <p className="text-xs text-muted-foreground">≈ {previewProteinG}g</p>
                      )}
                      {macroMode === "percentage" && key === "fats" && previewFatsG !== null && (
                        <p className="text-xs text-muted-foreground">≈ {previewFatsG}g</p>
                      )}
                      {macroMode === "percentage" && key === "carbs" && previewCarbsG !== null && (
                        <p className="text-xs text-muted-foreground">≈ {previewCarbsG}g</p>
                      )}
                    </div>
                  ))}
                </div>

                {macroMode === "percentage" && (
                  <div
                    className={`flex items-center justify-between rounded-[10px] border px-3 py-2.5 text-sm font-medium ${pctTotal === 100
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                      : pctTotal > 100
                        ? "border-red-500/40 bg-red-500/10 text-red-500"
                        : "border-amber-500/40 bg-amber-500/10 text-amber-500"
                      }`}
                  >
                    <span>Total</span>
                    <span>
                      {pctTotal}%{" "}
                      {pctTotal === 100
                        ? "✓"
                        : pctTotal > 100
                          ? "— exceeds 100%"
                          : `— ${100 - pctTotal}% remaining`}
                    </span>
                  </div>
                )}
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="h-10 w-full rounded-[10px] border-border sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePlan}
                  className="h-10 w-full rounded-[10px] bg-[#07AC7D] text-white hover:bg-[#06966D] sm:w-auto"
                >
                  Save Plan
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      {/* KPI cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Live Meal Plans", value: mealPlans.length, icon: Utensils, iconClass: "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400" },
          { label: "Total Recipes", value: recipeCount, icon: Apple, iconClass: "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400" },
          { label: "Global Avg Cals", value: globalAvgCals, icon: Flame, iconClass: "bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400" },
          { label: "Water Intake Avg", value: `${globalWaterAvg}%`, icon: Droplets, iconClass: "bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400" },
        ].map(({ label, value, icon: Icon, iconClass }) => (
          <Card
            key={label}
            className="rounded-2xl border border-border bg-card shadow-sm"
          >
            <CardContent className="flex items-center justify-between p-5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {label}
                </p>
                <p className="text-2xl font-semibold text-foreground tracking-tight leading-none mt-1.5">
                  {value}
                </p>
              </div>
              <div className={`ml-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
                <Icon className="h-5 w-5" strokeWidth={2} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Meal plans */}
      <section className="mt-8">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-[20px] font-semibold text-foreground">
              <Utensils className="h-5 w-5 text-emerald-500" />
              Active Meal Plans
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Review nutrition targets and manage member access.
            </p>
          </div>
          <Badge className="w-fit rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-emerald-500 hover:bg-emerald-500/15">
            {filteredPlans.length} {filteredPlans.length === 1 ? "plan" : "plans"}
          </Badge>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {[1, 2].map((item) => (
              <Card
                key={item}
                className="rounded-2xl border border-border bg-card shadow-sm"
              >
                <CardContent className="space-y-5 p-5 sm:p-6">
                  <div className="h-6 w-1/2 animate-pulse rounded bg-muted" />
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div key={index} className="h-20 animate-pulse rounded-xl bg-muted" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredPlans.length === 0 ? (
          <Card className="rounded-2xl border border-dashed border-border bg-card shadow-sm">
            <CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                <Utensils className="h-5 w-5" />
              </div>
              <h4 className="text-[18px] font-semibold text-foreground">No meal plans found</h4>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Try a different search or create a new nutrition plan.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {filteredPlans.map((plan) => (
              <Card
                key={plan.id}
                className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow duration-150 hover:shadow-md"
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col gap-4 border-b border-border pb-5">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                            <Utensils className="h-4 w-4" />
                          </span>
                          <h4 className="min-w-0 break-words text-[18px] font-semibold leading-snug text-foreground">
                            {plan.name}
                          </h4>
                        </div>
                        <Badge
                          variant="secondary"
                          className="mt-2 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground"
                        >
                          ID: {plan.id.slice(0, 8)}
                        </Badge>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${plan.name}`}
                        title="Delete meal plan"
                        className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDeletePlan(plan.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            className="h-9 w-full justify-center gap-2 rounded-[8px] border-emerald-500/30 bg-emerald-500/10 px-3 text-emerald-500 hover:bg-emerald-500/20"
                          >
                            <UserMinus className="h-4 w-4" strokeWidth={2} />
                            <span>Revoke</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[min(280px,calc(100vw-32px))] rounded-xl border border-border bg-popover p-1 shadow-lg">
                          <DropdownMenuLabel className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                            Revoke User Access
                          </DropdownMenuLabel>
                          <div className="max-h-[300px] overflow-y-auto">
                            {users.filter((u) => u.active_plan_name === plan.name).length === 0 ? (
                              <div className="px-3 py-3 text-sm text-muted-foreground">
                                No users are assigned to this plan.
                              </div>
                            ) : (
                              users
                                .filter((u) => u.active_plan_name === plan.name)
                                .map((u) => (
                                  <DropdownMenuItem
                                    key={u.id}
                                    onClick={() => handleRemovePlan(u.id, plan.id)}
                                    className="rounded-[8px] px-3 py-2.5 focus:bg-muted focus:text-foreground"
                                  >
                                    <span className="truncate">{u.full_name}</span>
                                  </DropdownMenuItem>
                                ))
                            )}
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            className="h-9 w-full justify-center gap-2 rounded-[8px] border-border bg-card px-3 text-foreground hover:border-[#07AC7D] hover:bg-muted"
                          >
                            <UserPlus className="h-4 w-4" />
                            <span>Assign</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[min(280px,calc(100vw-32px))] rounded-xl border border-border bg-popover p-1 shadow-lg">
                          <DropdownMenuLabel className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                            Assign User
                          </DropdownMenuLabel>
                          <div className="max-h-[300px] overflow-y-auto">
                            {users.map((u) => (
                              <DropdownMenuItem
                                key={u.id}
                                onClick={() => handleAssignPlan(u.id, plan.id)}
                                className="rounded-[8px] px-3 py-2.5 focus:bg-muted focus:text-foreground"
                              >
                                <span className="min-w-0 flex-1 truncate">{u.full_name}</span>
                                {u.active_plan_name === plan.name && (
                                  <Check className="ml-2 h-4 w-4 shrink-0 text-[#10B981]" />
                                )}
                              </DropdownMenuItem>
                            ))}
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {[
                      { label: "Calories", value: `${plan.calories}`, unit: "kcal", tone: "bg-muted/70 text-foreground" },
                      { label: "Protein", value: `${plan.protein}`, unit: "g", tone: "bg-muted/70 text-foreground" },
                      { label: "Fats", value: `${plan.fats}`, unit: "g", tone: "bg-muted/70 text-foreground" },
                      { label: "Carbs", value: `${plan.carbs}`, unit: "g", tone: "bg-muted/70 text-foreground" },
                      { label: "Water", value: `${plan.water}`, unit: "ml", tone: "bg-muted/70 text-foreground" },
                      { label: "Active Users", value: `${plan.members}`, unit: "members", tone: "bg-emerald-500/10 text-emerald-500" },
                    ].map(({ label, value, unit, tone }) => (
                      <div
                        key={label}
                        className={`min-w-0 rounded-xl border border-border p-3 ${tone}`}
                      >
                        <p className="truncate text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {label}
                        </p>
                        <div className="mt-1 flex min-w-0 items-baseline gap-1">
                          <p className="truncate text-sm font-semibold leading-tight">{value}</p>
                          <span className="shrink-0 text-xs font-medium opacity-70">{unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Calculators — sitting seamlessly on the dark surface */}
      <section className="mt-8 pb-6">
        <div className="mb-5">
          <h3 className="flex items-center gap-2 text-[20px] font-semibold text-foreground leading-snug">
            <CalculatorIcon className="h-5 w-5 text-emerald-500" />
            Nutrition Calculators
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            BMR, macro, and calorie tools for quick member reference.
          </p>
        </div>

        <Calculator />
      </section>
    </div>
  );
}