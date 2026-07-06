"use client";

import { useEffect, useState } from "react";

import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

export function useCountUp(target: number, durationMs = 900): number {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion || durationMs <= 0) {
      setValue(target);
      return;
    }

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      if (progress >= 1) {
        setValue(target);
        return;
      }
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, prefersReducedMotion]);

  return value;
}
