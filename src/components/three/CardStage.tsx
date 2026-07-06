import clsx from "clsx";

export function CardStage({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx("card-stage", className)}>{children}</div>;
}
