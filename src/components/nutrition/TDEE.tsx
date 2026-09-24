import { useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import CalculatorLayout, { StaggerItem } from "@/components/CalculatorLayout";
import InstrumentInput from "@/components/InstrumentInput";
import SegmentedControl from "@/components/SegmentedControl";
import ReadoutCard from "@/components/ReadoutCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const ACTIVITY_LEVELS = [
  { label: "Sedentary", value: "1.2", desc: "Little or no exercise" },
  { label: "Light", value: "1.375", desc: "Exercise 1-3 days/week" },
  { label: "Moderate", value: "1.55", desc: "Exercise 3-5 days/week" },
  { label: "Active", value: "1.725", desc: "Exercise 6-7 days/week" },
  { label: "Very Active", value: "1.9", desc: "Hard exercise + physical job" },
];

type FormValues = {
  units: "metric" | "imperial";
  gender: "male" | "female";
  age: string;
  weight: string;
  height: string;
  weightLbs: string;
  heightFt: string;
  heightIn: string;
  activity: string;
};

const TDEECalculator = () => {
  const { user } = useAuth();

  const {
    control,
    watch,
    reset,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    mode: "onChange",
    defaultValues: {
      units: "metric",
      gender: "male",
      age: "25",
      weight: "70",
      height: "175",
      weightLbs: "154",
      heightFt: "5",
      heightIn: "9",
      activity: "1.2",
    },
  });

  const units = watch("units");
  const gender = watch("gender");
  const age = watch("age");
  const weight = watch("weight");
  const height = watch("height");
  const weightLbs = watch("weightLbs");
  const heightFt = watch("heightFt");
  const heightIn = watch("heightIn");
  const activity = watch("activity");

  const handleUnitsChange = (newUnits: string) => {
    if (newUnits === units) return;
    if (newUnits === "imperial") {
      const wKg = parseFloat(weight) || 70;
      const hCm = parseFloat(height) || 175;
      const totalInches = hCm / 2.54;
      const ft = Math.floor(totalInches / 12);
      const inches = Math.round(totalInches % 12);
      reset({
        units: "imperial",
        gender,
        age,
        activity,
        weight,
        height,
        weightLbs: (wKg * 2.20462).toFixed(1),
        heightFt: String(Math.max(1, ft)),
        heightIn: String(inches),
      });
    } else {
      const wLbs = parseFloat(weightLbs) || 154;
      const ft = parseFloat(heightFt) || 5;
      const inches = parseFloat(heightIn) || 9;
      const hCm = Math.round((ft * 12 + inches) * 2.54);
      reset({
        units: "metric",
        gender,
        age,
        activity,
        weight: (wLbs / 2.20462).toFixed(1),
        height: String(hCm),
        heightFt,
        heightIn,
        weightLbs,
      });
    }
  };

  const handleGenderChange = (newGender: string) => {
    reset({
      ...watch(),
      gender: newGender as "male" | "female",
    });
  };

  const bmr = useMemo(() => {
    if (!isValid) return null;

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

    return gender === "male"
      ? 10 * w + 6.25 * h - 5 * a + 5
      : 10 * w + 6.25 * h - 5 * a - 161;
  }, [
    units,
    gender,
    age,
    weight,
    height,
    weightLbs,
    heightFt,
    heightIn,
    isValid,
  ]);

  const tdee = useMemo(() => {
    if (!bmr) return null;
    return bmr * parseFloat(activity);
  }, [bmr, activity]);

  const handleTDEESave = handleSubmit(async () => {
    if (!tdee) {
      toast({
        title: "Cannot Save",
        description: "Please enter valid measurements to calculate TDEE.",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save your TDEE.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("hf_data")
      .upsert(
        { tdee_maintain: tdee, user_id: user.id },
        { onConflict: "user_id" },
      );

    if (error) {
      toast({
        title: "Failed to update TDEE Values",
        description: "Server error",
        variant: "destructive",
      });
      console.error(error);
      return;
    }

    toast({ title: "Saved TDEE Successfully" });
  });

  return (
    <CalculatorLayout
      title="Calorie / TDEE Calculator"
      subtitle="Total Daily Energy Expenditure — the total calories you burn per day including activity."
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
          onChange={handleGenderChange}
        />
      </StaggerItem>

      <StaggerItem>
        <div className="bg-white rounded-2xl border border-white/90 p-4 sm:p-5 shadow-[5px_5px_14px_rgba(168,190,185,0.28),-5px_-5px_14px_rgba(255,255,255,0.95)] space-y-3 sm:space-y-3.5">
          {/* Age — always visible, no shouldUnregister needed */}
          <Controller
            name="age"
            control={control}
            rules={{
              required: "Age is required.",
              validate: (v) => {
                const n = parseFloat(v);
                if (isNaN(n)) return "Age must be a valid number.";
                if (n < 1) return "Age must be at least 1.";
                if (n > 120) return "Age must be no more than 120.";
                return true;
              },
            }}
            render={({ field }) => (
              <InstrumentInput
                label="Age"
                value={field.value}
                onChange={field.onChange}
                unit="years"
                error={errors.age?.message}
              />
            )}
          />

          {units === "metric" ? (
            <>
              <Controller
                name="weight"
                control={control}
                shouldUnregister
                rules={{
                  required: "Weight is required.",
                  validate: (v) => {
                    const n = parseFloat(v);
                    if (isNaN(n)) return "Weight must be a valid number.";
                    if (n < 1) return "Weight must be at least 1 kg.";
                    if (n > 500) return "Weight must be no more than 500 kg.";
                    return true;
                  },
                }}
                render={({ field }) => (
                  <InstrumentInput
                    label="Weight"
                    value={field.value}
                    onChange={field.onChange}
                    unit="kg"
                    error={errors.weight?.message}
                  />
                )}
              />
              <Controller
                name="height"
                control={control}
                shouldUnregister
                rules={{
                  required: "Height is required.",
                  validate: (v) => {
                    const n = parseFloat(v);
                    if (isNaN(n)) return "Height must be a valid number.";
                    if (n < 1) return "Height must be at least 1 cm.";
                    if (n > 300) return "Height must be no more than 300 cm.";
                    return true;
                  },
                }}
                render={({ field }) => (
                  <InstrumentInput
                    label="Height"
                    value={field.value}
                    onChange={field.onChange}
                    unit="cm"
                    error={errors.height?.message}
                  />
                )}
              />
            </>
          ) : (
            <>
              <Controller
                name="weightLbs"
                control={control}
                shouldUnregister
                rules={{
                  required: "Weight is required.",
                  validate: (v) => {
                    const n = parseFloat(v);
                    if (isNaN(n)) return "Weight must be a valid number.";
                    if (n < 1) return "Weight must be at least 1 lbs.";
                    if (n > 1000)
                      return "Weight must be no more than 1000 lbs.";
                    return true;
                  },
                }}
                render={({ field }) => (
                  <InstrumentInput
                    label="Weight"
                    value={field.value}
                    onChange={field.onChange}
                    unit="lbs"
                    error={errors.weightLbs?.message}
                  />
                )}
              />
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <Controller
                  name="heightFt"
                  control={control}
                  shouldUnregister
                  rules={{
                    required: "Feet is required.",
                    validate: (v) => {
                      const n = parseFloat(v);
                      if (isNaN(n)) return "Must be a valid number.";
                      if (n < 0) return "Height must be at least 0 ft.";
                      if (n > 8) return "Height must be no more than 8 ft.";
                      return true;
                    },
                  }}
                  render={({ field }) => (
                    <InstrumentInput
                      label="Height (ft)"
                      value={field.value}
                      onChange={field.onChange}
                      unit="ft"
                      error={errors.heightFt?.message}
                    />
                  )}
                />
                <Controller
                  name="heightIn"
                  control={control}
                  shouldUnregister
                  rules={{
                    required: "Inches is required.",
                    validate: (v) => {
                      const n = parseFloat(v);
                      if (isNaN(n)) return "Must be a valid number.";
                      if (n < 0) return "Inches must be at least 0.";
                      if (n > 11) return "Inches must be no more than 11.";
                      return true;
                    },
                  }}
                  render={({ field }) => (
                    <InstrumentInput
                      label="Height (in)"
                      value={field.value}
                      onChange={field.onChange}
                      unit="in"
                      error={errors.heightIn?.message}
                    />
                  )}
                />
              </div>
            </>
          )}
        </div>
      </StaggerItem>

      <StaggerItem>
        <div className="bg-white rounded-2xl border border-white/90 p-4 sm:p-5 shadow-[5px_5px_14px_rgba(168,190,185,0.28),-5px_-5px_14px_rgba(255,255,255,0.95)]">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#7186A0] mb-2.5 block">Activity Level</span>
          <div className="space-y-2">
            {ACTIVITY_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => reset({ ...watch(), activity: level.value })}
                className={`w-full text-left px-3.5 sm:px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
                  activity === level.value
                    ? "bg-gradient-to-r from-[#08B594] via-[#07AB8C] to-[#069D80] text-white shadow-[0_3px_10px_rgba(8,181,148,0.32),inset_0_1.5px_2px_rgba(255,255,255,0.5)]"
                    : "bg-[#E1EDE9] shadow-[inset_2px_2px_4px_rgba(165,185,180,0.45),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] border border-white/50 text-[#0F172A] hover:text-[#08B594]"
                }`}
              >
                <span
                  className={`text-xs sm:text-sm font-bold ${activity === level.value ? "text-white" : "text-[#0F172A]"}`}
                >
                  {level.label}
                </span>
                <span className={`text-xs ml-2 font-normal ${activity === level.value ? "text-white/90" : "text-[#7186A0]"}`}>
                  {level.desc}
                </span>
              </button>
            ))}
          </div>
        </div>
      </StaggerItem>

      <StaggerItem>
        <ReadoutCard
          label="Total Daily Energy Expenditure"
          value={tdee ? Math.round(tdee).toLocaleString() : "—"}
          unit="kcal/day"
          description={
            tdee
              ? `Based on a ${ACTIVITY_LEVELS.find((l) => l.value === activity)?.label.toLowerCase()} activity level. To lose weight, consume fewer calories; to gain, consume more.`
              : "Enter your measurements above."
          }
          handleDBSave={handleTDEESave}
          showSave={true}
        />
      </StaggerItem>

      {tdee && (
        <StaggerItem>
          <div className="bg-white rounded-2xl border border-white/90 p-4 sm:p-5 shadow-[5px_5px_14px_rgba(168,190,185,0.28),-5px_-5px_14px_rgba(255,255,255,0.95)]">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#7186A0] mb-3 block">Daily Targets</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              {[
                { label: "Lose Weight", sub: "-0.45 kg / -1 lb per week", delta: -500, color: "text-[#08B594]" },
                { label: "Maintain", sub: "Weight stability", delta: 0, color: "text-[#08B594]" },
                { label: "Gain Weight", sub: "+0.45 kg / +1 lb per week", delta: 500, color: "text-[#08B594]" },
              ].map((goal) => (
                <div key={goal.label} className="text-center p-3 sm:p-3.5 bg-[#E1EDE9] rounded-xl shadow-[inset_2px_2px_4px_rgba(165,185,180,0.45),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] border border-white/50">
                  <span className="text-[10px] sm:text-[11px] text-[#7186A0] font-bold uppercase tracking-wider leading-tight block">
                    {goal.label}
                  </span>
                  <p className={`text-lg sm:text-xl font-black tracking-tight mt-0.5 ${goal.color}`}>
                    {Math.round(tdee + goal.delta).toLocaleString()}
                  </p>
                  <span className="text-[10px] font-bold text-[#7186A0] block">
                    kcal/day
                  </span>
                  <span className="text-[10px] text-[#7186A0] font-normal block mt-0.5">
                    {goal.sub}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </StaggerItem>
      )}
    </CalculatorLayout>
  );
};

export default TDEECalculator;
