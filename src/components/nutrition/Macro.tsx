import { useState, useMemo } from "react";
import CalculatorLayout, { StaggerItem } from "@/components/CalculatorLayout";
import InstrumentInput from "@/components/InstrumentInput";
import SegmentedControl from "@/components/SegmentedControl";
import ReadoutCard from "@/components/ReadoutCard";

const MacroCalculator = () => {
  const [units, setUnits] = useState("metric");
  const [gender, setGender] = useState("male");
  const [age, setAge] = useState("25");
  const [weight, setWeight] = useState("70");
  const [height, setHeight] = useState("175");
  const [weightLbs, setWeightLbs] = useState("154");
  const [heightFt, setHeightFt] = useState("5");
  const [heightIn, setHeightIn] = useState("9");
  const [activity, setActivity] = useState("1.55");
  const [goal, setGoal] = useState("maintain");

  const handleUnitsChange = (newUnits: string) => {
    if (newUnits === units) return;
    setUnits(newUnits);
    if (newUnits === "imperial") {
      const wKg = parseFloat(weight) || 70;
      const hCm = parseFloat(height) || 175;
      const totalInches = hCm / 2.54;
      const ft = Math.floor(totalInches / 12);
      const inches = Math.round(totalInches % 12);
      setWeightLbs((wKg * 2.20462).toFixed(1));
      setHeightFt(String(Math.max(1, ft)));
      setHeightIn(String(inches));
    } else {
      const wLbs = parseFloat(weightLbs) || 154;
      const ft = parseFloat(heightFt) || 5;
      const inches = parseFloat(heightIn) || 9;
      const hCm = Math.round((ft * 12 + inches) * 2.54);
      setWeight((wLbs / 2.20462).toFixed(1));
      setHeight(String(hCm));
    }
  };

  const wKg = units === "metric" ? parseFloat(weight) || 70 : (parseFloat(weightLbs) || 154) * 0.453592;
  const wLbs = units === "metric" ? (parseFloat(weight) || 70) * 2.20462 : parseFloat(weightLbs) || 154;

  const tdee = useMemo(() => {
    const a = parseFloat(age);
    let w: number, h: number;
    if (units === "metric") {
      w = parseFloat(weight);
      h = parseFloat(height);
    } else {
      w = parseFloat(weightLbs) * 0.453592;
      h = (parseFloat(heightFt) * 12 + parseFloat(heightIn)) * 2.54;
    }
    if (!a || !w || !h) return null;
    const bmr = gender === "male"
      ? 10 * w + 6.25 * h - 5 * a + 5
      : 10 * w + 6.25 * h - 5 * a - 161;
    return bmr * parseFloat(activity);
  }, [units, gender, age, weight, height, weightLbs, heightFt, heightIn, activity]);

  const macros = useMemo(() => {
    if (!tdee) return null;
    const calories = goal === "lose" ? tdee - 500 : goal === "gain" ? tdee + 500 : tdee;
    // Standard split: 30% protein, 35% carbs, 35% fat
    const protein = Math.round((calories * 0.30) / 4);
    const carbs = Math.round((calories * 0.35) / 4);
    const fat = Math.round((calories * 0.35) / 9);
    return { calories: Math.round(calories), protein, carbs, fat };
  }, [tdee, goal]);

  return (
    <CalculatorLayout
      title="Macro Calculator"
      subtitle="Calculate your daily macronutrient targets based on your goals."
    >
      <StaggerItem>
        <SegmentedControl
          size="md"
          options={[
            { label: "Metric (kg / cm)", value: "metric" },
            { label: "Imperial (lbs / ft)", value: "imperial" },
          ]}
          value={units}
          onChange={handleUnitsChange}
        />
      </StaggerItem>

      <StaggerItem>
        <SegmentedControl
          size="md"
          options={[
            { label: "Male", value: "male" },
            { label: "Female", value: "female" },
          ]}
          value={gender}
          onChange={setGender}
        />
      </StaggerItem>

      <StaggerItem>
        <div className="bg-white rounded-2xl border border-white/90 p-4 sm:p-5 shadow-[5px_5px_14px_rgba(168,190,185,0.28),-5px_-5px_14px_rgba(255,255,255,0.95)] space-y-3 sm:space-y-3.5">
          <InstrumentInput label="Age" value={age} onChange={setAge} unit="years" />
          {units === "metric" ? (
            <>
              <InstrumentInput label="Weight" value={weight} onChange={setWeight} unit="kg" />
              <InstrumentInput label="Height" value={height} onChange={setHeight} unit="cm" />
            </>
          ) : (
            <>
              <InstrumentInput label="Weight" value={weightLbs} onChange={setWeightLbs} unit="lbs" />
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <InstrumentInput label="Height (ft)" value={heightFt} onChange={setHeightFt} unit="ft" />
                <InstrumentInput label="Height (in)" value={heightIn} onChange={setHeightIn} unit="in" />
              </div>
            </>
          )}
        </div>
      </StaggerItem>

      <StaggerItem>
        <SegmentedControl
          size="md"
          options={[
            { label: "Lose (-0.45kg / -1lb/wk)", value: "lose" },
            { label: "Maintain", value: "maintain" },
            { label: "Gain (+0.45kg / +1lb/wk)", value: "gain" },
          ]}
          value={goal}
          onChange={setGoal}
        />
      </StaggerItem>

      {macros && (
        <StaggerItem>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
            <ReadoutCard
              label="Daily Calories"
              value={macros.calories.toLocaleString()}
              unit="kcal"
            />
            <ReadoutCard
              label="Protein"
              value={String(macros.protein)}
              unit={`g (${(macros.protein / wKg).toFixed(1)}g/kg | ${(macros.protein / wLbs).toFixed(1)}g/lb)`}
              colorClass="text-[#08B594]"
            />
            <ReadoutCard
              label="Carbohydrates"
              value={String(macros.carbs)}
              unit="g"
              colorClass="text-[#08B594]"
            />
            <ReadoutCard
              label="Fat"
              value={String(macros.fat)}
              unit="g"
              colorClass="text-[#08B594]"
            />
          </div>
        </StaggerItem>
      )}
    </CalculatorLayout>
  );
};

export default MacroCalculator;
