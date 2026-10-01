import * as React from "react";
import { useEffect, useRef } from "react";
import { useMotionValue, useSpring } from "framer-motion";

interface AnimatedCounterProps {
  value: string | number;
  duration?: number;
  className?: string;
}

export function AnimatedCounter({
  value,
  duration = 0.8,
  className,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);

  const numValue =
    typeof value === "number"
      ? value
      : parseFloat(String(value).replace(/[^0-9.-]+/g, ""));

  const isNumeric = !isNaN(numValue) && isFinite(numValue);

  const motionValue = useMotionValue(isNumeric ? numValue : 0);
  const springValue = useSpring(motionValue, {
    damping: 25,
    stiffness: 120,
    duration: duration * 1000,
  });

  useEffect(() => {
    if (isNumeric) {
      motionValue.set(numValue);
      if (ref.current) {
        ref.current.textContent = numValue.toLocaleString();
      }
    } else if (ref.current) {
      ref.current.textContent = String(value);
    }
  }, [numValue, isNumeric, value, motionValue]);

  useEffect(() => {
    if (!isNumeric) return;

    const unsubscribe = springValue.on("change", (latest) => {
      if (ref.current) {
        const originalStr = String(value);
        const hasDecimals = originalStr.includes(".");
        const decimalPlaces = hasDecimals
          ? originalStr.split(".")[1]?.length || 0
          : 0;

        if (decimalPlaces > 0) {
          ref.current.textContent = latest.toFixed(decimalPlaces);
        } else {
          ref.current.textContent = Math.round(latest).toLocaleString();
        }
      }
    });

    return () => unsubscribe();
  }, [springValue, value, isNumeric]);

  return (
    <span ref={ref} className={className}>
      {isNumeric ? numValue.toLocaleString() : String(value)}
    </span>
  );
}
