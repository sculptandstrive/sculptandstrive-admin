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
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
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

      const rawPlans = (plansRes.data as any[]) || [];
      const assignments = (assignmentsRes.data as any[]) || [];

      if (rawPlans.length > 0) {
        const totalPlanCals = rawPlans.reduce(
          (sum: number, plan: any) => sum + (Number(plan.calories) || 0),
          0,
        );
        setGlobalAvgCals(Math.round(totalPlanCals / rawPlans.length));
      } else if (logsRes.data && logsRes.data.length > 0) {
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

      const dynamicPlans: MealPlan[] = rawPlans.map((plan) => ({
        ...plan,
        members: assignments.filter((a) => a.plan_id === plan.id).length,
      }));
      setMealPlans(dynamicPlans);

      if (profilesRes.data) {
        const formattedUsers = (profilesRes.data as any[])
          .map((profile) => {
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
          })
          .sort((a, b) => a.full_name.localeCompare(b.full_name));
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
      const { data: createdPlan, error } = await (supabase as any).from("meal_plans").insert([
        {
          name: newPlan.name.trim(),
          meals: newPlan.meals,
          calories: calVal,
          protein: proVal,
          fats: fatsVal,
          carbs: carbsVal,
          water: waterVal,
        },
      ]).select().maybeSingle();
      if (error) throw error;

      if (createdPlan?.id) {
        if (assignType === "individual" && selectedUserForPlan) {
          await (supabase as any)
            .from("user_meal_plans")
            .upsert(
              { user_id: selectedUserForPlan, plan_id: createdPlan.id },
              { onConflict: "user_id" },
            );

          try {
            await supabase.from("notifications").insert({
              user_id: selectedUserForPlan,
              recipient_type: "user",
              sender_type: "admin",
              is_completed: false,
              title: "New Nutrition Plan Appointed",
              description: `You have been assigned ${createdPlan.name}. Check your Nutrition page to see your daily targets.`,
              notification_date: new Date().toISOString().split("T")[0],
              created_at: new Date().toISOString(),
            });
          } catch (notifErr) {
            console.warn("Notification error:", notifErr);
          }
        } else if (assignType === "group" && selectedGroupForPlan) {
          const { data: members } = await supabase
            .from("group_members")
            .select("user_id")
            .eq("group_id", selectedGroupForPlan);

          if (members && members.length > 0) {
            const assignments = members.map((m: any) => ({
              user_id: m.user_id,
              plan_id: createdPlan.id,
            }));
            await (supabase as any)
              .from("user_meal_plans")
              .upsert(assignments, { onConflict: "user_id" });

            const notifs = members.map((m: any) => ({
              user_id: m.user_id,
              recipient_type: "user",
              sender_type: "admin",
              is_completed: false,
              title: "New Nutrition Plan Appointed",
              description: `Your group has been assigned ${createdPlan.name}. Check your Nutrition page to see your daily targets.`,
              notification_date: new Date().toISOString().split("T")[0],
              created_at: new Date().toISOString(),
            }));
            try {
              await supabase.from("notifications").insert(notifs);
            } catch (notifErr) {
              console.warn("Group notification error:", notifErr);
            }
          }
        }
      }

      toast({ title: "Plan Created", description: "New plan is now live." });
      setSelectedUserForPlan("");
      setSelectedGroupForPlan("");
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
      // Clean up user assignments first to prevent foreign key errors
      await (supabase as any)
        .from("user_meal_plans")
        .delete()
        .eq("plan_id", planId);

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
        description: error.message,
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

      const assignedPlanName = mealPlans.find(p => p.id === planId)?.name || "a new meal plan";
      try {
        await supabase.from("notifications").insert({
          user_id: userId,
          recipient_type: "user",
          sender_type: "admin",
          is_completed: false,
          title: "New Nutrition Plan Appointed",
          description: `You have been assigned ${assignedPlanName}. Check your Nutrition page to see your daily targets.`,
          notification_date: new Date().toISOString().split("T")[0],
          created_at: new Date().toISOString(),
        });
      } catch (notifErr) {
        console.warn("Failed to notify user about assigned meal plan:", notifErr);
      }

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
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-[220px] lg:w-[240px]">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7186A0]" />
            <Input
              placeholder="Search plans..."
              aria-label="Search meal plans"
              className="h-10 sm:h-11 w-full rounded-xl sm:rounded-2xl border border-white/80 bg-[#E2ECE9] shadow-[inset_2px_2px_4px_rgba(165,185,180,0.45),inset_-2px_-2px_4px_rgba(255,255,255,0.85)] pl-9 sm:pl-10 text-xs sm:text-sm font-semibold text-[#0F172A] placeholder:text-[#7186A0] focus-visible:ring-2 focus-visible:ring-[#08B594]/30"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Button
            variant="outline"
            onClick={fetchAdminDashboardData}
            title="Sync Data"
            className="h-9 w-9 sm:h-11 sm:w-auto p-0 sm:px-4 sm:gap-1.5 rounded-xl sm:rounded-2xl border border-white bg-white shadow-[4px_4px_10px_rgba(145,170,165,0.18),-3px_-3px_8px_rgba(255,255,255,0.95)] font-bold text-[#334155] hover:bg-[#F0F7F5] active:scale-95 transition-all shrink-0 flex items-center justify-center"
          >
            <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#08B594] ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Sync Data</span>
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="h-10 sm:h-11 px-3 sm:px-5 gap-1.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#08B594] via-[#07AB8C] to-[#069D80] font-bold text-white shadow-[0_4px_12px_rgba(8,169,130,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:brightness-105 active:scale-95 transition-all text-xs sm:text-sm shrink-0">
                <Plus className="h-4 w-4 stroke-[2.5]" />
                <span className="hidden min-[380px]:inline">New Plan</span>
                <span className="min-[380px]:hidden">Plan</span>
              </Button>
            </DialogTrigger>

            <DialogContent className="max-h-[90vh] w-[calc(100%-1rem)] max-w-lg overflow-y-auto rounded-[26px] border border-white bg-white p-5 sm:p-7 shadow-[8px_8px_30px_rgba(145,170,165,0.25)]">
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-[#0F172A]">
                  Add New Meal Plan
                </DialogTitle>
              </DialogHeader>

              <div className="grid gap-4 py-2">
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#7186A0]">
                    Plan Title <span className="font-normal text-[#94A3B8]">(Max 20 chars)</span>
                  </p>
                  <Input
                    maxLength={20}
                    placeholder="e.g., Vegan Shred"
                    value={newPlan.name}
                    onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                    className="h-11 rounded-2xl border border-white/80 bg-[#E2ECE9] shadow-[inset_2px_2px_4px_rgba(165,185,180,0.45),inset_-2px_-2px_4px_rgba(255,255,255,0.85)] px-3 text-sm font-semibold text-[#0F172A]"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#7186A0]">Macro Input Mode</p>
                  <div className="relative w-full">
                    <button
                      type="button"
                      onClick={() => setMacroModeOpen((v) => !v)}
                      className="flex h-11 w-full items-center justify-between rounded-2xl border border-white/80 bg-[#E2ECE9] shadow-[inset_2px_2px_4px_rgba(165,185,180,0.45),inset_-2px_-2px_4px_rgba(255,255,255,0.85)] px-4 text-sm font-bold text-[#0F172A] transition-all"
                    >
                      <span>
                        {macroMode === "values"
                          ? "Enter by Value (grams)"
                          : "Enter by Percentage (%)"}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-[#7186A0] transition-transform ${macroModeOpen ? "rotate-180" : ""
                          }`}
                      />
                    </button>

                    {macroModeOpen && (
                      <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-2xl border border-white bg-white shadow-[6px_6px_20px_rgba(145,170,165,0.2)] p-1">
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
                            className={`flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs font-bold rounded-xl transition-all ${macroMode === mode ? "bg-[#F0F7F5] text-[#08B594]" : "text-[#334155] hover:bg-[#F8FAFC]"
                              }`}
                          >
                            <span>
                              {mode === "values"
                                ? "Enter by Value (grams)"
                                : "Enter by Percentage (%)"}
                            </span>
                            {macroMode === mode && <Check className="h-4 w-4 text-[#08B594]" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs leading-5 font-semibold text-[#7186A0]">
                    {macroMode === "percentage"
                      ? "Enter macro split as % of total calories. Must sum to 100%."
                      : "Enter macro amounts directly in grams."}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#7186A0]">Assign To</p>
                    <Select
                      value={assignType}
                      onValueChange={(v) => setAssignType(v as "individual" | "group")}
                    >
                      <SelectTrigger className="h-11 w-full rounded-2xl border border-white/80 bg-[#E2ECE9] shadow-[inset_2px_2px_4px_rgba(165,185,180,0.45),inset_-2px_-2px_4px_rgba(255,255,255,0.85)] px-3 text-sm font-semibold text-[#0F172A]">
                        <SelectValue placeholder="Select assignment type" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border border-white bg-white shadow-[6px_6px_20px_rgba(145,170,165,0.2)]">
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="group">Group</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {assignType === "individual" ? (
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#7186A0]">Select User</p>
                      <Select value={selectedUserForPlan} onValueChange={setSelectedUserForPlan}>
                        <SelectTrigger className="h-11 w-full rounded-2xl border border-white/80 bg-[#E2ECE9] shadow-[inset_2px_2px_4px_rgba(165,185,180,0.45),inset_-2px_-2px_4px_rgba(255,255,255,0.85)] px-3 text-sm font-semibold text-[#0F172A]">
                          <SelectValue placeholder="Choose a user..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border border-white bg-white shadow-[6px_6px_20px_rgba(145,170,165,0.2)] max-h-56">
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
                      <p className="text-xs font-bold uppercase tracking-wider text-[#7186A0]">Select Group</p>
                      <Select value={selectedGroupForPlan} onValueChange={setSelectedGroupForPlan}>
                        <SelectTrigger className="h-11 w-full rounded-2xl border border-white/80 bg-[#E2ECE9] shadow-[inset_2px_2px_4px_rgba(165,185,180,0.45),inset_-2px_-2px_4px_rgba(255,255,255,0.85)] px-3 text-sm font-semibold text-[#0F172A]">
                          <SelectValue placeholder="Choose a group..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border border-white bg-white shadow-[6px_6px_20px_rgba(145,170,165,0.2)] max-h-56">
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
                    <p className="text-xs font-bold uppercase tracking-wider text-[#7186A0]">Daily Calories</p>
                    <Input
                      type="number"
                      value={newPlan.calories}
                      onChange={(e) => setNewPlan({ ...newPlan, calories: e.target.value })}
                      className="h-11 rounded-2xl border border-white/80 bg-[#E2ECE9] shadow-[inset_2px_2px_4px_rgba(165,185,180,0.45),inset_-2px_-2px_4px_rgba(255,255,255,0.85)] px-3 text-sm font-semibold text-[#0F172A]"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#7186A0]">Water (ml)</p>
                    <Input
                      type="number"
                      value={newPlan.water}
                      onChange={(e) => setNewPlan({ ...newPlan, water: e.target.value })}
                      className="h-11 rounded-2xl border border-white/80 bg-[#E2ECE9] shadow-[inset_2px_2px_4px_rgba(165,185,180,0.45),inset_-2px_-2px_4px_rgba(255,255,255,0.85)] px-3 text-sm font-semibold text-[#0F172A]"
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
                      <p className="text-xs font-bold uppercase tracking-wider text-[#7186A0]">
                        {label} {macroMode === "percentage" ? "(%)" : "(g)"}
                      </p>
                      <Input
                        type="number"
                        value={newPlan[key as keyof typeof newPlan] as string | number}
                        onChange={(e) => setNewPlan({ ...newPlan, [key]: e.target.value })}
                        className="h-11 rounded-2xl border border-white/80 bg-[#E2ECE9] shadow-[inset_2px_2px_4px_rgba(165,185,180,0.45),inset_-2px_-2px_4px_rgba(255,255,255,0.85)] px-3 text-sm font-semibold text-[#0F172A]"
                      />
                      {macroMode === "percentage" && key === "protein" && previewProteinG !== null && (
                        <p className="text-xs font-semibold text-[#08B594]">≈ {previewProteinG}g</p>
                      )}
                      {macroMode === "percentage" && key === "fats" && previewFatsG !== null && (
                        <p className="text-xs font-semibold text-[#08B594]">≈ {previewFatsG}g</p>
                      )}
                      {macroMode === "percentage" && key === "carbs" && previewCarbsG !== null && (
                        <p className="text-xs font-semibold text-[#08B594]">≈ {previewCarbsG}g</p>
                      )}
                    </div>
                  ))}
                </div>

                {macroMode === "percentage" && (
                  <div
                    className={`rounded-2xl p-3 border text-xs font-bold ${pctTotal === 100
                      ? "border-emerald-500/30 bg-[#E2ECE9] text-[#08B594] shadow-[inset_2px_2px_4px_rgba(165,185,180,0.35)]"
                      : "border-destructive/30 bg-destructive/10 text-destructive shadow-[inset_2px_2px_4px_rgba(239,68,68,0.2)]"
                      }`}
                  >
                    Total: {pctTotal}% {pctTotal !== 100 ? "(Must equal 100%)" : "✓ Balanced"}
                  </div>
                )}
              </div>

              <DialogFooter className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="ghost"
                  onClick={() => setIsDialogOpen(false)}
                  className="h-11 w-full rounded-2xl border border-white bg-white shadow-[2px_2px_6px_rgba(180,200,196,0.2)] font-bold text-[#7186A0] hover:bg-[#F0F7F5] sm:w-auto px-5"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePlan}
                  className="h-11 w-full rounded-2xl bg-gradient-to-r from-[#08B594] via-[#07AB8C] to-[#069D80] px-6 font-bold text-white shadow-[0_4px_12px_rgba(8,169,130,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:brightness-105 active:scale-95 transition-all sm:w-auto"
                >
                  Save Plan
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      {/* KPI cards - 2 on mobile, 4 on desktop */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <StatCard
          title="Live Meal Plans"
          value={mealPlans.length}
          percentage="8%"
          icon={Utensils}
          theme="emerald"
        />
        <StatCard
          title="Total Recipes"
          value={recipeCount}
          percentage="12%"
          icon={Apple}
          theme="teal"
        />
        <StatCard
          title="Global Avg Cals"
          value={globalAvgCals}
          percentage="5%"
          icon={Flame}
          theme="amber"
        />
        <StatCard
          title="Water Intake Avg"
          value={globalWaterAvg}
          unit="%"
          percentage="10%"
          icon={Droplets}
          theme="blue"
        />
      </div>

      {/* Meal plans */}
      <section className="mt-8">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-black text-[#0F172A]">
              <Utensils className="h-5 w-5 text-[#08B594]" />
              Active Meal Plans
            </h2>
            <p className="mt-1 text-xs font-semibold text-[#7186A0]">
              Review nutrition targets and manage member access.
            </p>
          </div>
          <Badge className="w-fit rounded-full border border-emerald-500/20 bg-[#E2ECE9] shadow-[inset_1px_1px_2px_rgba(165,185,180,0.4),inset_-1px_-1px_2px_rgba(255,255,255,0.8)] px-3.5 py-1 text-xs font-black tracking-wider text-[#08B594]">
            {filteredPlans.length} {filteredPlans.length === 1 ? "PLAN" : "PLANS"}
          </Badge>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {[1, 2].map((item) => (
              <div
                key={item}
                className="rounded-[26px] border border-white/80 bg-white p-6 shadow-[6px_6px_20px_rgba(145,170,165,0.16)] space-y-5"
              >
                <div className="h-6 w-1/2 animate-pulse rounded-xl bg-[#E2ECE9]" />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="h-20 animate-pulse rounded-2xl bg-[#E2ECE9]" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="rounded-[26px] border border-dashed border-white/90 bg-white p-12 shadow-[6px_6px_20px_rgba(145,170,165,0.16),-4px_-4px_14px_rgba(255,255,255,0.98)] text-center flex flex-col items-center justify-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0CC194]/15 via-[#08B594]/20 to-[#069D80]/25 border border-white/80 shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.9),2px_2px_5px_rgba(8,169,130,0.12)] text-[#08B594]">
              <Utensils className="h-6 w-6" />
            </div>
            <h4 className="text-lg font-black text-[#0F172A]">No meal plans found</h4>
            <p className="mt-1 max-w-sm text-xs font-semibold text-[#7186A0]">
              Try a different search or create a new nutrition plan.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {filteredPlans.map((plan) => (
              <div
                key={plan.id}
                className="group rounded-[26px] border border-white/90 bg-white p-5 sm:p-6 shadow-[6px_6px_20px_rgba(145,170,165,0.18),-4px_-4px_14px_rgba(255,255,255,0.98)] transition-all hover:shadow-[8px_8px_24px_rgba(145,170,165,0.22),-4px_-4px_16px_rgba(255,255,255,1)] flex flex-col justify-between"
              >
                <div>
                  <div className="flex flex-col gap-4 border-b border-[#E2ECE9] pb-5">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0CC194]/15 via-[#08B594]/20 to-[#069D80]/25 border border-white/80 shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.9),2px_2px_5px_rgba(8,169,130,0.12)] text-[#08B594]">
                            <Utensils className="h-5 w-5" />
                          </span>
                          <h4 className="min-w-0 break-words text-lg font-black leading-snug text-[#0F172A]">
                            {plan.name}
                          </h4>
                        </div>
                        <div className="mt-2.5">
                          <span className="rounded-full bg-[#E2ECE9] shadow-[inset_1px_1px_2px_rgba(165,185,180,0.4),inset_-1px_-1px_2px_rgba(255,255,255,0.8)] border border-white/50 text-[10px] font-mono font-bold text-[#7186A0] px-2.5 py-0.5">
                            ID: {plan.id.slice(0, 8).toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${plan.name}`}
                        title="Delete meal plan"
                        className="h-9 w-9 shrink-0 rounded-xl text-[#94A3B8] hover:text-[#EF4444] hover:bg-rose-50 border border-white/60 bg-white/50 shadow-[2px_2px_5px_rgba(180,200,196,0.15),-2px_-2px_5px_rgba(255,255,255,0.8)] transition-all"
                        onClick={() => handleDeletePlan(plan.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            className="h-10 w-full justify-center gap-2 rounded-xl border border-white bg-[#F0F7F5] shadow-[2px_2px_6px_rgba(180,200,196,0.25),-2px_-2px_6px_rgba(255,255,255,0.95)] hover:bg-[#E6F2EE] px-3 font-bold text-[#08B594] transition-all active:scale-95"
                          >
                            <UserMinus className="h-4 w-4" strokeWidth={2.2} />
                            <span>Revoke</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[min(280px,calc(100vw-32px))] rounded-2xl border border-white bg-white p-2 shadow-[6px_6px_20px_rgba(145,170,165,0.2)]">
                          <DropdownMenuLabel className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#7186A0]">
                            Revoke User Access
                          </DropdownMenuLabel>
                          <div className="max-h-[300px] overflow-y-auto">
                            {users.filter((u) => u.active_plan_name === plan.name).length === 0 ? (
                              <div className="px-3 py-3 text-xs font-semibold text-[#7186A0]">
                                No users are assigned to this plan.
                              </div>
                            ) : (
                              users
                                .filter((u) => u.active_plan_name === plan.name)
                                .map((u) => (
                                  <DropdownMenuItem
                                    key={u.id}
                                    onClick={() => handleRemovePlan(u.id, plan.id)}
                                    className="rounded-xl px-3 py-2 text-xs font-bold text-[#334155] hover:bg-[#F0F7F5] hover:text-[#08B594] transition-colors cursor-pointer"
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
                            className="h-10 w-full justify-center gap-2 rounded-xl bg-gradient-to-r from-[#08B594] via-[#07AB8C] to-[#069D80] px-3 font-bold text-white shadow-[0_3px_10px_rgba(8,169,130,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:brightness-105 active:scale-95 transition-all"
                          >
                            <UserPlus className="h-4 w-4" />
                            <span>Assign</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[min(280px,calc(100vw-32px))] rounded-2xl border border-white bg-white p-2 shadow-[6px_6px_20px_rgba(145,170,165,0.2)]">
                          <DropdownMenuLabel className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#7186A0]">
                            Assign User
                          </DropdownMenuLabel>
                          <div className="max-h-[300px] overflow-y-auto">
                            {users.map((u) => (
                              <DropdownMenuItem
                                key={u.id}
                                onClick={() => handleAssignPlan(u.id, plan.id)}
                                className="rounded-xl px-3 py-2 text-xs font-bold text-[#334155] hover:bg-[#F0F7F5] hover:text-[#08B594] transition-colors cursor-pointer"
                              >
                                <span className="min-w-0 flex-1 truncate">{u.full_name}</span>
                                {u.active_plan_name === plan.name && (
                                  <Check className="ml-2 h-4 w-4 shrink-0 text-[#08B594]" />
                                )}
                              </DropdownMenuItem>
                            ))}
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {[
                      { label: "Calories", value: `${plan.calories}`, unit: "kcal", isSpecial: false },
                      { label: "Protein", value: `${plan.protein}`, unit: "g", isSpecial: false },
                      { label: "Fats", value: `${plan.fats}`, unit: "g", isSpecial: false },
                      { label: "Carbs", value: `${plan.carbs}`, unit: "g", isSpecial: false },
                      { label: "Water", value: `${plan.water}`, unit: "ml", isSpecial: false },
                      { label: "Active Users", value: `${plan.members}`, unit: "members", isSpecial: true },
                    ].map(({ label, value, unit, isSpecial }) => (
                      <div
                        key={label}
                        className={`min-w-0 rounded-2xl p-3.5 border border-white/70 ${
                          isSpecial
                            ? "bg-gradient-to-br from-[#E2ECE9] to-[#D5E5E0] shadow-[inset_2px_2px_4px_rgba(165,185,180,0.45),inset_-2px_-2px_4px_rgba(255,255,255,0.85)]"
                            : "bg-[#E2ECE9] shadow-[inset_2px_2px_4px_rgba(165,185,180,0.45),inset_-2px_-2px_4px_rgba(255,255,255,0.85)]"
                        }`}
                      >
                        <p className="truncate text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#7186A0]">
                          {label}
                        </p>
                        <div className="mt-1.5 flex min-w-0 items-baseline gap-1">
                          <p className={`truncate text-base sm:text-lg font-black tracking-tight leading-none ${
                            isSpecial ? "text-[#08B594]" : "text-[#0F172A]"
                          }`}>
                            {value}
                          </p>
                          <span className={`shrink-0 text-xs font-semibold ${isSpecial ? "text-[#08B594]/80" : "text-[#7186A0]"}`}>
                            {unit}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Calculators — sitting seamlessly on the dark surface */}
      <section className="mt-10 pb-8">
        <div className="mb-3">
          <h3 className="flex items-center gap-2 text-xl font-black text-[#0F172A]">
            <CalculatorIcon className="h-5 w-5 text-[#08B594]" />
            Nutrition Calculators
          </h3>
          <p className="mt-1 text-xs font-semibold text-[#7186A0]">
            BMR, macro, and calorie tools for quick member reference.
          </p>
        </div>

        <Calculator />
      </section>
    </div>
  );
}