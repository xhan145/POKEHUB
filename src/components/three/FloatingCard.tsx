"use client";

import clsx from "clsx";

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

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      ref={ref}
      className={clsx("floating-card", "floating-card--idle", `glow-${glow}`, className)}
      style={{ animationDelay: floatDelay + "s" }}
      onPointerMove={interactive ? onPointerMove : undefined}
      onPointerLeave={interactive ? onPointerLeave : undefined}
      onClick={onClick}
      onKeyDown={onClick ? onKeyDown : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}
