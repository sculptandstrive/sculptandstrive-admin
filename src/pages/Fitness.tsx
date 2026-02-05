import { Dumbbell, Flame, Timer, Trophy, Plus, Filter } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const workoutCategories = [
  { name: "Strength", count: 45, color: "bg-primary" },
  { name: "Cardio", count: 38, color: "bg-accent" },
  { name: "HIIT", count: 32, color: "bg-warning" },
  { name: "Yoga", count: 28, color: "bg-success" },
  { name: "Pilates", count: 20, color: "bg-destructive" },
];

const popularWorkouts = [
  { id: 1, name: "Full Body Burn", category: "HIIT", duration: "45 min", calories: 450, completions: 1240 },
  { id: 2, name: "Upper Body Strength", category: "Strength", duration: "50 min", calories: 320, completions: 980 },
  { id: 3, name: "Morning Flow Yoga", category: "Yoga", duration: "30 min", calories: 180, completions: 875 },
  { id: 4, name: "Core Crusher", category: "Strength", duration: "25 min", calories: 220, completions: 756 },
];

export default function Fitness() {
  return (
    <DashboardLayout>
      <PageHeader 
        title="Fitness" 
        description="Manage workouts, exercises, and training programs."
      >
        <Button variant="outline" className="mr-2">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
        <Button className="gradient-accent text-accent-foreground hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4 mr-2" />
          Add Workout
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-8">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Workouts</p>
                <p className="text-3xl font-bold text-foreground">163</p>
              </div>
              <div className="p-3 rounded-xl gradient-accent">
                <Dumbbell className="w-6 h-6 text-accent-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Programs</p>
                <p className="text-3xl font-bold text-foreground">24</p>
              </div>
              <div className="p-3 rounded-xl bg-success/10">
                <Trophy className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Duration</p>
                <p className="text-3xl font-bold text-foreground">42<span className="text-lg">min</span></p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <Timer className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Calories Burned</p>
                <p className="text-3xl font-bold text-foreground">2.4M</p>
              </div>
              <div className="p-3 rounded-xl bg-warning/10">
                <Flame className="w-6 h-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-card animate-slide-up">
          <CardHeader>
            <CardTitle className="font-display">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {workoutCategories.map((category) => (
                <div key={category.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{category.name}</span>
                    <span className="text-muted-foreground">{category.count} workouts</span>
                  </div>
                  <Progress 
                    value={(category.count / 50) * 100} 
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-card animate-slide-up">
          <CardHeader>
            <CardTitle className="font-display">Popular Workouts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {popularWorkouts.map((workout) => (
                <div 
                  key={workout.id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                    <Dumbbell className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{workout.name}</p>
                    <p className="text-sm text-muted-foreground">{workout.category} • {workout.duration}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-accent">{workout.calories} kcal</p>
                    <p className="text-sm text-muted-foreground">{workout.completions.toLocaleString()} done</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
