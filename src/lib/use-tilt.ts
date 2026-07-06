"use client";

import { useCallback, useRef } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

export function useTilt<T extends HTMLElement>(maxDeg = 10): {
  ref: RefObject<T | null>;
  onPointerMove: (event: ReactPointerEvent<T>) => void;
  onPointerLeave: () => void;
} {
  const ref = useRef<T | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<T>) => {
      const node = ref.current;
      if (!node || prefersReducedMotion || event.pointerType === "touch") {
        return;
      }
      const rect = node.getBoundingClientRect();
      const halfWidth = rect.width / 2;
      const halfHeight = rect.height / 2;
      if (halfWidth === 0 || halfHeight === 0) {
        return;
      }
      const offsetX = event.clientX - rect.left - halfWidth;
      const offsetY = event.clientY - rect.top - halfHeight;
      node.style.setProperty("--tilt-x", `${-(offsetY / halfHeight) * maxDeg}deg`);
      node.style.setProperty("--tilt-y", `${(offsetX / halfWidth) * maxDeg}deg`);
    },
    [maxDeg, prefersReducedMotion]
  );

  const onPointerLeave = useCallback(() => {
    const node = ref.current;
    if (!node) {
      return;
    }
    node.style.setProperty("--tilt-x", "0deg");
    node.style.setProperty("--tilt-y", "0deg");
  }, []);

  return { ref, onPointerMove, onPointerLeave };
}
