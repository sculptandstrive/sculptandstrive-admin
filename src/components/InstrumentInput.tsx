import { useId } from "react";

interface InstrumentInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  unit?: string;
  type?: string;
  min?: number | string;
  max?: number | string;
  step?: number;
  error?: string;
}

const InstrumentInput = ({
  label,
  value,
  onChange,
  unit,
  type = "number",
  // min and max are intentionally NOT spread onto the input element —
  // they are only used for display/context. Validation is handled by RHF.
  min,
  max,
  step,
  error,
}: InstrumentInputProps) => {
  const id = useId();

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#7186A0] pl-0.5">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          step={step}
          className={`w-full h-9 sm:h-10 rounded-xl bg-[#E1EDE9] px-3 sm:px-3.5 text-sm sm:text-base font-bold text-[#0F172A] placeholder-[#94A3B8] shadow-[inset_2px_2px_4px_rgba(165,188,183,0.45),inset_-2px_-2px_4px_rgba(255,255,255,0.9)] border-0 focus:outline-none focus:ring-2 focus:ring-[#08B594]/30 transition-all ${
            unit ? "pr-9 sm:pr-10" : "pr-3 sm:pr-3.5"
          } ${error ? "ring-2 ring-rose-500/50" : ""}`}
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#7186A0] pointer-events-none select-none">
            {unit}
          </span>
        )}
      </div>
      {error && <p className="text-[11px] text-rose-500 font-medium mt-0.5">{error}</p>}
    </div>
  );
};

export default InstrumentInput;
