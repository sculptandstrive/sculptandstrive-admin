import { useState, useEffect, useMemo } from "react";
import {
  Dumbbell,
  Flame,
  Timer,
  Trophy,
  Filter,
  Loader2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus,
  SquarePen,
  UserPlus,
  Users,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { EXERCISE_CATEGORIES } from "@/utils/ExerciseCategories";

export default function Fitness() {
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [users, setUsers] = useState<any[]>([]);
  const { toast } = useToast();
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isExerciseDialogOpen, setIsExerciseDialogOpen] = useState(false);
  const [addCategory, setAddCategory] = useState("");
  const [parentCategoryId, setParentCategoryId] = useState("");
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState("");
  const [allCategories, setAllCategories] = useState([]);
  const [addExercise, setAddExercise] = useState({
    name: "",
    details: "",
    category_id: "",
    sub_category: "",
    difficulty: ""
  });
  const [allExercise, setAllExercise] = useState<any>([]);
  const [isEditExerciseOpen, setIsEditExerciseOpen] = useState(false);
  const [editExercise, setEditExercise] = useState({
    id: "",
    name: "",
    category_id: "",
    details: "",
    sub_category: "",
    difficulty: ""
  });
  // ------------------------- Plan States
  const [allPlans, setAllPlans] = useState<any[]>([]);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [isEditPlanOpen, setIsEditPlanOpen] = useState(false);
  const [isManagePlanOpen, setIsManagePlanOpen] = useState(false);
  const [isAddPlanExerciseOpen, setIsAddPlanExerciseOpen] = useState(false);
  const [isAssignUsersOpen, setIsAssignUsersOpen] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");
  const [editPlan, setEditPlan] = useState({ id: "", name: "" });
  const [activePlan, setActivePlan] = useState<any>(null);
  const [planExercises, setPlanExercises] = useState<any[]>([]);
  const [adminWeightUnit, setAdminWeightUnit] = useState<"kg" | "lbs">(
    (localStorage.getItem("admin_weight_unit") as "kg" | "lbs") || "kg"
  );
  const [planAssignments, setPlanAssignments] = useState<any[]>([]);
  const [assignUserId, setAssignUserId] = useState("");
  const [newPlanExercise, setNewPlanExercise] = useState({
    exercise_id: "",
    category_id: "",
    sets: "",
    reps: "",
    weight_kg: "",
    rest_timer: "30",
    details: ""
  });

  const stats = useMemo(() => {
    const total = exercises.length;
    const uniqueMovements = new Set(exercises.map((ex) => ex.name)).size;
    const avgSets =
      total > 0
        ? exercises.reduce((acc, curr) => acc + (Number(curr.sets) || 0), 0) /
        total
        : 0;
    const totalVol = exercises.reduce(
      (acc, curr) => acc + (Number(curr.sets) || 0) * (Number(curr.reps) || 0),
      0,
    );
    return {
      totalCount: total,
      uniqueMovements,
      avgSets: Math.round(avgSets * 10) / 10,
      totalRepVolume: totalVol.toLocaleString(),
    };
  }, [exercises]);

  const handleAddExercise = async () => {
    if (addExercise.name.length < 3 || addExercise.name.length > 100) {
      toast({
        title: "Add Exercise Error",
        description: "Exercise Name length should be between 3 to 100 Characters",
        variant: "destructive",
      });
      return;
    }
    else if (addExercise.category_id === "") {
      toast({
        title: "Add Exercise Error",
        description: "Please Select a category for exercise",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("exercises_list").insert({
      category_id: addExercise.category_id,
      name: addExercise.name,
      sub_category: addExercise.sub_category || null,
      difficulty: addExercise.difficulty || null
    });

    if (error) {
      toast({
        title: "Server Error",
        description: "Please try again",
        variant: "destructive",
      });
      setIsExerciseDialogOpen(false);
      return;
    }

    toast({ title: "Exercise Added Successfully" });
    fetchAllExercises();
    setIsExerciseDialogOpen(false);
  };

  const handleEditExercise = async () => {
    if (editExercise.name.length < 3 || editExercise.name.length > 100) {
      toast({
        title: "Edit Exercise Error",
        description: "Exercise Name length should be between 3 to 100 characters",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("exercises_list")
      .update({
        name: editExercise.name,
        category_id: editExercise.category_id,
        sub_category: editExercise.sub_category || null,
        difficulty: editExercise.difficulty || null
      })
      .eq("id", editExercise.id);

    if (error) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Exercise Updated Successfully" });
    fetchAllExercises();
    setIsEditExerciseOpen(false);
  };

  const fetchAllExercises = async () => {
    const { data, error } = await supabase.from("exercises_list").select("*");
    // console.log(data);
    setAllExercise(data);
    if (error) {
      toast({ title: "Exercise Server error", variant: "destructive" });
    }
  };

  const fetchFitnessData = async () => {
    try {
      setLoading(true);
      const [ExerciseData, profilesRes, assignmentsRes] = await Promise.all([
        supabase
          .from("exercises")
          .select("*")
          .order("created_at", { ascending: false }),
        (supabase as any).from("profiles").select("user_id, full_name, email").eq('is_admin', false),
        (supabase as any)
          .from("client_workout_assignments")
          .select("client_id, plan_id"),
      ]);

      // Enrich exercises with user full_name
      if (ExerciseData.data) {
        const enriched = await Promise.all(
          ExerciseData.data.map(async (data: any) => {
            const { data: user } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", data.user_id)
              .single();
            return {
              ...data,
              full_name: user?.full_name?.split(" ")[0] || null,
            };
          }),
        );
        setExercises(enriched);
      }

      // Build users list with their active plan name
      const assignments: any[] = assignmentsRes.data || [];
      if (profilesRes.data) {
        const formattedUsers = (profilesRes.data as any[]).map((profile) => {
          // A user may have multiple plan assignments; grab the first for display
          const userAssignment = assignments.find(
            (a) => a.client_id === profile.user_id,
          );
          const activePlanEntry = allPlans.find(
            (p) => p.id === userAssignment?.plan_id,
          );
          return {
            id: profile.user_id,
            full_name: profile.full_name || "Unknown User",
            email: profile.email || "No Email",
            active_plan_name: activePlanEntry ? activePlanEntry.name : null,
          };
        });
        setUsers(formattedUsers);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fetch Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("exercise_category")
      .select("*");
    
    const dbCats = data ?? [];
    const dbCatNames = new Set(dbCats.map((c: any) => c.name?.toLowerCase()));
    
    const staticCats = EXERCISE_CATEGORIES.filter(
      (cat) => !dbCatNames.has(cat.name.toLowerCase())
    ).map((cat) => ({
      id: `static-${cat.id}`,
      name: cat.name,
    }));

    setAllCategories([...dbCats, ...staticCats] as any);
  };

  const handledeleteCategory = async (categoryId: string) => {
    const { error } = await supabase
      .from("exercise_category")
      .delete()
      .eq("id", categoryId);
    if (error) {
      toast({
        title: "Cannot able to delete category data",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Category Deleted Successfully" });
    fetchCategories();
    fetchAllExercises();
  };

  // ── Plans ──────────────────────────────────────────────────────────────────

  const fetchPlans = async () => {
    const { data, error } = await supabase
      .from("workout_plans")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setAllPlans(data ?? []);
  };

  const fetchPlanExercises = async (planId: string) => {
    const { data, error } = await supabase
      .from("workout_plan_exercises")
      .select("*, exercises_list(name, category_id)")
      .eq("plan_id", planId)
      .order("display_order", { ascending: true });
    if (!error) setPlanExercises(data ?? []);
  };

  const fetchPlanAssignments = async (planId: string) => {
    const { data, error } = await supabase
      .from("client_workout_assignments")
      .select("id, client_id, plan_id, profiles(full_name, email)")
      .eq("plan_id", planId);

    if (error) {
      toast({ title: "Failed to load assigned users", variant: "destructive" });
      return;
    }

    const enriched = (data ?? []).map((row: any) => ({
      id: row.id,
      client_id: row.client_id,
      plan_id: row.plan_id,
      full_name: row.profiles?.full_name || "Unknown",
      email: row.profiles?.email || "",
    }));
    setPlanAssignments(enriched);
  };

  const handleCreatePlan = async () => {
    if (newPlanName.length < 3 || newPlanName.length > 50) {
      toast({
        title: "Plan name must be between 3 and 50 characters",
        variant: "destructive",
      });
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("workout_plans")
      .insert({ name: newPlanName, created_by: user?.id });
    if (error) {
      toast({ title: "Failed to create plan", variant: "destructive" });
      return;
    }
    toast({ title: "Plan Created Successfully" });
    setNewPlanName("");
    setIsPlanDialogOpen(false);
    fetchPlans();
  };

  const handleEditPlan = async () => {
    if (editPlan.name.length < 3 || editPlan.name.length > 50) {
      toast({
        title: "Plan name must be between 3 and 50 characters",
        variant: "destructive",
      });
      return;
    }
    const { error } = await supabase
      .from("workout_plans")
      .update({ name: editPlan.name })
      .eq("id", editPlan.id);
    if (error) {
      toast({ title: "Failed to update plan", variant: "destructive" });
      return;
    }
    toast({ title: "Plan Updated Successfully" });
    setIsEditPlanOpen(false);
    fetchPlans();
  };

  const handleDeletePlan = async (planId: string) => {
    if (
      !window.confirm(
        "Delete this plan? All exercises in it will also be removed.",
      )
    )
      return;
    const { error } = await supabase
      .from("workout_plans")
      .delete()
      .eq("id", planId);
    if (error) {
      toast({ title: "Failed to delete plan", variant: "destructive" });
      return;
    }
    toast({ title: "Plan Deleted" });
    fetchPlans();
  };

  const handleAddExerciseToPlan = async () => {
    if (!newPlanExercise.exercise_id || !newPlanExercise.sets) {
      toast({
        title: "Exercise and Sets are required",
        variant: "destructive",
      });
      return;
    }
    const nextOrder = planExercises.length > 0
      ? Math.max(...planExercises.map((e: any) => e.display_order ?? 0)) + 1
      : 1;

    const { error } = await supabase.from("workout_plan_exercises").insert({
      plan_id: activePlan.id,
      exercise_id: newPlanExercise.exercise_id,
      sets: parseInt(newPlanExercise.sets),
      reps: newPlanExercise.reps ? parseInt(newPlanExercise.reps) : null,
      weight_kg: newPlanExercise.weight_kg
        ? adminWeightUnit === "lbs"
          ? parseFloat(newPlanExercise.weight_kg) / 2.20462
          : parseFloat(newPlanExercise.weight_kg)
        : null,
      rest_timer: newPlanExercise.rest_timer
        ? parseInt(newPlanExercise.rest_timer, 10)
        : 30,
      description: newPlanExercise.details,
      display_order: nextOrder
    });
    if (error) {
      toast({ title: "Failed to add exercise", variant: "destructive" });
      return;
    }
    toast({ title: "Exercise Added to Plan" });
    setNewPlanExercise({
      exercise_id: "",
      category_id: "",
      sets: "",
      reps: "",
      weight_kg: "",
      rest_timer: "30",
      details: ""
    });
    setIsAddPlanExerciseOpen(false);
    fetchPlanExercises(activePlan.id);
  };

  const handleRemoveExerciseFromPlan = async (id: string) => {
    const { error } = await supabase
      .from("workout_plan_exercises")
      .delete()
      .eq("id", id);
    if (error) {
      toast({ title: "Failed to remove exercise", variant: "destructive" });
      return;
    }
    toast({ title: "Exercise Removed" });
    fetchPlanExercises(activePlan.id);
  };

  const handleMoveExercise = async (currentEx: any, direction: "up" | "down") => {
    const currentIndex = planExercises.findIndex((ex) => ex.id === currentEx.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= planExercises.length) return;

    const targetEx = planExercises[targetIndex];

    // Swap display_orders (using indices as backup fallback if null)
    const currentOrder = currentEx.display_order ?? currentIndex;
    const targetOrder = targetEx.display_order ?? targetIndex;

    const { error: err1 } = await supabase
      .from("workout_plan_exercises")
      .update({ display_order: targetOrder })
      .eq("id", currentEx.id);

    const { error: err2 } = await supabase
      .from("workout_plan_exercises")
      .update({ display_order: currentOrder })
      .eq("id", targetEx.id);

    if (err1 || err2) {
      toast({ title: "Failed to change sequence", variant: "destructive" });
    } else {
      fetchPlanExercises(activePlan.id);
    }
  };

  // ── User Assignment ────────────────────────────────────────────────────────

  const handleAssignPlan = async (userId: string, planId: string) => {
    const alreadyAssigned = planAssignments.some((a) => a.client_id === userId);
    if (alreadyAssigned) {
      toast({
        title: "User already assigned to this plan",
        variant: "destructive",
      });
      return;
    }

    // Get the current logged-in admin's user_id to store as who assigned this plan
    const { data: { user: adminUser } } = await supabase.auth.getUser();
    const adminUserId = adminUser?.id;

    // Update the plan's created_by to the current admin so the user sees correct name
    if (adminUserId) {
      await supabase
        .from("workout_plans")
        .update({ created_by: adminUserId })
        .eq("id", planId);
    }

    const { error } = await supabase
      .from("client_workout_assignments")
      .insert({ client_id: userId, plan_id: planId });

    if (error) {
      toast({
        title: "Failed to assign user",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "User Assigned",
      description: "User has been added to the plan.",
    });
    setAssignUserId("");
    fetchPlanAssignments(planId);
    fetchFitnessData();
  };

  const handleRemovePlan = async (assignmentId: string, planId: string) => {
    if (!window.confirm("Remove this user from the plan?")) return;

    const { error } = await supabase
      .from("client_workout_assignments")
      .delete()
      .eq("id", assignmentId);

    if (error) {
      toast({
        title: "Failed to remove user",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "User Removed",
      description: "User has been removed from the plan.",
    });
    fetchPlanAssignments(planId);
    fetchFitnessData();
  };

  // ── Init ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchFitnessData();
    fetchCategories();
    fetchAllExercises();
    fetchPlans();
  }, []);

  // Re-run fetchFitnessData once allPlans is populated so active_plan_name resolves
  useEffect(() => {
    if (allPlans.length > 0) fetchFitnessData();
  }, [allPlans.length]);

  const filteredExercises = useMemo(() => {
    return activeFilter === "All"
      ? exercises
      : exercises.filter((ex) => ex.category === activeFilter);
  }, [exercises, activeFilter]);

  const exercisesWithCategory = useMemo(() => {
    const mapped = allExercise.map((ex: any) => ({
      ...ex,
      category_name:
        (allCategories as any[]).find((cat: any) => cat.id === ex.category_id)
          ?.name ?? "Unknown",
    }));

    let result = mapped;
    if (activeFilter !== "All") {
      result = result.filter((ex: any) => ex.category_name === activeFilter);
    }

    if (exerciseSearchQuery.trim()) {
      const q = exerciseSearchQuery.toLowerCase();
      result = result.filter((ex: any) =>
        ex.name?.toLowerCase().includes(q) ||
        ex.category_name?.toLowerCase().includes(q) ||
        (ex.sub_category && ex.sub_category.toLowerCase().includes(q))
      );
    }

    return result;
  }, [allExercise, allCategories, activeFilter, exerciseSearchQuery]);

  const handleDeleteExercise = async (exerciseId: string) => {
    const { error } = await supabase
      .from("exercises_list")
      .delete()
      .eq("id", exerciseId);
    if (!error) {
      setAllExercise((prev: any[]) =>
        prev.filter((ex) => ex.id !== exerciseId),
      );
      toast({ title: "Deleted" });
    } else {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: error.message,
      });
    }
  };

  // const handleDelete = async (id: string) => {
  //   if (!window.confirm("Are you sure?")) return;
  //   const { error } = await supabase.from("exercises").delete().eq("id", id);
  //   if (!error) {
  //     setExercises((prev) => prev.filter((ex) => ex.id !== id));
  //     toast({ title: "Deleted" });
  //   } else {
  //     toast({
  //       variant: "destructive",
  //       title: "Delete Failed",
  //       description: error.message,
  //     });
  //   }
  // };

  const handleCreateCategory = async () => {
    if (addCategory.length < 3 || addCategory.length > 100) {
      toast({
        title: "Category Name Error",
        description: "Category Name length should between 3 to 100 Characters",
        variant: "destructive",
      });
      return;
    }
    let finalName = addCategory;
    if (parentCategoryId && parentCategoryId !== "none") {
      const parentCat: any = allCategories.find((cat: any) => cat.id === parentCategoryId);
      if (parentCat) {
        finalName = `${parentCat.name} > ${addCategory}`;
      }
    }
    const { error } = await supabase
      .from("exercise_category")
      .insert({ name: finalName });
    if (error) {
      toast({ title: "Server Error", variant: "destructive" });
    } else {
      toast({ title: "Category Added Successfully" });
      fetchCategories();
    }
    setAddCategory("");
    setParentCategoryId("");
    setIsCategoryDialogOpen(false);
  };

  const handleEditCategory = async () => {
    if (editCategoryName.length < 3 || editCategoryName.length > 100) {
      toast({
        title: "Category Name Error",
        description: "Category Name length should be between 3 to 100 characters",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("exercise_category")
      .update({ name: editCategoryName })
      .eq("id", editCategoryId);

    if (error) {
      toast({ title: "Server Error", variant: "destructive" });
    } else {
      toast({ title: "Category Updated Successfully" });
      fetchCategories();
      fetchAllExercises();
    }
    setIsEditCategoryOpen(false);
  };

  const categories = (allCategories as any[]).map((cat: any) => ({
    id: cat.id,
    name: cat.name,
    count: allExercise.filter((ex: any) => ex.category_id === cat.id).length,
  }));

  const groupedCategories = useMemo(() => {
    const parents = categories.filter((cat: any) => !cat.name.includes(" > "));
    parents.sort((a: any, b: any) => a.name.localeCompare(b.name));

    return parents.map((parent: any) => {
      const subs = categories.filter((cat: any) => {
        const parts = cat.name.split(" > ");
        return parts.length > 1 && parts[0] === parent.name;
      });
      subs.sort((a: any, b: any) => a.name.localeCompare(b.name));

      return {
        ...parent,
        subcategories: subs
      };
    });
  }, [categories]);

  const filteredPlanExercises = allExercise.filter(
    (ex: any) => ex.category_id === newPlanExercise.category_id,
  );

  // Users not yet assigned to the active plan (for the assign dropdown)
  const unassignedUsers = useMemo(() => {
    const assignedIds = new Set(planAssignments.map((a) => a.client_id));
    return users.filter((u) => !assignedIds.has(u.id));
  }, [users, planAssignments]);

  if (loading)
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="animate-spin text-[#2E9D7A]" />
      </div>
    );

  return (
    <>

      <style>{`
  /* Fitness UI: EMERALD GREEN THEME */
  [data-radix-select-content] [data-highlighted],
  [data-radix-select-content] [data-state="checked"],
  [role="option"][data-highlighted],
  [role="option"][data-state="checked"] {
    background-color: #07AC7D !important;
    color: #FFFFFF !important;
  }

  [data-radix-menu-content] [data-highlighted],
  [data-radix-menu-content] [data-state="checked"],
  [role="menuitem"][data-highlighted] {
    background-color: #07AC7D !important;
    color: #FFFFFF !important;
  }

  .bg-accent,
  .hover\\:bg-accent:hover,
  .focus\\:bg-accent:focus {
    background-color: #07AC7D !important;
    color: #FFFFFF !important;
  }
`}</style>

      <PageHeader
        title="Fitness Overview"
        description="Monitor system-wide exercise statistics."
      >
        <Dialog
          open={isExerciseDialogOpen}
          onOpenChange={setIsExerciseDialogOpen}
        >
          <DialogTrigger asChild>
            <Button className="gap-2 bg-[#07AC7D] hover:bg-[#07AC7D] text-white rounded-[10px] transition-colors duration-150">
              <Plus className="w-4 h-4" /> Add Exercise
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[14px]">
            <DialogHeader>
              <DialogTitle className="text-[18px] font-semibold text-[#111827]">Add Exercise</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-[#475569]">Exercise Name</p>
                <Input
                  type="text"
                  maxLength={100}
                  placeholder="e.g. Bench Press"
                  value={addExercise.name}
                  className="border-[#CBD5E1] rounded-[8px] focus-visible:border-[#07AC7D] focus-visible:ring-[3px] focus-visible:ring-[#07AC7D]/[.12]"
                  onChange={(e) =>
                    setAddExercise({ ...addExercise, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-[#475569]">Category</p>
                <Select
                  value={addExercise.category_id}
                  onValueChange={(value) =>
                    setAddExercise({ ...addExercise, category_id: value, sub_category: "" })
                  }
                >
                  <SelectTrigger className="w-full border-[#CBD5E1] rounded-[8px] focus:border-[#07AC7D] focus:ring-[3px] focus:ring-[#07AC7D]/[.12]">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom">
                    {categories.filter((cat) => !cat.name.includes(" > ")).map((cat) => (
                      <SelectItem key={cat.id} value={cat.id} className="focus:bg-[#07AC7D] focus:text-white data-[highlighted]:bg-[#07AC7D] data-[highlighted]:text-white data-[state=checked]:bg-[#07AC7D] data-[state=checked]:text-white">
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subcategory selection dropdown */}
              {(() => {
                const selectedParent = allCategories.find((cat: any) => cat.id === addExercise.category_id) as any;
                const subs = selectedParent
                  ? (allCategories as any[]).filter((cat: any) => cat.name.startsWith(`${selectedParent.name} > `))
                  : [];
                if (subs.length === 0) return null;
                return (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-[#475569]">Subcategory</p>
                    <Select
                      value={addExercise.sub_category || "none"}
                      onValueChange={(value) =>
                        setAddExercise({
                          ...addExercise,
                          sub_category: value === "none" ? "" : value,
                        })
                      }
                    >
                      <SelectTrigger className="w-full border-[#CBD5E1] rounded-[8px] focus:border-[#07AC7D] focus:ring-[3px] focus:ring-[#07AC7D]/[.12]">
                        <SelectValue placeholder="Select a subcategory" />
                      </SelectTrigger>
                      <SelectContent position="popper" side="bottom">
                        <SelectItem value="none" className="focus:bg-[#07AC7D] focus:text-white data-[highlighted]:bg-[#07AC7D] data-[highlighted]:text-white data-[state=checked]:bg-[#07AC7D] data-[state=checked]:text-white">None</SelectItem>
                        {subs.map((sub: any) => {
                          const subName = sub.name.split(" > ")[1];
                          return (
                            <SelectItem key={sub.id} value={subName} className="focus:bg-[#07AC7D] focus:text-white data-[highlighted]:bg-[#07AC7D] data-[highlighted]:text-white data-[state=checked]:bg-[#07AC7D] data-[state=checked]:text-white">
                              {subName}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })()}

              {/* Difficulty Level selection dropdown */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-[#475569]">Difficulty Level</p>
                <Select
                  value={addExercise.difficulty}
                  onValueChange={(value) =>
                    setAddExercise({
                      ...addExercise,
                      difficulty: value,
                    })
                  }
                >
                  <SelectTrigger className="w-full border-[#CBD5E1] rounded-[8px] focus:border-[#07AC7D] focus:ring-[3px] focus:ring-[#07AC7D]/[.12]">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom">
                    <SelectItem value="Beginner" className="focus:bg-[#07AC7D] focus:text-white data-[highlighted]:bg-[#07AC7D] data-[highlighted]:text-white data-[state=checked]:bg-[#07AC7D] data-[state=checked]:text-white">Beginner</SelectItem>
                    <SelectItem value="Intermediate" className="focus:bg-[#07AC7D] focus:text-white data-[highlighted]:bg-[#07AC7D] data-[highlighted]:text-white data-[state=checked]:bg-[#07AC7D] data-[state=checked]:text-white">Intermediate</SelectItem>
                    <SelectItem value="Advanced" className="focus:bg-[#07AC7D] focus:text-white data-[highlighted]:bg-[#07AC7D] data-[highlighted]:text-white data-[state=checked]:bg-[#07AC7D] data-[state=checked]:text-white">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                className="border-[#E2E8F0] rounded-[10px]"
                onClick={() => setIsExerciseDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddExercise}
                className="bg-[#07AC7D] hover:bg-[#07AC7D] text-white rounded-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!addExercise.name || !addExercise.category_id}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[120px] border-[#E2E8F0] rounded-[10px] text-[#334155]">
              <Filter className="w-4 h-4 mr-2" />
              {activeFilter === "All" ? "Filter View" : activeFilter}
              <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setActiveFilter("All")}>
              All Categories
            </DropdownMenuItem>
            {categories.map((cat) => (
              <DropdownMenuItem
                key={cat.name}
                onClick={() => setActiveFilter(cat.name)}
              >
                {cat.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5 mb-8">
        <StatCard
          title="Total Exercises"
          value={stats.totalCount}
          icon={Dumbbell}
          color="bg-white"
          iconColor="text-[#2E9D7A]"
          caption="All logged exercises"
        />
        <StatCard
          title="Unique Moves"
          value={stats.uniqueMovements}
          icon={Trophy}
          color="bg-[#7C5CFC]/10"
          iconColor="text-[#7C5CFC]"
          caption="Distinct movements tracked"
        />
        <StatCard
          title="Avg. Sets"
          value={stats.avgSets}
          icon={Timer}
          color="bg-[#4F7CFF]/10"
          iconColor="text-[#4F7CFF]"
          caption="Average sets per exercise"
        />
        <StatCard
          title="Rep Volume"
          value={stats.totalRepVolume}
          icon={Flame}
          color="bg-[#F59E0B]/10"
          iconColor="text-[#F59E0B]"
          caption="Total reps logged"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Categories ── */}

        <Card className="border border-[#E2E8F0] rounded-[14px] shadow-[0_4px_18px_rgba(15,23,42,0.05)] bg-white">
          <CardHeader className="flex w-full md:flex-row flex-col md:justify-between md:items-center">
            <CardTitle className="text-[18px] font-semibold text-[#111827]">
              Categories
            </CardTitle>
            <Dialog
              open={isCategoryDialogOpen}
              onOpenChange={setIsCategoryDialogOpen}
            >
              <DialogTrigger asChild>
                <Button className="gap-2 bg-[#07AC7D] hover:bg-[#06966D] text-white rounded-[10px] transition-colors duration-150">
                  <Plus className="w-4 h-4" /> Add Category
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[14px]">
                <DialogHeader>
                  <DialogTitle className="text-[18px] font-semibold text-[#111827]">Add New Category / Subcategory</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-[#475569]">
                      Category Name
                    </p>
                    <Input
                      type="text"
                      maxLength={100}
                      placeholder="e.g., Beginner or Hamstrings"
                      value={addCategory}
                      className="border-[#CBD5E1] rounded-[8px] focus-visible:border-[#07AC7D] focus-visible:ring-[3px] focus-visible:ring-[#07AC7D]/[.12]"
                      onChange={(e) => setAddCategory(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-[#475569]">
                      Parent Category <span className="text-[#64748B] font-normal">(Optional - to create a Subcategory)</span>
                    </p>
                    <Select
                      value={parentCategoryId || "none"}
                      onValueChange={(value) =>
                        setParentCategoryId(value === "none" ? "" : value)
                      }
                    >
                      <SelectTrigger className="w-full border-[#CBD5E1] rounded-[8px] focus:border-[#07AC7D] focus:ring-[3px] focus:ring-[#07AC7D]/[.12]">
                        <SelectValue placeholder="Select parent category (optional)" />
                      </SelectTrigger>
                      <SelectContent position="popper" side="bottom">
                        <SelectItem value="none" className="focus:bg-[#07AC7D] focus:text-white data-[highlighted]:bg-[#07AC7D] data-[highlighted]:text-white data-[state=checked]:bg-[#07AC7D] data-[state=checked]:text-white">None (Create as Parent Category)</SelectItem>
                        {categories
                          .filter((cat: any) => !cat.name.includes(" > "))
                          .map((cat: any) => (
                            <SelectItem key={cat.id} value={cat.id} className="focus:bg-[#07AC7D] focus:text-white data-[highlighted]:bg-[#07AC7D] data-[highlighted]:text-white data-[state=checked]:bg-[#07AC7D] data-[state=checked]:text-white">
                              {cat.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    className="border-[#E2E8F0] rounded-[10px]"
                    onClick={() => {
                      setIsCategoryDialogOpen(false);
                      setAddCategory("");
                      setParentCategoryId("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateCategory}
                    className="bg-[#07AC7D] hover:bg-[#06966D] text-white rounded-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!addCategory.trim()}
                  >
                    Save Category
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-4">
            {categories.length === 0 ? (
              <div className="text-center py-10 text-[#64748B] text-sm">
                No categories yet.
              </div>
            ) : (
              groupedCategories.map((parent: any) => {
                return (
                  <div key={parent.id} className="py-3 border-b border-[#E2E8F0] last:border-b-0 space-y-2">
                    {/* Parent Category Row */}
                    <div className="flex justify-between text-sm items-center">
                      <span className="font-semibold text-[#111827]">
                        {parent.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[#64748B] text-xs">
                          {parent.count} {parent.count === 1 ? "exercise" : "exercises"}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-[#2E9D7A] hover:text-[#06966D] hover:bg-[#F1FAF6] shrink-0 rounded-[8px]"
                          onClick={() => {
                            setEditCategoryId(parent.id);
                            setEditCategoryName(parent.name);
                            setIsEditCategoryOpen(true);
                          }}
                        >
                          <SquarePen className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-[#EF4444] hover:text-[#DC2626] hover:bg-[#EF4444]/10 shrink-0 rounded-[8px]"
                          onClick={() => handledeleteCategory(parent.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <Progress
                      value={
                        allExercise.length > 0
                          ? (parent.count / allExercise.length) * 100
                          : 0
                      }
                      className="h-2 bg-[#E2E8F0] mt-2 [&>div]:bg-[#07AC7D]"
                    />

                    {/* Subcategories (Indented underneath) */}
                    {parent.subcategories.length > 0 && (
                      <div className="mt-2 pl-4 border-l-2 border-[#07AC7D]/20 ml-2 space-y-2">
                        {parent.subcategories.map((sub: any) => {
                          const subDisplayName = sub.name.split(" > ")[1] || sub.name;
                          return (
                            <div key={sub.id} className="flex justify-between text-sm items-center py-1">
                              <span className="text-[#64748B] text-xs">
                                {subDisplayName}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[#64748B] text-[10px]">
                                  {sub.count} {sub.count === 1 ? "exercise" : "exercises"}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-[#2E9D7A] hover:text-[#06966D] hover:bg-[#F1FAF6] shrink-0 rounded-[8px]"
                                  onClick={() => {
                                    setEditCategoryId(sub.id);
                                    setEditCategoryName(sub.name);
                                    setIsEditCategoryOpen(true);
                                  }}
                                >
                                  <SquarePen className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-[#EF4444] hover:text-[#DC2626] hover:bg-[#EF4444]/10 shrink-0 rounded-[8px]"
                                  onClick={() => handledeleteCategory(sub.id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Dialog open={isEditCategoryOpen} onOpenChange={setIsEditCategoryOpen}>
          <DialogContent className="rounded-[14px]">
            <DialogHeader>
              <DialogTitle className="text-[18px] font-semibold text-[#111827]">Edit Category / Subcategory</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-[#475569]">Category Name</p>
                <Input
                  type="text"
                  maxLength={100}
                  placeholder="Category name..."
                  value={editCategoryName}
                  className="border-[#CBD5E1] rounded-[8px] focus-visible:border-[#07AC7D] focus-visible:ring-[3px] focus-visible:ring-[#07AC7D]/[.12]"
                  onChange={(e) => setEditCategoryName(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="border-[#E2E8F0] rounded-[10px]" onClick={() => setIsEditCategoryOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleEditCategory}
                className="bg-[#07AC7D] hover:bg-[#07AC7D] text-white rounded-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!editCategoryName.trim()}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Exercises List ── */}
        <Card className="lg:col-span-2 border border-[#E2E8F0] rounded-[14px] shadow-[0_4px_18px_rgba(15,23,42,0.05)] bg-white">
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center w-full">
              <CardTitle className="text-[20px] font-semibold text-[#111827]">
                {activeFilter} Exercises List
              </CardTitle>
              <div className="flex items-center gap-4 w-full md:w-auto">
                <Input
                  placeholder="Search exercises..."
                  value={exerciseSearchQuery}
                  onChange={(e) => setExerciseSearchQuery(e.target.value)}
                  className="max-w-[240px] h-9 text-xs border-[#CBD5E1] rounded-[8px] focus-visible:border-[#07AC7D] focus-visible:ring-[3px] focus-visible:ring-[#07AC7D]/[.12]"
                />
                <span className="text-xs text-[#64748B] uppercase tracking-widest whitespace-nowrap">
                  Showing {exercisesWithCategory.length} results
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {exercisesWithCategory.length > 0 ? (
              exercisesWithCategory.map((ex: any) => (
                <div
                  key={ex.id}
                  className="flex flex-col md:flex-row items-center justify-between gap-2 p-4 rounded-[14px] bg-[#F5F7F9] hover:bg-[#F5F7F9]/70 transition-all group"
                >
                  <div className="flex flex-col md:flex-row items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-[10px] bg-[#07AC7D] flex items-center justify-center flex-shrink-0">
                      <Dumbbell className="w-6 h-6 text-white" />
                    </div>
                    <div className="min-w-0 flex flex-col items-center md:block">
                      <p className="text-sm font-medium text-[#111827] break-words whitespace-normal">
                        {ex.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        {ex.category_name && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-[#7C5CFC]/10 border-[#7C5CFC]/30 text-[#7C5CFC] px-2 py-0.5 font-semibold"
                          >
                            {ex.category_name}
                          </Badge>
                        )}
                        {ex.sub_category && ex.sub_category !== "none" && (
                          <Badge variant="outline" className="text-xs bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981] font-semibold">
                            {ex.sub_category}
                          </Badge>
                        )}
                        {ex.difficulty && (
                          <Badge variant="outline" className={`text-xs font-semibold ${ex.difficulty === "Beginner" ? "bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]" :
                            ex.difficulty === "Intermediate" ? "bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B]" :
                              "bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]"
                            }`}>
                            {ex.difficulty}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <p className="text-xs text-[#64748B] uppercase tracking-widest">
                      {ex.category_name || "General"}
                    </p>
                  </div>
                  <div className="flex flex-col md:flex-row items-center gap-2 md:gap-5">
                    <Dialog

                      open={isEditExerciseOpen && editExercise.id === ex.id}
                      onOpenChange={(open) => {
                        if (!open) setIsEditExerciseOpen(false);
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditExercise({
                              id: ex.id,
                              name: ex.name,
                              category_id: ex.category_id,
                              details: ex.description || "",
                              sub_category: ex.sub_category || "",
                              difficulty: ex.difficulty || "",
                            });
                            setIsEditExerciseOpen(true);
                          }}
                          className="text-[#64748B] hover:text-[#4F7CFF] hover:bg-[#4F7CFF]/10 rounded-[8px]"
                        >
                          <SquarePen className="w-4 h-4 text-[#4F7CFF]" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="rounded-[14px]">
                        <DialogHeader>
                          <DialogTitle className="text-[18px] font-semibold text-[#111827]">Edit Exercise</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="space-y-2">
                            <p className="text-sm font-semibold text-[#475569]">Exercise Name</p>
                            <Input
                              type="text"
                              maxLength={100}
                              placeholder="e.g. Bench Press"
                              value={editExercise.name}
                              className="border-[#CBD5E1] rounded-[8px] focus-visible:border-[#07AC7D] focus-visible:ring-[3px] focus-visible:ring-[#07AC7D]/[.12]"
                              onChange={(e) =>
                                setEditExercise({
                                  ...editExercise,
                                  name: e.target.value,
                                })
                              }
                            />
                          </div>
                          {/* <div className="space-y-2">
                            <p className="text-sm font-medium">Exercise Description</p>
                            <Input
                              type="text"
                              maxLength={300}
                              placeholder="No Details..."
                              value={editExercise.details}
                              onChange={(e) =>
                                setEditExercise({
                                  ...editExercise,
                                  details: e.target.value,
                                })
                              }
                            />
                          </div> */}
                          <div className="space-y-2">
                            <p className="text-sm font-semibold text-[#475569]">Category</p>
                            <Select
                              value={editExercise.category_id}
                              onValueChange={(value) =>
                                setEditExercise({
                                  ...editExercise,
                                  category_id: value,
                                  sub_category: "",
                                })
                              }
                            >
                              <SelectTrigger className="w-full border-[#CBD5E1] rounded-[8px] focus:border-[#07AC7D] focus:ring-[3px] focus:ring-[#07AC7D]/[.12]">
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                              <SelectContent position="popper" side="bottom">
                                {categories.filter((cat) => !cat.name.includes(" > ")).map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id} className="focus:bg-[#07AC7D] focus:text-white data-[highlighted]:bg-[#07AC7D] data-[highlighted]:text-white data-[state=checked]:bg-[#07AC7D] data-[state=checked]:text-white">
                                    {cat.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Subcategory selection dropdown */}
                          {(() => {
                            const selectedParent = allCategories.find((cat: any) => cat.id === editExercise.category_id) as any;
                            const subs = selectedParent
                              ? (allCategories as any[]).filter((cat: any) => cat.name.startsWith(`${selectedParent.name} > `))
                              : [];
                            if (subs.length === 0) return null;
                            return (
                              <div className="space-y-2">
                                <p className="text-sm font-semibold text-[#475569]">Subcategory</p>
                                <Select
                                  value={editExercise.sub_category || "none"}
                                  onValueChange={(value) =>
                                    setEditExercise({
                                      ...editExercise,
                                      sub_category: value === "none" ? "" : value,
                                    })
                                  }
                                >
                                  <SelectTrigger className="w-full border-[#CBD5E1] rounded-[8px] focus:border-[#07AC7D] focus:ring-[3px] focus:ring-[#07AC7D]/[.12]">
                                    <SelectValue placeholder="Select a subcategory" />
                                  </SelectTrigger>
                                  <SelectContent position="popper" side="bottom">
                                    <SelectItem value="none" className="focus:bg-[#07AC7D] focus:text-white data-[highlighted]:bg-[#07AC7D] data-[highlighted]:text-white data-[state=checked]:bg-[#07AC7D] data-[state=checked]:text-white">None</SelectItem>
                                    {subs.map((sub: any) => {
                                      const subName = sub.name.split(" > ")[1];
                                      return (
                                        <SelectItem key={sub.id} value={subName} className="focus:bg-[#07AC7D] focus:text-white data-[highlighted]:bg-[#07AC7D] data-[highlighted]:text-white data-[state=checked]:bg-[#07AC7D] data-[state=checked]:text-white">
                                          {subName}
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                              </div>
                            );
                          })()}

                          {/* Difficulty Level selection dropdown */}
                          <div className="space-y-2">
                            <p className="text-sm font-semibold text-[#475569]">Difficulty Level</p>
                            <Select
                              value={editExercise.difficulty}
                              onValueChange={(value) =>
                                setEditExercise({
                                  ...editExercise,
                                  difficulty: value,
                                })
                              }
                            >
                              <SelectTrigger className="w-full border-[#CBD5E1] rounded-[8px] focus:border-[#07AC7D] focus:ring-[3px] focus:ring-[#07AC7D]/[.12]">
                                <SelectValue placeholder="Select difficulty" />
                              </SelectTrigger>
                              <SelectContent position="popper" side="bottom">
                                <SelectItem value="Beginner" className="focus:bg-[#07AC7D] focus:text-white data-[highlighted]:bg-[#07AC7D] data-[highlighted]:text-white data-[state=checked]:bg-[#07AC7D] data-[state=checked]:text-white">Beginner</SelectItem>
                                <SelectItem value="Intermediate" className="focus:bg-[#07AC7D] focus:text-white data-[highlighted]:bg-[#07AC7D] data-[highlighted]:text-white data-[state=checked]:bg-[#07AC7D] data-[state=checked]:text-white">Intermediate</SelectItem>
                                <SelectItem value="Advanced" className="focus:bg-[#07AC7D] focus:text-white data-[highlighted]:bg-[#07AC7D] data-[highlighted]:text-white data-[state=checked]:bg-[#07AC7D] data-[state=checked]:text-white">Advanced</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            className="border-[#E2E8F0] rounded-[10px]"
                            onClick={() => setIsEditExerciseOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleEditExercise}
                            className="bg-[#07AC7D] hover:bg-[#07AC7D] text-white rounded-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={
                              !editExercise.name || !editExercise.category_id
                            }
                          >
                            Save Changes
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteExercise(ex.id)}
                      className="text-[#64748B] hover:text-[#EF4444] hover:bg-[#EF4444]/10 rounded-[8px]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-[#64748B]">
                No data found.
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Workout Plans ── */}
        <Card className="lg:col-span-full border border-[#E2E8F0] rounded-[14px] shadow-[0_4px_18px_rgba(15,23,42,0.05)] bg-white">
          <CardHeader className="flex w-full flex-col md:flex-row md:justify-between md:items-center">
            <CardTitle className="text-[18px] font-semibold text-[#111827]">
              Workout Plans
            </CardTitle>
            <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-[#07AC7D] hover:bg-[#07AC7D] text-white rounded-[10px] transition-colors duration-150">
                  <Plus className="w-4 h-4" /> New Plan
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[14px]">
                <DialogHeader>
                  <DialogTitle className="text-[18px] font-semibold text-[#111827]">Create Workout Plan</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-[#475569]">Plan Name</p>
                    <Input
                      placeholder="e.g. Push Day - Beginner"
                      value={newPlanName}
                      className="border-[#CBD5E1] rounded-[8px] focus-visible:border-[#07AC7D] focus-visible:ring-[3px] focus-visible:ring-[#07AC7D]/[.12]"
                      onChange={(e) => setNewPlanName(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    className="border-[#E2E8F0] rounded-[10px]"
                    onClick={() => setIsPlanDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreatePlan}
                    className="bg-[#07AC7D] hover:bg-[#07AC7D] text-white rounded-[10px]"
                  >
                    Create Plan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>

          <CardContent>
            {allPlans.length === 0 ? (
              <div className="text-center py-10 text-[#64748B]">
                No workout plans yet.
              </div>
            ) : (
              <div className="space-y-3">
                {allPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex flex-col md:flex-row items-center justify-between gap-2 p-4 rounded-[14px] bg-[#F5F7F9] hover:bg-[#F5F7F9]/70 transition-all"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-[10px] bg-[#07AC7D] flex items-center justify-center flex-shrink-0">
                        <Dumbbell className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#111827]">{plan.name}</p>
                        <p className="text-xs text-[#64748B]">
                          Created{" "}
                          {new Date(plan.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-2">
                      {/* ── Manage Exercises Dialog ── */}
                      <Dialog
                        open={isManagePlanOpen && activePlan?.id === plan.id}
                        onOpenChange={(open) => {
                          if (!open) setIsManagePlanOpen(false);
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-[#2E9D7A] border-[#07AC7D]/40 hover:bg-[#07AC7D] rounded-[8px]"
                            onClick={() => {
                              setActivePlan(plan);
                              fetchPlanExercises(plan.id);
                              setIsManagePlanOpen(true);
                            }}
                          >
                            <SquarePen className="w-4 h-4" /> Manage
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl rounded-[14px]">
                          <DialogHeader>
                            <DialogTitle className="text-[18px] font-semibold text-[#111827]">Manage — {plan.name}</DialogTitle>
                          </DialogHeader>

                          <div className="space-y-4 py-2">
                            <div className="flex justify-end">
                              <Dialog
                                open={isAddPlanExerciseOpen}
                                onOpenChange={setIsAddPlanExerciseOpen}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    className="gap-1 bg-[#07AC7D] hover:bg-[#07AC7D] text-white rounded-[8px]"
                                    onClick={() => {
                                      setNewPlanExercise({
                                        exercise_id: "",
                                        category_id: "",
                                        sets: "",
                                        reps: "",
                                        weight_kg: "",
                                        rest_timer: "30",
                                        details: "",
                                      });
                                      setIsAddPlanExerciseOpen(true);
                                    }}
                                  >
                                    <Plus className="w-4 h-4" /> Add Exercise
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="rounded-[14px]">
                                  <DialogHeader>
                                    <DialogTitle className="text-[18px] font-semibold text-[#111827]">
                                      Add Exercise to Plan
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="grid gap-4 py-4">
                                    <div className="space-y-2">
                                      <p className="text-sm font-semibold text-[#475569]">
                                        Category
                                      </p>
                                      <Select
                                        value={newPlanExercise.category_id}
                                        onValueChange={(value) =>
                                          setNewPlanExercise({
                                            ...newPlanExercise,
                                            category_id: value,
                                            exercise_id: "",
                                          })
                                        }
                                      >
                                        <SelectTrigger className="border-[#CBD5E1] rounded-[8px] focus:border-[#07AC7D] focus:ring-[3px] focus:ring-[#07AC7D]/[.12]">
                                          <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent position="popper" side="bottom">
                                          {(allCategories as any[]).map(
                                            (cat: any) => (
                                              <SelectItem
                                                key={cat.id}
                                                value={cat.id}
                                              >
                                                {cat.name}
                                              </SelectItem>
                                            ),
                                          )}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    {newPlanExercise.category_id && (
                                      <div className="space-y-2">
                                        <p className="text-sm font-semibold text-[#475569]">
                                          Exercise
                                        </p>
                                        <Select
                                          value={newPlanExercise.exercise_id}
                                          onValueChange={(value) =>
                                            setNewPlanExercise({
                                              ...newPlanExercise,
                                              exercise_id: value,
                                            })
                                          }
                                        >
                                          <SelectTrigger className="border-[#CBD5E1] rounded-[8px] focus:border-[#07AC7D] focus:ring-[3px] focus:ring-[#07AC7D]/[.12]">
                                            <SelectValue placeholder="Select exercise" />
                                          </SelectTrigger>
                                          <SelectContent position="popper" side="bottom">
                                            {filteredPlanExercises.length ===
                                              0 ? (
                                              <SelectItem value="none" disabled className="focus:bg-[#07AC7D] focus:text-white data-[highlighted]:bg-[#07AC7D] data-[highlighted]:text-white data-[state=checked]:bg-[#07AC7D] data-[state=checked]:text-white">
                                                No exercises in this category
                                              </SelectItem>
                                            ) : (
                                              filteredPlanExercises.map(
                                                (ex: any) => (
                                                  <SelectItem
                                                    key={ex.id}
                                                    value={ex.id}
                                                  >
                                                    {ex.name}
                                                  </SelectItem>
                                                ),
                                              )
                                            )}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    )}

                                    {newPlanExercise.exercise_id && (
                                      <div className="space-y-2">
                                        <div className="flex justify-between items-center mt-2">
                                          <p className="text-sm font-semibold text-[#475569]">
                                            Sets / Reps / Weight ({adminWeightUnit})
                                          </p>
                                          <div className="flex gap-1 bg-[#F5F7F9] p-0.5 rounded-[8px] border border-[#E2E8F0]">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setAdminWeightUnit("kg");
                                                localStorage.setItem("admin_weight_unit", "kg");
                                              }}
                                              className={`text-[9px] px-2 py-0.5 rounded font-bold transition-all ${adminWeightUnit === "kg"
                                                ? "bg-white text-[#2E9D7A] shadow-sm"
                                                : "text-[#64748B] hover:text-[#334155]"
                                                }`}
                                            >
                                              KG
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setAdminWeightUnit("lbs");
                                                localStorage.setItem("admin_weight_unit", "lbs");
                                              }}
                                              className={`text-[9px] px-2 py-0.5 rounded font-bold transition-all ${adminWeightUnit === "lbs"
                                                ? "bg-white text-[#2E9D7A] shadow-sm"
                                                : "text-[#64748B] hover:text-[#334155]"
                                                }`}
                                            >
                                              LBS
                                            </button>
                                          </div>
                                        </div>
                                        <div className="flex gap-2 mt-1">
                                          <Input
                                            type="number"
                                            placeholder="Sets *"
                                            value={newPlanExercise.sets}
                                            className="border-[#CBD5E1] rounded-[8px] focus-visible:border-[#07AC7D] focus-visible:ring-[3px] focus-visible:ring-[#07AC7D]/[.12]"
                                            onChange={(e) =>
                                              setNewPlanExercise({
                                                ...newPlanExercise,
                                                sets: e.target.value,
                                              })
                                            }
                                          />
                                          <Input
                                            type="number"
                                            placeholder="Reps"
                                            value={newPlanExercise.reps}
                                            className="border-[#CBD5E1] rounded-[8px] focus-visible:border-[#07AC7D] focus-visible:ring-[3px] focus-visible:ring-[#07AC7D]/[.12]"
                                            onChange={(e) =>
                                              setNewPlanExercise({
                                                ...newPlanExercise,
                                                reps: e.target.value,
                                              })
                                            }
                                          />
                                          <Input
                                            type="number"
                                            placeholder={`Weight (${adminWeightUnit})`}
                                            value={newPlanExercise.weight_kg}
                                            className="border-[#CBD5E1] rounded-[8px] focus-visible:border-[#07AC7D] focus-visible:ring-[3px] focus-visible:ring-[#07AC7D]/[.12]"
                                            onChange={(e) =>
                                              setNewPlanExercise({
                                                ...newPlanExercise,
                                                weight_kg: e.target.value,
                                              })
                                            }
                                          />
                                        </div>

                                        <p className="text-sm font-semibold text-[#475569]">
                                          Rest Timer
                                        </p>
                                        <Input
                                          type="number"
                                          placeholder="Rest time (sec)"
                                          className="min-w-[120px] border-[#CBD5E1] rounded-[8px] focus-visible:border-[#07AC7D] focus-visible:ring-[3px] focus-visible:ring-[#07AC7D]/[.12]"
                                          value={newPlanExercise.rest_timer}
                                          onChange={(e) =>
                                            setNewPlanExercise({
                                              ...newPlanExercise,
                                              rest_timer: e.target.value,
                                            })
                                          }
                                        />

                                        <div className="space-y-2">
                                          <p className="text-sm font-semibold text-[#475569]">
                                            Exercise Description
                                          </p>
                                          <Textarea
                                            maxLength={300}
                                            placeholder="Max 300 Characters"
                                            value={newPlanExercise.details}
                                            className="border-[#CBD5E1] rounded-[8px] focus-visible:border-[#07AC7D] focus-visible:ring-[3px] focus-visible:ring-[#07AC7D]/[.12]"
                                            onChange={(e) =>
                                              setNewPlanExercise({
                                                ...newPlanExercise,
                                                details: e.target.value,
                                              })
                                            }
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <DialogFooter>
                                    <Button
                                      variant="outline"
                                      className="border-[#E2E8F0] rounded-[10px]"
                                      onClick={() =>
                                        setIsAddPlanExerciseOpen(false)
                                      }
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      onClick={handleAddExerciseToPlan}
                                      className="bg-[#07AC7D] hover:bg-[#07AC7D] text-white rounded-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                                      disabled={
                                        !newPlanExercise.exercise_id ||
                                        !newPlanExercise.sets
                                      }
                                    >
                                      Add to Plan
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>

                            {planExercises.length === 0 ? (
                              <div className="text-center py-8 text-[#64748B] text-sm">
                                No exercises in this plan yet.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {planExercises.map((pe, index) => (
                                  <div
                                    key={pe.id}
                                    className="flex items-center justify-between p-3 rounded-[10px] bg-[#F5F7F9]"
                                  >
                                    <div>
                                      <p className="font-medium text-sm text-[#111827]">
                                        {pe.exercises_list?.name}
                                      </p>
                                      <p className="text-xs text-[#64748B]">
                                        {(allCategories as any[]).find(
                                          (c: any) =>
                                            c.id ===
                                            pe.exercises_list?.category_id,
                                        )?.name ?? "—"}
                                        {" • "}
                                        {pe.sets} sets
                                        {pe.reps ? ` • ${pe.reps} reps ` : ""}
                                        {pe.weight_kg
                                          ? adminWeightUnit === "lbs"
                                            ? ` • ${Math.round(pe.weight_kg * 2.20462 * 10) / 10} lbs `
                                            : ` • ${pe.weight_kg} kg `
                                          : ""}
                                        • {pe.rest_timer}s Rest Time
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        disabled={index === 0}
                                        onClick={() => handleMoveExercise(pe, "up")}
                                        className="h-8 w-8 text-[#94A3B8] hover:text-[#334155] rounded-[8px]"
                                      >
                                        <ChevronUp className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        disabled={index === planExercises.length - 1}
                                        onClick={() => handleMoveExercise(pe, "down")}
                                        className="h-8 w-8 text-[#94A3B8] hover:text-[#334155] rounded-[8px]"
                                      >
                                        <ChevronDown className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                          handleRemoveExerciseFromPlan(pe.id)
                                        }
                                        className="text-[#EF4444] hover:text-[#DC2626] hover:bg-[#EF4444]/10 rounded-[8px]"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              className="border-[#E2E8F0] rounded-[10px]"
                              onClick={() => setIsManagePlanOpen(false)}
                            >
                              Done
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      {/* ── Assign Users Dialog ── */}
                      <Dialog
                        open={isAssignUsersOpen && activePlan?.id === plan.id}
                        onOpenChange={(open) => {
                          if (!open) {
                            setIsAssignUsersOpen(false);
                            setAssignUserId("");
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-[#4F7CFF] border-[#4F7CFF]/40 hover:bg-[#4F7CFF]/10 rounded-[8px]"
                            onClick={() => {
                              setActivePlan(plan);
                              fetchPlanAssignments(plan.id);
                              setAssignUserId("");
                              setIsAssignUsersOpen(true);
                            }}
                          >
                            <Users className="w-4 h-4" /> Users
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg rounded-[14px]">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-[18px] font-semibold text-[#111827]">
                              <Users className="w-4 h-4 text-[#4F7CFF]" />
                              Assigned Users — {plan.name}
                            </DialogTitle>
                          </DialogHeader>

                          <div className="space-y-5 py-2">
                            {/* Assign new user */}
                            <div className="space-y-2">
                              <p className="text-sm font-semibold text-[#475569]">
                                Assign a User
                              </p>
                              <div className="flex gap-2">
                                <Select
                                  value={assignUserId}
                                  onValueChange={setAssignUserId}
                                >
                                  <SelectTrigger className="flex-1 border-[#CBD5E1] rounded-[8px] focus:border-[#07AC7D] focus:ring-[3px] focus:ring-[#07AC7D]/[.12]">
                                    <SelectValue
                                      placeholder={
                                        unassignedUsers.length === 0
                                          ? "All users assigned"
                                          : "Select user…"
                                      }
                                    />
                                  </SelectTrigger>
                                  <SelectContent position="popper" side="bottom">
                                    {unassignedUsers.length === 0 ? (
                                      <SelectItem value="none" disabled className="focus:bg-[#07AC7D] focus:text-white data-[highlighted]:bg-[#07AC7D] data-[highlighted]:text-white data-[state=checked]:bg-[#07AC7D] data-[state=checked]:text-white">
                                        No unassigned users
                                      </SelectItem>
                                    ) : (
                                      unassignedUsers.map((u) => (
                                        <SelectItem key={u.id} value={u.id} className="focus:bg-[#07AC7D] focus:text-white data-[highlighted]:bg-[#07AC7D] data-[highlighted]:text-white data-[state=checked]:bg-[#07AC7D] data-[state=checked]:text-white">
                                          {u.full_name}
                                          <span className="ml-1 text-xs focus:bg-[#07AC7D] focus:text-white text-[#64748B]">
                                            ({u.email})
                                          </span>
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                                <Button
                                  className="gap-1 bg-[#07AC7D] hover:bg-[#07AC7D] text-white shrink-0 rounded-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                                  disabled={!assignUserId}
                                  onClick={() =>
                                    handleAssignPlan(assignUserId, plan.id)
                                  }
                                >
                                  <UserPlus className="w-4 h-4" /> Assign
                                </Button>
                              </div>
                            </div>

                            {/* Currently assigned users */}
                            <div className="space-y-2">
                              <p className="text-sm font-semibold text-[#475569]">
                                Currently Assigned
                                {planAssignments.length > 0 && (
                                  <Badge variant="secondary" className="ml-2 bg-[#E2E8F0] text-[#334155]">
                                    {planAssignments.length}
                                  </Badge>
                                )}
                              </p>

                              {planAssignments.length === 0 ? (
                                <div className="text-center py-6 text-[#64748B] text-sm rounded-[10px] border border-dashed border-[#E2E8F0]">
                                  No users assigned to this plan yet.
                                </div>
                              ) : (
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                  {planAssignments.map((assignment) => (
                                    <div
                                      key={assignment.id}
                                      className="flex items-center justify-between p-3 rounded-[10px] bg-[#F5F7F9] hover:bg-[#F5F7F9]/70 transition-all"
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-full bg-[#4F7CFF]/10 flex items-center justify-center flex-shrink-0">
                                          <span className="text-xs font-semibold text-[#4F7CFF]">
                                            {assignment.full_name
                                              .charAt(0)
                                              .toUpperCase()}
                                          </span>
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-sm font-medium text-[#111827] truncate">
                                            {assignment.full_name}
                                          </p>
                                          <p className="text-xs text-[#64748B] truncate">
                                            {assignment.email}
                                          </p>
                                        </div>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                          handleRemovePlan(
                                            assignment.id,
                                            plan.id,
                                          )
                                        }
                                        className="text-[#EF4444] hover:text-[#DC2626] hover:bg-[#EF4444]/10 shrink-0 rounded-[8px]"
                                        title="Remove user from plan"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <DialogFooter>
                            <Button
                              variant="outline"
                              className="border-[#E2E8F0] rounded-[10px]"
                              onClick={() => setIsAssignUsersOpen(false)}
                            >
                              Done
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      {/* ── Edit Plan Name Dialog ── */}
                      <Dialog
                        open={isEditPlanOpen && editPlan.id === plan.id}
                        onOpenChange={(open) => {
                          if (!open) setIsEditPlanOpen(false);
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditPlan({ id: plan.id, name: plan.name });
                              setIsEditPlanOpen(true);
                            }}
                            className="text-[#4F7CFF] hover:bg-[#4F7CFF]/10 rounded-[8px]"
                          >
                            <SquarePen className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-[14px]">
                          <DialogHeader>
                            <DialogTitle className="text-[18px] font-semibold text-[#111827]">Edit Plan Name</DialogTitle>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                              <p className="text-sm font-semibold text-[#475569]">Plan Name</p>
                              <Input
                                value={editPlan.name}
                                className="border-[#CBD5E1] rounded-[8px] focus-visible:border-[#07AC7D] focus-visible:ring-[3px] focus-visible:ring-[#07AC7D]/[.12]"
                                onChange={(e) =>
                                  setEditPlan({
                                    ...editPlan,
                                    name: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              className="border-[#E2E8F0] rounded-[10px]"
                              onClick={() => setIsEditPlanOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleEditPlan}
                              className="bg-[#07AC7D] hover:bg-[#07AC7D] text-white rounded-[10px]"
                            >
                              Save
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      {/* ── Delete Plan ── */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeletePlan(plan.id)}
                        className="text-[#EF4444] hover:text-[#DC2626] hover:bg-[#EF4444]/10 rounded-[8px]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── User Exercises (logged) ── */}
        <Card className="lg:col-span-full border border-[#E2E8F0] rounded-[14px] shadow-[0_4px_18px_rgba(15,23,42,0.05)] bg-white">
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-2 justify-between items-center">
              <CardTitle className="text-[20px] font-semibold text-[#111827]">
                {activeFilter} Exercises
              </CardTitle>
              <span className="text-xs text-[#64748B] uppercase tracking-widest">
                Showing {filteredExercises.length} results
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredExercises.length > 0 ? (
              filteredExercises.map((ex) => (
                <div
                  key={ex.id}
                  className="flex flex-col md:flex-row items-center justify-between gap-2 p-4 rounded-[14px] bg-[#F5F7F9] hover:bg-[#F5F7F9]/70 transition-all group"
                >
                  <div className="flex flex-col md:flex-row items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-[10px] bg-[#07AC7D] flex items-center justify-center flex-shrink-0">
                      <Dumbbell className="w-6 h-6 text-white" />
                    </div>
                    <div className="min-w-0 flex flex-col items-center md:block">
                      <p className="text-sm font-medium text-[#111827] break-words whitespace-normal">
                        {ex.name}
                      </p>
                      <p className="text-xs text-[#64748B] uppercase tracking-widest">
                        {ex.category || "General"} • {ex.sets} Sets
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <p className="text-[#2E9D7A] font-semibold">{ex.full_name}</p>
                  </div>
                  <div className="flex flex-col md:flex-row items-center gap-2 md:gap-5">
                    <div className="flex justify-between gap-4 items-center md:block text-right">
                      <p className="text-sm font-medium text-[#07AC7D]">{ex.reps} reps</p>
                      <p className="text-xs text-[#64748B]">
                        Total: {ex.sets * ex.reps}
                      </p>
                    </div>
                    {/* <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(ex.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button> */}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-[#64748B]">
                No data found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function StatCard({ title, value, icon: Icon, color, iconColor }: any) {
  return (
    <Card className="border border-[#E2E8F0] rounded-[14px] shadow-[0_4px_18px_rgba(15,23,42,0.05)] bg-white">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[#64748B]">
              {title}
            </p>
            <p className="text-[30px] sm:text-[32px] font-bold text-[#111827] leading-none">{value}</p>
          </div>
          <div className={`p-3 rounded-[10px] ${color}`}>
            <Icon
              className={`w-6 h-6 ${iconColor || "text-[#2E9D7A]"}`}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}