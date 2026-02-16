import { useState, useEffect, useMemo } from "react";
import { Dumbbell, Flame, Timer, Trophy, Filter, Loader2, Trash2, ChevronDown } from "lucide-react";
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

export default function Fitness() {
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const { toast } = useToast();

  const stats = useMemo(() => {
    const total = exercises.length;
    const uniqueMovements = new Set(exercises.map((ex) => ex.name)).size;
    const avgSets = total > 0
      ? exercises.reduce((acc, curr) => acc + (Number(curr.sets) || 0), 0) / total
      : 0;
    const totalVol = exercises.reduce((acc, curr) =>
      acc + (Number(curr.sets) || 0) * (Number(curr.reps) || 0), 0);

    return {
      totalCount: total,
      uniqueMovements: uniqueMovements,
      avgSets: Math.round(avgSets * 10) / 10,
      totalRepVolume: totalVol.toLocaleString(),
    };
  }, [exercises]);

  const fetchFitnessData = async () => {
    try {
      setLoading(true);
      const { data: ExerciseData, error } = await supabase
        .from("exercises")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;

      const usersExercises = await Promise.all(
        (ExerciseData || []).map(async (data) => {
          const { data: user } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", data.user_id)
            .single();
          return { ...data, full_name: user?.full_name?.split(' ')[0] || "User" };
        })
      );
      setExercises(usersExercises);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Fetch Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFitnessData();
  }, []);

  const filteredExercises = useMemo(() => {
    return activeFilter === "All"
      ? exercises
      : exercises.filter((ex) => ex.category === activeFilter);
  }, [exercises, activeFilter]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure?")) return;
    const { error } = await supabase.from("exercises").delete().eq("id", id);
    if (!error) {
      setExercises((prev) => prev.filter((ex) => ex.id !== id));
      toast({ title: "Deleted" });
    } else {
      toast({ variant: "destructive", title: "Delete Failed", description: error.message });
    }
  };

  const categories = ["Strength", "Cardio", "HIIT", "Yoga", "Pilates"].map((cat) => ({
    name: cat,
    count: exercises.filter((ex) => ex.category === cat).length,
  }));

  if (loading) return (
    <DashboardLayout>
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="px-2 md:px-0"> {/* Mobile Padding */}
        <PageHeader
          title="Fitness Overview"
          description="Monitor system-wide exercise statistics."
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Filter className="w-4 h-4 mr-2" />
                {activeFilter === "All" ? "Filter View" : activeFilter}
                <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setActiveFilter("All")}>All Categories</DropdownMenuItem>
              {["Strength", "Cardio", "HIIT", "Yoga", "Pilates"].map((cat) => (
                <DropdownMenuItem key={cat} onClick={() => setActiveFilter(cat)}>
                  {cat}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </PageHeader>

        {/* Updated Grid: 1 col on mobile, 2 on tablet, 4 on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Exercises" value={stats.totalCount} icon={Dumbbell} color="bg-accent/10" iconColor="text-accent" />
          <StatCard title="Unique Moves" value={stats.uniqueMovements} icon={Trophy} color="bg-success/10" iconColor="text-success" />
          <StatCard title="Avg. Sets" value={stats.avgSets} icon={Timer} color="bg-primary/10" iconColor="text-primary" />
          <StatCard title="Rep Volume" value={stats.totalRepVolume} icon={Flame} color="bg-warning/10" iconColor="text-warning" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="shadow-card border-none bg-card/60 backdrop-blur-md h-fit">
            <CardHeader><CardTitle className="text-xl">Categories</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {categories.map((category) => (
                <div key={category.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{category.name}</span>
                    <span className="text-muted-foreground">{category.count} items</span>
                  </div>
                  <Progress value={(category.count / (exercises.length || 1)) * 100} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 shadow-card border-none bg-card/60 backdrop-blur-md">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <CardTitle className="text-xl">{activeFilter} Exercises</CardTitle>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                  Showing {filteredExercises.length} results
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredExercises.length > 0 ? (
                filteredExercises.map((ex) => (
                  <div key={ex.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 gap-3 group">
                    {/* min-w-0 and truncate fixes the "FGHJJJ" issue */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
                        <Dumbbell className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate">{ex.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate uppercase">
                          {ex.category || 'General'} • {ex.sets} Sets
                        </p>
                      </div>
                    </div>

                    <div className="hidden md:block flex-1 min-w-0 text-center">
                      <p className="text-primary text-sm font-semibold truncate">{ex.full_name}</p>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right whitespace-nowrap">
                        <p className="font-bold text-xs text-accent">{ex.reps} reps</p>
                        <p className="text-[10px] text-muted-foreground">Vol: {ex.sets * ex.reps}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(ex.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-muted-foreground">No data found.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ title, value, icon: Icon, color, iconColor }: any) {
  return (
    <Card className="shadow-card border-none">
      <CardContent className="p-4 sm:pt-6">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight truncate">{title}</p>
            <p className="text-xl sm:text-3xl font-black text-foreground">{value}</p>
          </div>
          <div className={`p-2 sm:p-3 rounded-xl flex-shrink-0 ${color}`}>
            <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${iconColor || "text-accent-foreground"}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}