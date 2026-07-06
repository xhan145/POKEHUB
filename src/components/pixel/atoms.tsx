"use client";

import { useEffect, useRef } from "react";

import { useCountUp } from "@/lib/use-count-up";

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD"
});

export function Money({ value }: { value: number }) {
  return <span className="tabular-nums">{usdFormatter.format(value)}</span>;
}

export function StatValue({ value, format = "int" }: { value: number; format?: "int" | "money" }) {
  const current = useCountUp(value);
  const display = format === "money" ? usdFormatter.format(current) : current.toLocaleString("en-US");
  return <span className="font-terminal tabular-nums">{display}</span>;
}

export function SkeletonPanel({ lines }: { lines?: number }) {
  const count = lines ?? 4;
  return (
    <div className="skeleton-panel py-2" role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="skeleton-line" />
      ))}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="pixel-panel p-6 text-center">
      <p className="pixel-kicker">{title}</p>
      <p className="mt-3 text-sm leading-6 text-slate-300">{body}</p>
    </div>
  );
}

export function SectionHeader({ kicker, title }: { kicker: string; title: string }) {
  return (
    <header>
      <p className="pixel-kicker">{kicker}</p>
      <h2 className="mt-1 font-pixel text-lg text-emerald-100">{title}</h2>
    </header>
  );
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function DetailDrawer({
  open,
  onClose,
  title,
  children
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchDeltaYRef = useRef(0);

  useEffect(() => {
    if (!open) {
      return;
    }
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    drawerRef.current?.focus();
    return () => {
      previousFocusRef.current?.focus();
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      onClose();
      return;
    }
    if (event.key !== "Tab") {
      return;
    }
    const drawer = drawerRef.current;
    if (!drawer) {
      return;
    }
    const focusable = drawer.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const onTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartYRef.current = event.touches[0]?.clientY ?? null;
    touchDeltaYRef.current = 0;
  };

  const onTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartYRef.current === null) {
      return;
    }
    const currentY = event.touches[0]?.clientY;
    if (currentY !== undefined) {
      touchDeltaYRef.current = currentY - touchStartYRef.current;
    }
  };

  const onTouchEnd = () => {
    if (touchStartYRef.current !== null && touchDeltaYRef.current > 80) {
      onClose();
    }
    touchStartYRef.current = null;
    touchDeltaYRef.current = 0;
  };

  return (
    <>
      <div className="drawer-scrim" onClick={onClose} aria-hidden="true" />
      <div
        ref={drawerRef}
        className="detail-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="pixel-kicker pt-3">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close detail drawer"
            className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center border-2 border-emerald-400/50 bg-black/40 text-emerald-100 transition-colors hover:border-yellow-300/80"
          >
            <svg
              viewBox="0 0 24 24"
              width={20}
              height={20}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="square"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </>
  );
}

export function EstimateTag() {
  return (
    <span
      className="pixel-chip text-[9px]"
      title="Estimated value derived from deterministic seed data"
    >
      EST
    </span>
  );
}
