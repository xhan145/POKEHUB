"use client";

import clsx from "clsx";
import { useState } from "react";

import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { useTilt } from "@/lib/use-tilt";

export type GlowTier = "common" | "rare" | "ultra" | "secret";

export function FloatingCard({
  children,
  glow = "common",
  floatDelay = 0,
  interactive = true,
  className,
  onClick,
  ariaLabel
}: {
  children: React.ReactNode;
  glow?: GlowTier;
  floatDelay?: number;
  interactive?: boolean;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const { ref, onPointerMove, onPointerLeave } = useTilt<HTMLDivElement>();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [spinning, setSpinning] = useState(false);

  const handleSelect = onClick
    ? () => {
        if (interactive && !prefersReducedMotion) {
          setSpinning(true);
        }
        onClick();
      }
    : undefined;

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!handleSelect) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleSelect();
    }
  };

  const onAnimationEnd = (event: React.AnimationEvent<HTMLDivElement>) => {
    if (event.animationName === "card-spin") {
      setSpinning(false);
    }
  };

  return (
    <div
      ref={ref}
      className={clsx(
        "floating-card",
        "floating-card--idle",
        `glow-${glow}`,
        spinning && "card-spin-once",
        className
      )}
      style={floatDelay !== 0 && !spinning ? { animationDelay: floatDelay + "s" } : undefined}
      onPointerMove={interactive ? onPointerMove : undefined}
      onPointerLeave={interactive ? onPointerLeave : undefined}
      onClick={handleSelect}
      onKeyDown={handleSelect ? onKeyDown : undefined}
      onAnimationEnd={spinning ? onAnimationEnd : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}
