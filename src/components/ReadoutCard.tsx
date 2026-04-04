import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";
import { Button } from "./ui/button";

interface ReadoutCardProps {
  label: string;
  value: string;
  unit?: string;
  description?: string;
  children?: ReactNode;
  colorClass?: string;
  handleDBSave?: ()=>void
  showSave?: Boolean
}

const ReadoutCard = ({ label, value, unit, description, handleDBSave, children, colorClass = "text-accent", showSave }: ReadoutCardProps) => {
  return (
    <motion.div layout className="surface-elevated p-2 md:p-6 rounded-xl">
      <div className="flex justify-between">
        <span className="label-instrument">{label}</span>
        {
          showSave ? <Button className="p-2" onClick={handleDBSave}>Save</Button> :
          <></>
        }
      </div>
      <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
        <AnimatePresence mode="popLayout">
          <motion.h2
            key={value}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={`text-3xl font-mono font-bold tracking-tighter ${colorClass}`}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {value}
          </motion.h2>
        </AnimatePresence>
        {unit && (
          <span className="text-lg font-medium text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
      {description && (
        <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-[60ch]">
          {description}
        </p>
      )}
      {children}
    </motion.div>
  );
};

export default ReadoutCard;
