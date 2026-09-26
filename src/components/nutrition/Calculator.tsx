import React, { useState } from "react";
import BMR from "./BMR";
import Macro from "./Macro";
import TDEECalculator from "./TDEE";
import { Calculator as CalcIcon, Flame, Scale, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";

const Calculator = () => {
  const [activeTab, setActiveTab] = useState<"bmr" | "macro" | "tdee">("bmr");

  const tabs = [
    { id: "bmr", label: "BMR Calculator", icon: Flame },
    { id: "macro", label: "Macro Split", icon: PieChart },
    { id: "tdee", label: "TDEE Calculator", icon: Scale },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="inline-flex p-1.5 rounded-2xl bg-[#E2ECE9] border border-white/80 shadow-[inset_2px_2px_4px_rgba(165,185,180,0.45),inset_-2px_-2px_4px_rgba(255,255,255,0.85)] max-w-full overflow-x-auto gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer",
                isActive
                  ? "bg-white text-[#08B594] shadow-[4px_4px_10px_rgba(145,170,165,0.18),-2px_-2px_6px_rgba(255,255,255,0.95)]"
                  : "text-[#7186A0] hover:text-[#0F172A]"
              )}
            >
              <Icon className={cn("w-4 h-4", isActive ? "text-[#08B594]" : "text-[#7186A0]")} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Calculator Component */}
      <div className="transition-all duration-200">
        {activeTab === "bmr" && <BMR />}
        {activeTab === "macro" && (
          <div className="max-w-4xl mx-auto">
            <Macro />
          </div>
        )}
        {activeTab === "tdee" && <TDEECalculator />}
      </div>
    </div>
  );
};

export default Calculator;
