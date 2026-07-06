"use client";

import clsx from "clsx";
import { useState } from "react";

import type { GlowTier } from "@/components/three/FloatingCard";

export function CardFlip({
  front,
  back,
  glow = "common",
  className,
  ariaLabel
}: {
  front: React.ReactNode;
  back: React.ReactNode;
  glow?: GlowTier;
  className?: string;
  ariaLabel?: string;
}) {
  const [flipped, setFlipped] = useState(false);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setFlipped((current) => !current);
    } else if (event.key === "Escape") {
      setFlipped(false);
    }
  };

  const onBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setFlipped(false);
    }
  };

  return (
    <div className={clsx("card-stage", className)}>
      <div
        className={clsx("card-flip", "cursor-pointer", flipped && "card-flip--flipped", `glow-${glow}`)}
        role="button"
        tabIndex={0}
        aria-pressed={flipped}
        aria-label={ariaLabel}
        onClick={() => setFlipped((current) => !current)}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
      >
        <div className="card-flip__face card-flip__face--front">{front}</div>
        <div className="card-flip__face card-flip__face--back">{back}</div>
      </div>
    </div>
  );
}
