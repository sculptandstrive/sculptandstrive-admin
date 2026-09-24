import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export interface FormData {
  unit: "us" | "metric";
  age: number;
  gender: "male" | "female";
  heightFt: number;
  heightIn: number;
  weight: number;
  activity: string;
  goal: string;
}

interface Props {
  onCalculate: (data: FormData) => void;
  savedData?: FormData | null;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

export function CalculatorForm({ onCalculate, savedData }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    mode: "onChange",
    defaultValues: {
      unit: "us",
      age: 25,
      gender: "male",
      heightFt: 5,
      heightIn: 10,
      weight: 160,
      activity: "moderate",
      goal: "maintain",
    },
  });

  useEffect(() => {
    if (savedData) {
      reset(savedData);
    }
  }, [savedData]);

  const unit = watch("unit");
  const gender = watch("gender");

  const handleUnitSwitch = (u: "us" | "metric") => {
    if (u === "us") {
      reset({
        unit: "us",
        age: watch("age"),
        gender: watch("gender"),
        heightFt: 5,
        heightIn: 10,
        weight: 160,
        activity: watch("activity"),
        goal: watch("goal"),
      });
    } else {
      reset({
        unit: "metric",
        age: watch("age"),
        gender: watch("gender"),
        heightFt: 170,
        heightIn: 0,
        weight: 73,
        activity: watch("activity"),
        goal: watch("goal"),
      });
    }
  };

  const activityOptions = [
    { value: "bmr", label: "BMR", desc: "Basal Metabolic Rate" },
    { value: "sedentary", label: "Sedentary", desc: "Little or no exercise" },
    { value: "light", label: "Light", desc: "Exercise 1-3 times/week" },
    { value: "moderate", label: "Moderate", desc: "Exercise 4-5 times/week" },
    {
      value: "active",
      label: "Active",
      desc: "Daily exercise or intense 3-4x/week",
    },
    {
      value: "veryActive",
      label: "Very Active",
      desc: "Intense exercise 6-7 times/week",
    },
    {
      value: "extraActive",
      label: "Extra Active",
      desc: "Very intense daily, or physical job",
    },
  ];

  const goalOptions = [
    { value: "maintain", label: "Maintain weight" },
    { value: "mildLoss", label: "Mild weight loss (0.5 lb/week)" },
    { value: "loss", label: "Weight loss (1 lb/week)" },
    { value: "extremeLoss", label: "Extreme weight loss (2 lb/week)" },
    { value: "mildGain", label: "Mild weight gain (0.5 lb/week)" },
    { value: "gain", label: "Weight gain (1 lb/week)" },
    { value: "extremeGain", label: "Extreme weight gain (2 lb/week)" },
  ];

  const inputClass = (hasError?: boolean) =>
    `w-full rounded-xl border-0 bg-[#E2ECE9] shadow-[inset_2px_2px_4px_rgba(165,185,180,0.45),inset_-2px_-2px_4px_rgba(255,255,255,0.85)] px-3.5 py-2.5 text-sm font-semibold text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#08B594]/30 ${
      hasError ? "ring-2 ring-destructive/40" : ""
    }`;

  return (
    <form
      onSubmit={handleSubmit(onCalculate)}
      className="rounded-[26px] border border-white/90 bg-white p-6 shadow-[5px_5px_14px_rgba(168,190,185,0.25),-4px_-4px_12px_rgba(255,255,255,0.95)] space-y-5"
    >
      {/* Unit Toggle */}
      <div className="flex rounded-full bg-[#E1EDE9] p-1 shadow-[inset_2px_2px_4px_rgba(165,185,180,0.5),inset_-2px_-2px_4px_rgba(255,255,255,0.9)] gap-1">
        {(["us", "metric"] as const).map((u) => (
          <button
            key={u}
            type="button"
            onClick={() => handleUnitSwitch(u)}
            className={`flex-1 rounded-full py-2 text-sm font-medium transition-all ${
              unit === u
                ? "bg-gradient-to-r from-[#08B594] via-[#07AB8C] to-[#069D80] shadow-[0_2px_6px_rgba(8,169,130,0.35)] text-white font-bold"
                : "text-[#7186A0] hover:text-[#08B594] font-medium"
            }`}
          >
            {u === "us" ? "US Units" : "Metric"}
          </button>
        ))}
      </div>

      {/* Age */}
      <div>
        <label className="text-sm font-medium text-foreground">Age</label>
        <input
          type="number"
          className={inputClass(!!errors.age)}
          {...register("age", {
            required: "Age is required.",
            valueAsNumber: true,
            min: { value: 18, message: "Age must be between 18 and 80." },
            max: { value: 80, message: "Age must be between 18 and 80." },
            validate: (v) => !isNaN(v) || "Enter a valid age.",
          })}
        />
        <FieldError message={errors.age?.message} />
        {!errors.age && (
          <p className="mt-1 text-xs text-muted-foreground">Ages 18–80</p>
        )}
      </div>

      {/* Gender */}
      <div>
        <label className="text-sm font-medium text-foreground">Gender</label>
        <div className="mt-1.5 flex rounded-full bg-[#E1EDE9] p-1 shadow-[inset_2px_2px_4px_rgba(165,185,180,0.5),inset_-2px_-2px_4px_rgba(255,255,255,0.9)] gap-1">
          {(["male", "female"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setValue("gender", g)}
              className={`flex-1 rounded-full py-2 text-sm font-medium transition-all capitalize ${
                gender === g
                  ? "bg-gradient-to-r from-[#08B594] via-[#07AB8C] to-[#069D80] shadow-[0_2px_6px_rgba(8,169,130,0.35)] text-white font-bold"
                  : "text-[#7186A0] hover:text-[#08B594] font-medium"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Height */}
      <div>
        <label className="text-sm font-medium text-foreground">Height</label>
        {unit === "us" ? (
          <div className="mt-1.5 grid grid-cols-2 gap-3">
            <div>
              <input
                type="number"
                className={inputClass(!!errors.heightFt)}
                {...register("heightFt", {
                  required: "Feet is required.",
                  valueAsNumber: true,
                  min: { value: 1, message: "Feet must be between 1 and 8." },
                  max: { value: 8, message: "Feet must be between 1 and 8." },
                  validate: (v) => !isNaN(v) || "Enter a valid number.",
                })}
              />
              <span className="text-xs text-muted-foreground">feet</span>
              <FieldError message={errors.heightFt?.message} />
            </div>
            <div>
              <input
                type="number"
                className={inputClass(!!errors.heightIn)}
                {...register("heightIn", {
                  required: "Inches is required.",
                  valueAsNumber: true,
                  min: {
                    value: 0,
                    message: "Inches must be between 0 and 11.",
                  },
                  max: {
                    value: 11,
                    message: "Inches must be between 0 and 11.",
                  },
                  validate: (v) => !isNaN(v) || "Enter a valid number.",
                })}
              />
              <span className="text-xs text-muted-foreground">inches</span>
              <FieldError message={errors.heightIn?.message} />
            </div>
          </div>
        ) : (
          <div className="mt-1.5">
            <input
              type="number"
              className={inputClass(!!errors.heightFt)}
              {...register("heightFt", {
                required: "Height is required.",
                valueAsNumber: true,
                min: {
                  value: 100,
                  message: "Height must be between 100 and 250 cm.",
                },
                max: {
                  value: 250,
                  message: "Height must be between 100 and 250 cm.",
                },
                validate: (v) => !isNaN(v) || "Enter a valid number.",
              })}
            />
            <span className="text-xs text-muted-foreground">cm</span>
            <FieldError message={errors.heightFt?.message} />
          </div>
        )}
      </div>

      {/* Weight */}
      <div>
        <label className="text-sm font-medium text-foreground">Weight</label>
        <input
          type="number"
          className={`mt-1.5 ${inputClass(!!errors.weight)}`}
          {...register("weight", {
            required: "Weight is required.",
            valueAsNumber: true,
            min: {
              value: unit === "us" ? 50 : 20,
              message:
                unit === "us"
                  ? "Enter a valid weight (50–1000 lbs)."
                  : "Enter a valid weight (20–500 kg).",
            },
            max: {
              value: unit === "us" ? 1000 : 500,
              message:
                unit === "us"
                  ? "Enter a valid weight (50–1000 lbs)."
                  : "Enter a valid weight (20–500 kg).",
            },
            validate: (v) => !isNaN(v) || "Enter a valid number.",
          })}
        />
        <span className="text-xs text-muted-foreground">
          {unit === "us" ? "pounds" : "kg"}
        </span>
        <FieldError message={errors.weight?.message} />
      </div>

      {/* Activity */}
      <div>
        <label className="text-sm font-medium text-foreground">
          Activity Level
        </label>
        <select className={`mt-1.5 ${inputClass()}`} {...register("activity")}>
          {activityOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}: {o.desc}
            </option>
          ))}
        </select>
      </div>

      {/* Goal */}
      <div>
        <label className="text-sm font-medium text-foreground">Your Goal</label>
        <select className={`mt-1.5 ${inputClass()}`} {...register("goal")}>
          {goalOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full text-base font-semibold bg-accent"
      >
        Calculate
      </Button>
    </form>
  );
}
