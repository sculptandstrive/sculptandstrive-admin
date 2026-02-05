import { Apple, Utensils, Droplets, Flame, Plus, Filter } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const mealPlans = [
  { id: 1, name: "Muscle Building", meals: 5, calories: 2800, protein: 180, members: 425 },
  { id: 2, name: "Fat Loss", meals: 4, calories: 1800, protein: 140, members: 680 },
  { id: 3, name: "Maintenance", meals: 3, calories: 2200, protein: 120, members: 390 },
  { id: 4, name: "Keto Focused", meals: 3, calories: 2000, protein: 150, members: 215 },
];

const nutritionStats = [
  { label: "Active Meal Plans", value: "48", icon: Utensils, color: "gradient-accent" },
  { label: "Recipes", value: "324", icon: Apple, color: "bg-success/10" },
  { label: "Avg. Daily Calories", value: "2,150", icon: Flame, color: "bg-warning/10" },
  { label: "Water Tracking", value: "89%", icon: Droplets, color: "bg-accent/10" },
];

export default function Nutrition() {
  return (
    <DashboardLayout>
      <PageHeader 
        title="Nutrition" 
        description="Manage meal plans, recipes, and dietary tracking."
      >
        <Button variant="outline" className="mr-2">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
        <Button className="gradient-accent text-accent-foreground hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4 mr-2" />
          Add Meal Plan
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {nutritionStats.map((stat) => (
          <Card key={stat.label} className="shadow-card animate-slide-up">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.color}`}>
                  <stat.icon className="w-6 h-6 text-accent-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-card animate-slide-up">
        <CardHeader>
          <CardTitle className="font-display">Meal Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mealPlans.map((plan) => (
              <div 
                key={plan.id}
                className="p-6 rounded-xl border border-border hover:border-accent hover:shadow-card-hover transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-foreground text-lg">{plan.name}</h4>
                    <p className="text-sm text-muted-foreground">{plan.meals} meals/day</p>
                  </div>
                  <div className="p-2 rounded-lg gradient-accent">
                    <Utensils className="w-5 h-5 text-accent-foreground" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xl font-bold text-foreground">{plan.calories}</p>
                    <p className="text-xs text-muted-foreground">kcal/day</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-accent">{plan.protein}g</p>
                    <p className="text-xs text-muted-foreground">protein</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">{plan.members}</p>
                    <p className="text-xs text-muted-foreground">members</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
