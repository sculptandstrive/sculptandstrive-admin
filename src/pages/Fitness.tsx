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
  Plus,
  SquarePen,
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

export default function Fitness() {
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [users, setUsers] = useState<any[]>([]);
  const { toast } = useToast();
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isExerciseDialogOpen, setIsExerciseDialogOpen] = useState(false);
  const [addCategory, setAddCategory] = useState("");
  const [allCategories, setAllCategories] = useState([]);
  const [addExercise, setAddExercise] = useState({ name: "", category_id: "" });
  const [allExercise, setAllExercise] = useState<any>([]);
  const [isEditExerciseOpen, setIsEditExerciseOpen] = useState(false);
  const [editExercise, setEditExercise] = useState({
    id: "",
    name: "",
    category_id: "",
  });
  // ------------------------- Plan States
  const [allPlans, setAllPlans] = useState<any[]>([]);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [isEditPlanOpen, setIsEditPlanOpen] = useState(false);
  const [isManagePlanOpen, setIsManagePlanOpen] = useState(false);
  const [isAddPlanExerciseOpen, setIsAddPlanExerciseOpen] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");
  const [editPlan, setEditPlan] = useState({ id: "", name: "" });
  const [activePlan, setActivePlan] = useState<any>(null);
  const [planExercises, setPlanExercises] = useState<any[]>([]);
  const [newPlanExercise, setNewPlanExercise] = useState({
    exercise_id: "",
    category_id: "",
    sets: "",
    reps: "",
    weight_kg: "",
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
      uniqueMovements: uniqueMovements,
      avgSets: Math.round(avgSets * 10) / 10,
      totalRepVolume: totalVol.toLocaleString(),
    };
  }, [exercises]);

  const handleAddExercise = async() => {
    if(addExercise.name.length < 3 || addExercise.name.length > 20){
      toast({
        title: "Add Exercise Error",
        description: "Exercise Name length should between 3 to 20 Characters",
        variant: "destructive",
      });
      return;
    }
    else if(addExercise.category_id === ""){
      toast({
        title: "Add Exercise Error",
        description: "Please Select a category for exercise",
        variant: "destructive",
      });
      return;
    }

    const {error} = await supabase.from('exercises_list').insert({
      category_id: addExercise.category_id,
      name: addExercise.name,
    })

    if(error){
       toast({
         title: "Server Error",
         description: "Please try again",
         variant: "destructive",
       });
       setIsExerciseDialogOpen(false);
       return;
    }

    toast({
      title: "Exercise Added Successfully",
    });

    fetchAllExercises();
    setIsExerciseDialogOpen(false);
  }

  const handleEditExercise = async () => {
    if (editExercise.name.length < 3 || editExercise.name.length > 20) {
      toast({
        title: "Edit Exercise Error",
        description:
          "Exercise Name length should be between 3 to 20 characters",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("exercises_list")
      .update({
        name: editExercise.name,
        category_id: editExercise.category_id,
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
    fetchAllExercises(); // refresh list
    setIsEditExerciseOpen(false);
  };

  const fetchAllExercises = async() => {
    const {data, error} = await supabase.from('exercises_list').select("*");
    setAllExercise(data)

    if(error){
      toast({
        title : "Exercise Server error",
        variant: "destructive"
      })
    }
  }

  const fetchFitnessData = async () => {
    try {
      setLoading(true);
      const { data: ExerciseData, error } = await supabase
        .from("exercises")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Supabase Connection Error:", error.message);
        throw error;
      }

      const usersExercises = await Promise.all(
        ExerciseData.map(async (data) => {
          const { data: user, error: erroruser } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", data.user_id)
            .single();
          return { ...data, full_name: user?.full_name.split(" ")[0] || null };
        }),
      );
      if (usersExercises) {
        setExercises(usersExercises);
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
    console.log("Data is: ", data);
    setAllCategories(data);
    if (error) {
      toast({
        variant: "destructive",
        title: "Fetch Category Error",
      });
    }
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
    } else {
      toast({
        title: "Category Deleted Successfully",
      });
    }
    fetchCategories();
  };

  // -- Plans Handlers
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
      .eq("plan_id", planId);
    if (!error) setPlanExercises(data ?? []);
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
    const { error } = await supabase.from("workout_plans").insert({
      name: newPlanName,
      created_by: user?.id,
    });
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
      toast({ title: "Exercise and Sets are required", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("workout_plan_exercises").insert({
      plan_id: activePlan.id,
      exercise_id: newPlanExercise.exercise_id,
      sets: parseInt(newPlanExercise.sets),
      reps: newPlanExercise.reps ? parseInt(newPlanExercise.reps) : null,
      weight_kg: newPlanExercise.weight_kg
        ? parseFloat(newPlanExercise.weight_kg)
        : null,
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

  useEffect(() => {
    fetchFitnessData();
    fetchCategories();
    fetchAllExercises();
    fetchPlans();
  }, []);

  const filteredExercises = useMemo(() => {
    return activeFilter === "All"
      ? exercises
      : exercises.filter((ex) => ex.category === activeFilter);
  }, [exercises, activeFilter]);

  const exercisesWithCategory = useMemo(() => {
    const mapped = allExercise.map((ex)=>({...ex, category_name: allCategories.find((cat)=>cat.id === ex.category_id)?.name ?? "Unknown"}));
    return activeFilter === "All"
      ? mapped
      : mapped.filter((ex) => ex.category_name === activeFilter);
  }, [allExercise, allCategories, activeFilter]);

  console.log(exercisesWithCategory)

  const handleDeleteExercise = async(exerciseId: string) => {
    const {error} = await supabase.from('exercises_list').delete().eq('id', exerciseId);

    if (!error) {
      setAllExercise((prev) => prev.filter((ex) => ex.id !== exerciseId));
      toast({ title: "Deleted" });
    } else {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: error.message,
      });
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure?")) return;

    const { error } = await supabase.from("exercises").delete().eq("id", id);

    if (!error) {
      setExercises((prev) => prev.filter((ex) => ex.id !== id));
      toast({ title: "Deleted" });
    } else {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: error.message,
      });
    }
  };

  const handleCreateCategory = async () => {
    if (addCategory.length < 3 || addCategory.length > 30) {
      toast({
        title: "Category Name Error",
        description: "Category Name length should between 3 to 30 Characters",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("exercise_category")
      .insert({ name: addCategory });

    if (error) {
      toast({
        title: "Server Error",
        variant: "destructive",
      });
      setAddCategory("");
      setIsCategoryDialogOpen(false);
    } else {
      toast({
        title: "Category Added Successfully",
      });
      setAddCategory("");
      setIsCategoryDialogOpen(false);
      fetchCategories();
    }
  };

  // Pending to add exercise added count
  const categories = allCategories.map((cat: any) => ({
    id: cat.id,
    name: cat.name,
    count: allExercise.filter((ex) => ex.category_id === cat.id).length,
  }));

  const filteredPlanExercises = allExercise.filter(
    (ex) => ex.category_id === newPlanExercise.category_id,
  );

  if (loading)
    return (
      <>
        <div className="flex h-[70vh] items-center justify-center">
          <Loader2 className="animate-spin" />
        </div>
      </>
    );

  return (
    <>
      <PageHeader
        title="Fitness Overview"
        description="Monitor system-wide exercise statistics."
      >
        <Dialog
          open={isExerciseDialogOpen}
          onOpenChange={setIsExerciseDialogOpen}
        >
          <DialogTrigger asChild>
            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="w-4 h-4" /> Add Exercise
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Exercise</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 gap-4">
                {/* Exercise Name */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Exercise Name</p>
                  <Input
                    type="text"
                    maxLength={30}
                    placeholder="e.g. Bench Press"
                    value={addExercise.name}
                    onChange={(e) =>
                      setAddExercise({ ...addExercise, name: e.target.value })
                    }
                  />
                </div>

                {/* Category Dropdown */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Category</p>
                  <Select
                    value={addExercise.category_id}
                    onValueChange={(value) =>
                      setAddExercise({ ...addExercise, category_id: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsExerciseDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddExercise}
                className="bg-emerald-600 text-white"
                disabled={!addExercise.name || !addExercise.category_id}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[120px]">
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

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Exercises"
          value={stats.totalCount}
          icon={Dumbbell}
          color="gradient-accent"
        />
        <StatCard
          title="Unique Moves"
          value={stats.uniqueMovements}
          icon={Trophy}
          color="bg-success/10"
          iconColor="text-success"
        />
        <StatCard
          title="Avg. Sets"
          value={stats.avgSets}
          icon={Timer}
          color="bg-primary/10"
          iconColor="text-primary"
        />
        <StatCard
          title="Rep Volume"
          value={stats.totalRepVolume}
          icon={Flame}
          color="bg-warning/10"
          iconColor="text-warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-card border-none bg-card/60 backdrop-blur-md">
          <CardHeader className="flex w-full flex-row justify-between items-center">
            <CardTitle className="font-display text-xl text-foreground">
              Categories
            </CardTitle>
            <Dialog
              open={isCategoryDialogOpen}
              onOpenChange={setIsCategoryDialogOpen}
            >
              <DialogTrigger asChild>
                <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Plus className="w-4 h-4" /> Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Category</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      Category Name (Max 20 chars)
                    </p>
                    <Input
                      type="text"
                      maxLength={20}
                      placeholder="e.g., Abs"
                      value={addCategory}
                      onChange={(e) => setAddCategory(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCategoryDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateCategory}
                    className="bg-emerald-600 text-white"
                  >
                    Save Category
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-4">
            {categories.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                No categories yet.
              </div>
            ) : (
              categories.map((category) => (
                <div key={category.id} className="space-y-2">
                  {" "}
                  {/* ← key on id not name */}
                  <div className="flex justify-between text-sm items-center">
                    <span className="font-medium">{category.name}</span>
                    <span className="text-muted-foreground">
                      {category.count}{" "}
                      {category.count === 1 ? "exercise" : "exercises"}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                      onClick={() => handledeleteCategory(category.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <Progress
                    value={
                      allExercise.length > 0
                        ? (category.count / allExercise.length) * 100
                        : 0
                    }
                    className="h-2"
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-card border-none bg-card/60 backdrop-blur-md">
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-2 justify-between items-center">
              <CardTitle className="font-display text-xl text-foreground">
                {activeFilter} Exercises List
              </CardTitle>
              <span className="text-xs text-muted-foreground uppercase tracking-widest">
                Showing {allExercise.length} results
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {exercisesWithCategory.length > 0 ? (
              exercisesWithCategory.map((ex) => (
                <div
                  key={ex.id}
                  className="flex flex-col md:flex-row items-center justify-between gap-2 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all group"
                >
                  <div className="flex flex-col md:flex-row items-center  gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                      <Dumbbell className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div className="min-w-0 flex flex-col items-center md:block">
                      <p className="font-bold text-foreground truncate">
                        {ex.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest">
                      {ex.category_name || "General"}
                    </p>
                  </div>
                  <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6">
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
                            });
                            setIsEditExerciseOpen(true);
                          }}
                          className="text-muted-foreground hover:text-blue-500"
                        >
                          <SquarePen className="w-5 h-5 text-blue-500" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Exercise</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Exercise Name</p>
                            <Input
                              type="text"
                              maxLength={20}
                              placeholder="e.g. Bench Press"
                              value={editExercise.name}
                              onChange={(e) =>
                                setEditExercise({
                                  ...editExercise,
                                  name: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Category</p>
                            <Select
                              value={editExercise.category_id}
                              onValueChange={(value) =>
                                setEditExercise({
                                  ...editExercise,
                                  category_id: value,
                                })
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id}>
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
                            onClick={() => setIsEditExerciseOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleEditExercise}
                            className="bg-emerald-600 text-white"
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
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                No data found.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-full shadow-card border-none bg-card/60 backdrop-blur-md">
          <CardHeader className="flex w-full flex-row justify-between items-center">
            <CardTitle className="font-display text-xl text-foreground">
              Workout Plans
            </CardTitle>
            {/* Create Plan Dialog */}
            <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Plus className="w-4 h-4" /> New Plan
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Workout Plan</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Plan Name</p>
                    <Input
                      placeholder="e.g. Push Day - Beginner"
                      value={newPlanName}
                      onChange={(e) => setNewPlanName(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsPlanDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreatePlan}
                    className="bg-emerald-600 text-white"
                  >
                    Create Plan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>

          <CardContent>
            {allPlans.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                No workout plans yet.
              </div>
            ) : (
              <div className="space-y-3">
                {allPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex flex-col md:flex-row items-center justify-between gap-2 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <Dumbbell className="w-5 h-5 text-emerald-700" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{plan.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Created{" "}
                          {new Date(plan.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Manage Exercises Dialog */}
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
                            className="gap-1 text-emerald-700 border-emerald-300"
                            onClick={() => {
                              setActivePlan(plan);
                              fetchPlanExercises(plan.id);
                              setIsManagePlanOpen(true);
                            }}
                          >
                            <SquarePen className="w-4 h-4" /> Manage
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Manage — {plan.name}</DialogTitle>
                          </DialogHeader>

                          <div className="space-y-4 py-2">
                            {/* Add exercise to plan button */}
                            <div className="flex justify-end">
                              <Dialog
                                open={isAddPlanExerciseOpen}
                                onOpenChange={setIsAddPlanExerciseOpen}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={() => {
                                      setNewPlanExercise({
                                        exercise_id: "",
                                        category_id: "",
                                        sets: "",
                                        reps: "",
                                        weight_kg: "",
                                      });
                                      setIsAddPlanExerciseOpen(true);
                                    }}
                                  >
                                    <Plus className="w-4 h-4" /> Add Exercise
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>
                                      Add Exercise to Plan
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="grid gap-4 py-4">
                                    {/* Step 1: Category */}
                                    <div className="space-y-2">
                                      <p className="text-sm font-medium">
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
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {allCategories.map((cat: any) => (
                                            <SelectItem
                                              key={cat.id}
                                              value={cat.id}
                                            >
                                              {cat.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    {/* Step 2: Exercise (filtered by category) */}
                                    {newPlanExercise.category_id && (
                                      <div className="space-y-2">
                                        <p className="text-sm font-medium">
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
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select exercise" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {filteredPlanExercises.length ===
                                            0 ? (
                                              <SelectItem value="none" disabled>
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

                                    {/* Step 3: Sets / Reps / Weight */}
                                    {newPlanExercise.exercise_id && (
                                      <div className="space-y-2">
                                        <p className="text-sm font-medium">
                                          Sets / Reps / Weight (kg)
                                        </p>
                                        <div className="flex gap-2">
                                          <Input
                                            type="number"
                                            placeholder="Sets *"
                                            value={newPlanExercise.sets}
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
                                            onChange={(e) =>
                                              setNewPlanExercise({
                                                ...newPlanExercise,
                                                reps: e.target.value,
                                              })
                                            }
                                          />
                                          <Input
                                            type="number"
                                            placeholder="Weight kg"
                                            value={newPlanExercise.weight_kg}
                                            onChange={(e) =>
                                              setNewPlanExercise({
                                                ...newPlanExercise,
                                                weight_kg: e.target.value,
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
                                      onClick={() =>
                                        setIsAddPlanExerciseOpen(false)
                                      }
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      onClick={handleAddExerciseToPlan}
                                      className="bg-emerald-600 text-white"
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

                            {/* Exercise list in plan */}
                            {planExercises.length === 0 ? (
                              <div className="text-center py-8 text-muted-foreground text-sm">
                                No exercises in this plan yet.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {planExercises.map((pe) => (
                                  <div
                                    key={pe.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                                  >
                                    <div>
                                      <p className="font-medium text-sm">
                                        {pe.exercises_list?.name}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {allCategories.find(
                                          (c: any) =>
                                            c.id ===
                                            pe.exercises_list?.category_id,
                                        )?.name ?? "—"}
                                        {" • "}
                                        {pe.sets} sets
                                        {pe.reps ? ` • ${pe.reps} reps` : ""}
                                        {pe.weight_kg
                                          ? ` • ${pe.weight_kg} kg`
                                          : ""}
                                      </p>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        handleRemoveExerciseFromPlan(pe.id)
                                      }
                                      className="text-red-400 hover:text-red-600"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setIsManagePlanOpen(false)}
                            >
                              Done
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      {/* Edit Plan Name Dialog */}
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
                            className="text-blue-500"
                          >
                            <SquarePen className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Plan Name</DialogTitle>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Plan Name</p>
                              <Input
                                value={editPlan.name}
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
                              onClick={() => setIsEditPlanOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleEditPlan}
                              className="bg-emerald-600 text-white"
                            >
                              Save
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeletePlan(plan.id)}
                        className="text-red-400 hover:text-red-600"
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

        <Card className="lg:col-span-2 shadow-card border-none bg-card/60 backdrop-blur-md">
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-2 justify-between items-center">
              <CardTitle className="font-display text-xl text-foreground">
                {activeFilter} Exercises
              </CardTitle>
              <span className="text-xs text-muted-foreground uppercase tracking-widest">
                Showing {filteredExercises.length} results
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredExercises.length > 0 ? (
              filteredExercises.map((ex) => (
                <div
                  key={ex.id}
                  className="flex flex-col md:flex-row items-center justify-between gap-2 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all group"
                >
                  <div className="flex flex-col md:flex-row items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                      <Dumbbell className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div className="min-w-0 flex flex-col items-center md:block">
                      <p className="font-bold text-foreground truncate">
                        {ex.name}
                      </p>
                      <p className="text-xs text-muted-foreground uppercase tracking-widest">
                        {ex.category || "General"} • {ex.sets} Sets
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <p className="text-primary font-semibold">{ex.full_name}</p>
                  </div>
                  <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6">
                    <div className="flex justify-between gap-4 items-center md:block text-right">
                      <p className="font-bold text-accent">{ex.reps} reps</p>
                      <p className="text-xs text-muted-foreground">
                        Total: {ex.sets * ex.reps}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(ex.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-muted-foreground">
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
    <Card className="shadow-card border-none">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            <p className="text-3xl font-black text-foreground">{value}</p>
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon
              className={`w-6 h-6 ${iconColor || "text-accent-foreground"}`}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
