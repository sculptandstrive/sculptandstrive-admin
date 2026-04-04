import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

type UnitSystem = "us" | "metric";
type Gender = "male" | "female";
type Formula = "mifflin" | "harris" | "katch";

type FormValues = {
  unitSystem: UnitSystem;
  gender: Gender;
  age: number;
  heightFeet: number;
  heightInches: number;
  weightLbs: number;
  heightCm: number;
  weightKg: number;
  formula: Formula;
  bodyFatPct: number | "";
  resultUnit: "cal" | "kj";
};

const ACTIVITY_LEVELS = [
  { label: "Sedentary: little or no exercise", factor: 1.2 },
  { label: "Exercise 1-3 times/week", factor: 1.375 },
  { label: "Exercise 4-5 times/week", factor: 1.465 },
  { label: "Daily exercise or intense exercise 3-4 times/week", factor: 1.55 },
  { label: "Intense exercise 6-7 times/week", factor: 1.725 },
  { label: "Very intense exercise daily, or physical job", factor: 1.9 },
];

function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender,
  formula: Formula,
  bodyFatPct?: number,
): number {
  switch (formula) {
    case "mifflin":
      return gender === "male"
        ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
        : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
    case "harris":
      return gender === "male"
        ? 13.397 * weightKg + 4.799 * heightCm - 5.677 * age + 88.362
        : 9.247 * weightKg + 3.098 * heightCm - 4.33 * age + 447.593;
    case "katch": {
      if (bodyFatPct === undefined) return 0;
      const leanMass = weightKg * (1 - bodyFatPct / 100);
      return 370 + 21.6 * leanMass;
    }
    default:
      return 0;
  }
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

const BMR = () => {
  const [bmr, setBmr] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    mode: "onChange",
    defaultValues: {
      unitSystem: "us",
      gender: "male",
      age: 30,
      heightFeet: 5,
      heightInches: 6,
      weightLbs: 170,
      heightCm: 168,
      weightKg: 77,
      formula: "mifflin",
      bodyFatPct: "",
      resultUnit: "cal",
    },
  });

  const unitSystem = watch("unitSystem");
  const gender = watch("gender");
  const formula = watch("formula");
  const resultUnit = watch("resultUnit");

  const onSubmit = (data: FormValues) => {
    const { age, unitSystem, gender, formula, bodyFatPct } = data;

    let wKg: number, hCm: number;
    if (unitSystem === "us") {
      wKg = data.weightLbs * 0.453592;
      hCm = (data.heightFeet * 12 + data.heightInches) * 2.54;
    } else {
      wKg = data.weightKg;
      hCm = data.heightCm;
    }

    const result = calculateBMR(
      wKg,
      hCm,
      age,
      gender,
      formula,
      bodyFatPct !== "" ? Number(bodyFatPct) : undefined,
    );

    setBmr(Math.round(result));
  };

  const displayValue = (val: number) => {
    const converted = resultUnit === "kj" ? Math.round(val * 4.184) : val;
    return converted.toLocaleString();
  };


  const unitLabel = resultUnit === "kj" ? "kJ/day" : "Calories/day";

  const toggleButtonClass = (active: boolean) =>
    `flex-1 py-2.5 text-sm font-medium transition-colors ${
      active
        ? "bg-accent text-primary-foreground"
        : "bg-card text-muted-foreground hover:bg-secondary"
    }`;

  const inputClass = (hasError: boolean) =>
    `w-full rounded-md border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
      hasError ? "border-destructive" : ""
    }`;
  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-3">
          BMR Calculator
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="bg-card rounded-lg border p-6 space-y-5"
            >
              {/* Unit Toggle */}
              <div className="flex rounded-lg border overflow-hidden">
                {(["us", "metric"] as UnitSystem[]).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setValue("unitSystem", u)}
                    className={toggleButtonClass(unitSystem === u)}
                  >
                    {u === "us" ? "US Units" : "Metric Units"}
                  </button>
                ))}
              </div>

              {/* Age */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Age
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className={inputClass(!!errors.age)}
                    {...register("age", {
                      required: "Age is required.",
                      valueAsNumber: true,
                      min: {
                        value: 15,
                        message: "Age must be between 15 and 80.",
                      },
                      max: {
                        value: 80,
                        message: "Age must be between 15 and 80.",
                      },
                      validate: (v) => !isNaN(v) || "Age must be a number.",
                    })}
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    ages 15–80
                  </span>
                </div>
                <FieldError message={errors.age?.message} />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Gender
                </label>
                <div className="flex rounded-lg border overflow-hidden">
                  {(["male", "female"] as Gender[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setValue("gender", g)}
                      className={toggleButtonClass(gender === g)}
                    >
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Height & Weight — US */}
              {unitSystem === "us" ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Height
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            className={inputClass(!!errors.heightFeet)}
                            {...register("heightFeet", {
                              required: "Feet is required.",
                              valueAsNumber: true,
                              min: {
                                value: 1,
                                message: "Enter a valid feet value (1–8).",
                              },
                              max: {
                                value: 8,
                                message: "Enter a valid feet value (1–8).",
                              },
                              validate: (v) =>
                                !isNaN(v) || "Enter a valid number.",
                            })}
                          />
                          <span className="text-sm text-muted-foreground">
                            ft
                          </span>
                        </div>
                        <FieldError message={errors.heightFeet?.message} />
                      </div>
                      <div className="flex-1 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            className={inputClass(!!errors.heightInches)}
                            {...register("heightInches", {
                              required: "Inches is required.",
                              valueAsNumber: true,
                              min: {
                                value: 0,
                                message: "Inches must be 0–11.",
                              },
                              max: {
                                value: 11,
                                message: "Inches must be 0–11.",
                              },
                              validate: (v) =>
                                !isNaN(v) || "Enter a valid number.",
                            })}
                          />
                          <span className="text-sm text-muted-foreground">
                            in
                          </span>
                        </div>
                        <FieldError message={errors.heightInches?.message} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Weight
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        className={inputClass(!!errors.weightLbs)}
                        {...register("weightLbs", {
                          required: "Weight is required.",
                          valueAsNumber: true,
                          min: {
                            value: 50,
                            message: "Enter a valid weight (50–1000 lbs).",
                          },
                          max: {
                            value: 1000,
                            message: "Enter a valid weight (50–1000 lbs).",
                          },
                          validate: (v) => !isNaN(v) || "Enter a valid number.",
                        })}
                      />
                      <span className="text-sm text-muted-foreground">lbs</span>
                    </div>
                    <FieldError message={errors.weightLbs?.message} />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Height
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        className={inputClass(!!errors.heightCm)}
                        {...register("heightCm", {
                          required: "Height is required.",
                          valueAsNumber: true,
                          min: {
                            value: 50,
                            message: "Enter a valid height (50–300 cm).",
                          },
                          max: {
                            value: 300,
                            message: "Enter a valid height (50–300 cm).",
                          },
                          validate: (v) => !isNaN(v) || "Enter a valid number.",
                        })}
                      />
                      <span className="text-sm text-muted-foreground">cm</span>
                    </div>
                    <FieldError message={errors.heightCm?.message} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Weight
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        className={inputClass(!!errors.weightKg)}
                        {...register("weightKg", {
                          required: "Weight is required.",
                          valueAsNumber: true,
                          min: {
                            value: 20,
                            message: "Enter a valid weight (20–500 kg).",
                          },
                          max: {
                            value: 500,
                            message: "Enter a valid weight (20–500 kg).",
                          },
                          validate: (v) => !isNaN(v) || "Enter a valid number.",
                        })}
                      />
                      <span className="text-sm text-muted-foreground">kg</span>
                    </div>
                    <FieldError message={errors.weightKg?.message} />
                  </div>
                </>
              )}

              {/* Settings */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowSettings(!showSettings)}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {showSettings ? "− Settings" : "+ Settings"}
                </button>
                {showSettings && (
                  <div className="mt-3 space-y-4 border-t pt-4">
                    {/* Result Unit */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Results unit
                      </label>
                      <div className="flex gap-4">
                        {(["cal", "kj"] as const).map((u) => (
                          <label
                            key={u}
                            className="flex items-center gap-1.5 text-sm text-foreground cursor-pointer"
                          >
                            <input
                              type="radio"
                              value={u}
                              className="accent-primary"
                              {...register("resultUnit")}
                            />
                            {u === "cal" ? "Calories" : "Kilojoules"}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Formula */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        BMR estimation formula
                      </label>
                      <div className="space-y-1.5">
                        {(["mifflin", "harris", "katch"] as Formula[]).map(
                          (f) => (
                            <label
                              key={f}
                              className="flex items-center gap-1.5 text-sm text-foreground cursor-pointer"
                            >
                              <input
                                type="radio"
                                value={f}
                                className="accent-primary"
                                {...register("formula")}
                              />
                              {f === "mifflin"
                                ? "Mifflin-St Jeor"
                                : f === "harris"
                                  ? "Revised Harris-Benedict"
                                  : "Katch-McArdle"}
                            </label>
                          ),
                        )}
                      </div>
                    </div>

                    {/* Body Fat % — only for Katch */}
                    {formula === "katch" && (
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                          Body Fat %
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            placeholder="e.g. 20"
                            className={inputClass(!!errors.bodyFatPct)}
                            {...register("bodyFatPct", {
                              required:
                                "Body fat % is required for this formula.",
                              valueAsNumber: true,
                              min: {
                                value: 1,
                                message: "Body fat % must be between 1 and 70.",
                              },
                              max: {
                                value: 70,
                                message: "Body fat % must be between 1 and 70.",
                              },
                              validate: (v) =>
                                !isNaN(Number(v)) || "Enter a valid number.",
                            })}
                          />
                          <span className="text-sm text-muted-foreground">
                            %
                          </span>
                        </div>
                        <FieldError message={errors.bodyFatPct?.message} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Calculate Button */}
              <button
                type="submit"
                className="w-full bg-accent text-accent-foreground font-display font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity"
              >
                Calculate
              </button>
            </form>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            {bmr !== null ? (
              <div className="animate-fade-in space-y-6">
                <div>
                  <div className="flex flex-row justify-between">
                    <h2 className="text-xl font-display font-bold text-foreground mb-3">
                      Result
                    </h2>
                  </div>
                  <div className="result-card">
                    <p className="text-muted-foreground text-sm">
                      Your Basal Metabolic Rate
                    </p>
                    <p className="text-4xl font-display font-bold text-primary mt-1">
                      {displayValue(bmr)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {unitLabel}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-display font-semibold text-foreground mb-3">
                    Daily calorie needs based on activity level
                  </h3>
                  <div className="bg-card rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left px-4 py-3 font-semibold text-foreground">
                            Activity Level
                          </th>
                          <th className="text-right px-4 py-3 font-semibold text-foreground">
                            {resultUnit === "kj" ? "kJ" : "Calorie"}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {ACTIVITY_LEVELS.map((level, i) => (
                          <tr
                            key={i}
                            className={i % 2 === 1 ? "table-stripe" : ""}
                          >
                            <td className="px-4 py-3 text-foreground">
                              {level.label}
                            </td>
                            <td className="px-4 py-3 text-right font-display font-semibold text-foreground">
                              {displayValue(Math.round(bmr * level.factor))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                    <p>
                      <strong className="text-foreground">Exercise:</strong>{" "}
                      15-30 minutes of elevated heart rate activity.
                    </p>
                    <p>
                      <strong className="text-foreground">
                        Intense exercise:
                      </strong>{" "}
                      45-120 minutes of elevated heart rate activity.
                    </p>
                    <p>
                      <strong className="text-foreground">
                        Very intense exercise:
                      </strong>{" "}
                      2+ hours of elevated heart rate activity.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[300px] bg-card rounded-lg border">
                <p className="text-muted-foreground text-sm">
                  Enter your details and click Calculate to see results.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default BMR;
