import { useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import CalculatorLayout, { StaggerItem } from "@/components/CalculatorLayout";
import InstrumentInput from "@/components/InstrumentInput";
import SegmentedControl from "@/components/SegmentedControl";
import ReadoutCard from "@/components/ReadoutCard";

type FormValues = {
  units: "metric" | "imperial";
  gender: "male" | "female";
  age: string;
  weight: string;
  height: string;
  weightLbs: string;
  heightFt: string;
  heightIn: string;
};

const BMRCalculator = () => {
  const {
    control,
    watch,
    reset,
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
        weight: (wLbs / 2.20462).toFixed(1),
        height: String(hCm),
        heightFt,
        heightIn,
        weightLbs,
      });
    }
  };

  const handleGenderChange = (newGender: string) => {
    reset({ ...watch(), gender: newGender as "male" | "female" });
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

  return (
    <CalculatorLayout
      title="BMR Calculator"
      subtitle="Basal Metabolic Rate — the number of calories your body needs at complete rest."
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
              <div className="grid grid-cols-2 gap-4">
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
        <ReadoutCard
          label="Basal Metabolic Rate"
          value={bmr ? Math.round(bmr).toLocaleString() : "—"}
          unit="kcal/day"
          description={
            bmr
              ? "Mifflin-St Jeor equation. This is the energy your body expends at complete rest over 24 hours."
              : "Enter your measurements above."
          }
          showSave={false}
        />
      </StaggerItem>
    </CalculatorLayout>
  );
};

export default BMRCalculator;
