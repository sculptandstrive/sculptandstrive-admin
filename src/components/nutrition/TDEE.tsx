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
    reset({
      units: newUnits as "metric" | "imperial",
      gender,
      age,
      activity,
      weight: "70",
      height: "175",
      weightLbs: "154",
      heightFt: "5",
      heightIn: "9",
    });
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

  return (
    <CalculatorLayout
      title="Calorie / TDEE Calculator"
      // subtitle="Total Daily Energy Expenditure — the total calories you burn per day including activity."
    >
      <StaggerItem>
        <SegmentedControl
          options={[
            { label: "Metric", value: "metric" },
            { label: "Imperial", value: "imperial" },
          ]}
          value={units}
          onChange={handleUnitsChange}
        />
      </StaggerItem>

      <StaggerItem>
        <SegmentedControl
          options={[
            { label: "Male", value: "male" },
            { label: "Female", value: "female" },
          ]}
          value={gender}
          onChange={handleGenderChange}
        />
      </StaggerItem>

      <StaggerItem>
        <div className="surface p-6 rounded-xl space-y-4">
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
              <div className="grid gridd-cols-1 md:grid-cols-2 gap-4">
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
        <div className="surface p-6 rounded-xl">
          <span className="label-instrument mb-3 block">Activity Level</span>
          <div className="space-y-2">
            {ACTIVITY_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => reset({ ...watch(), activity: level.value })}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-all duration-200 ${
                  activity === level.value
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <span
                  className={`text-sm font-medium ${activity === level.value ? "text-accent" : "text-foreground"}`}
                >
                  {level.label}
                </span>
                <span className="text-xs text-muted-foreground ml-2">
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
          showSave={false}
        />
      </StaggerItem>

      {tdee && (
        <StaggerItem>
          <div className="surface p-3 md:p-6 rounded-xl">
            <span className="label-instrument mb-4 block">Daily Targets</span>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Lose weight", delta: -500, color: "text-primary" },
                { label: "Maintain", delta: 0, color: "text-success" },
                { label: "Gain weight", delta: 500, color: "text-accent" },
              ].map((goal) => (
                <div key={goal.label} className="text-center">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">
                    {goal.label}
                  </span>
                  <p
                    className={`text-xl font-mono font-bold tracking-tighter mt-1 ${goal.color}`}
                  >
                    {Math.round(tdee + goal.delta).toLocaleString()}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    kcal/day
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
