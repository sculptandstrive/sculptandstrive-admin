import * as React from "react";
import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";

interface AnimatedCounterProps {
  value: string | number;
  duration?: number;
  className?: string;
}

export function AnimatedCounter({
  value,
  duration = 1.2,
  className,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px" });

  const numValue =
    typeof value === "number"
      ? value
      : parseFloat(String(value).replace(/[^0-9.-]+/g, ""));

  const isNumeric = !isNaN(numValue) && isFinite(numValue);

  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    damping: 30,
    stiffness: 100,
    duration: duration * 1000,
  });

  useEffect(() => {
    if (isInView && isNumeric) {
      motionValue.set(numValue);
    }
  }, [isInView, numValue, isNumeric, motionValue]);

  useEffect(() => {
    if (!isNumeric) {
      if (ref.current) {
        ref.current.textContent = String(value);
      }
      return;
    }

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

  if (!isNumeric) {
    return <span className={className}>{value}</span>;
  }

  return (
    <span ref={ref} className={className}>
      0
    </span>
  );
}
