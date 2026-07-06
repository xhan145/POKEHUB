import clsx from "clsx";
import { Children } from "react";

export function CardOrbitGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("orbit-grid", "card-stage", className)}>
      {Children.map(children, (child) => (
        <div className="stagger-item">{child}</div>
      ))}
    </div>
  );
}
