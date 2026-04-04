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
     <label htmlFor={id} className="label-instrument pl-1">
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
         className={`input-instrument ${error ? "border-destructive" : ""}`}
       />
       {unit && (
         <span className="absolute right-12 bottom-2.5 text-sm text-muted-foreground font-medium">
           {unit}
         </span>
       )}
     </div>
     {error && <p className="text-xs text-destructive mt-1">{error}</p>}
   </div>
 );
};

export default InstrumentInput;
