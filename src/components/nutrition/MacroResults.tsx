import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface MacroResult {
  calories: number;
  protein: { grams: number; min: number; max: number };
  carbs: { grams: number; min: number; max: number };
  fat: { grams: number; min: number; max: number };
  sugar: number;
  saturatedFat: number;
  kj: number;
}

type Plan = "balanced" | "lowFat" | "lowCarb" | "highProtein";

function getPlanMultipliers(plan: Plan) {
  switch (plan) {
    case "lowFat":
      return { proteinPct: 0.3, carbsPct: 0.55, fatPct: 0.15 };
    case "lowCarb":
      return { proteinPct: 0.4, carbsPct: 0.2, fatPct: 0.4 };
    case "highProtein":
      return { proteinPct: 0.45, carbsPct: 0.3, fatPct: 0.25 };
    default:
      return { proteinPct: 0.243, carbsPct: 0.534, fatPct: 0.253 };
  }
}

function MacroCard({
  label,
  grams,
  min,
  max,
  color,
  subtitle,
}: {
  label: string;
  grams: number;
  min: number;
  max: number;
  color: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-2">
        <div className={`h-3 w-3 rounded-full ${color}`} />
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
      </div>
      {subtitle && (
        <p className="text-xs text-muted-foreground mb-1">{subtitle}</p>
      )}
      <p className="text-base font-bold">
        {grams}g
        <span className="text-base font-normal text-muted-foreground">
          /day
        </span>
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        Range: {min} – {max}
      </p>
    </div>
  );
}

interface AssignedPlan {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  water: number;
  recommendations?: any[];
}

export function MacroResults({
  result
}: {
  result: MacroResult;
}) {
  const [plan, setPlan] = useState<Plan>("balanced");
  const plans: { key: Plan; label: string }[] = [
    { key: "balanced", label: "Balanced" },
    { key: "lowFat", label: "Low Fat" },
    { key: "lowCarb", label: "Low Carb" },
    { key: "highProtein", label: "High Protein" },
  ];

  const m = getPlanMultipliers(plan);
  const cal = result.calories;
  const protein = Math.round((cal * m.proteinPct) / 4);
  const carbs = Math.round((cal * m.carbsPct) / 4);
  const fat = Math.round((cal * m.fatPct) / 9);

  const totalCal = protein * 4 + carbs * 4 + fat * 9;
  const proteinPct = Math.round(((protein * 4) / totalCal) * 100);
  const carbsPct = Math.round(((carbs * 4) / totalCal) * 100);
  const fatPct = 100 - proteinPct - carbsPct;

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm fade-in-up ">
      <h2 className="text-xl font-bold mb-1">Results</h2>
      <p className="text-sm text-muted-foreground mb-5">
        Suggested daily macronutrient breakdown based on your inputs.
      </p>

      {/* Plan Tabs */}
      <div className="flex flex-col md:flex-row rounded-xl md:rounded-full bg-muted p-1 gap-1 mb-6 overflow-x-auto">
        {plans.map((p) => (
          <button
            key={p.key}
            onClick={() => setPlan(p.key)}
            className={`flex-1 rounded-full py-2 px-3 text-sm font-medium whitespace-nowrap transition-all ${
              plan === p.key
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Macro Bar */}
      <div className="mb-6">
        <div className="flex h-4 w-full overflow-hidden rounded-full">
          <div
            className="bg-protein transition-all"
            style={{ width: `${proteinPct}%` }}
          />
          <div
            className="bg-carbs transition-all"
            style={{ width: `${carbsPct}%` }}
          />
          <div
            className="bg-fat transition-all"
            style={{ width: `${fatPct}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-protein" />
            Protein {proteinPct}%
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-carbs" />
            Carbs {carbsPct}%
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-fat" />
            Fat {fatPct}%
          </span>
        </div>
      </div>

      {/* Macro Cards */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <MacroCard
          label="Protein"
          grams={protein}
          min={result.protein.min}
          max={result.protein.max}
          color="bg-protein"
        />
        <MacroCard
          label="Carbs"
          grams={carbs}
          min={result.carbs.min}
          max={result.carbs.max}
          color="bg-carbs"
          // subtitle="Includes Sugar"
        />
        <MacroCard
          label="Fat"
          grams={fat}
          min={result.fat.min}
          max={result.fat.max}
          color="bg-fat"
          // subtitle="Includes Saturated Fat"
        />
      </div>

      {/* Additional Info */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="rounded-lg bg-muted p-4">
          <p className="text-xs text-muted-foreground">Sugar</p>
          <p className="text-base font-bold">
            &lt;{result.sugar}g
            <span className="text-base font-normal text-muted-foreground">
              /day
            </span>
          </p>
        </div>
        <div className="rounded-lg bg-muted p-4">
          <p className="text-xs text-muted-foreground">Saturated Fat</p>
          <p className="text-base font-bold">
            &lt;{result.saturatedFat}g
            <span className="text-base font-normal text-muted-foreground">
              /day
            </span>
          </p>
        </div>
        <div className="rounded-lg bg-muted p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-muted-foreground">Food Energy</p>
          <p className="text-base font-bold">
            {cal.toLocaleString()}
            <span className="text-base font-normal text-muted-foreground">
              {" "}
              Cal/day
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            or {result.kj.toLocaleString()} kJ/day
          </p>
        </div>
      </div>

      <p className="mt-6 text-xs text-muted-foreground leading-relaxed">
        These results are guidelines for typical situations. The protein range
        follows ADA and CDC guidelines. Carbohydrate ranges are based on
        recommendations from The Institute of Medicine, FAO, and WHO.
      </p>
    </div>
  );
}
