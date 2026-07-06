"use client";

import clsx from "clsx";

import { EmptyState, SectionHeader, SkeletonPanel } from "@/components/pixel/atoms";
import { CardOrbitGrid } from "@/components/three/CardOrbitGrid";
import { FloatingCard } from "@/components/three/FloatingCard";
import type { GlowTier } from "@/components/three/FloatingCard";
import { useSourceStatus } from "@/lib/use-source-status";
import type { AdapterStatus } from "@/types/pokehub";

const KIND_LABELS: Record<AdapterStatus["kind"], string> = {
  api: "API",
  csv: "CSV",
  scraper_stub: "STUB"
};

function glowForAdapter(adapter: AdapterStatus): GlowTier {
  if (adapter.enabled && adapter.hasCredentials) {
    return "rare";
  }
  return "common";
}

function formatRateLimit(rateLimitPerMinute?: number): string {
  return rateLimitPerMinute ? `${rateLimitPerMinute}/min` : "—";
}

function formatRunTimestamp(value?: string): string {
  if (!value) {
    return "never";
  }
  return new Date(value).toLocaleString("en-US");
}

function AdapterCard({ adapter }: { adapter: AdapterStatus }) {
  const isStub = adapter.kind === "scraper_stub";
  const lastRun = adapter.lastRun ?? null;

  return (
    <FloatingCard
      glow={glowForAdapter(adapter)}
      className={clsx("pixel-panel p-4", isStub && "border-dashed")}
      ariaLabel={adapter.label}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-black text-yellow-100">{adapter.label}</h3>
        <span className="pixel-chip text-[9px]">{KIND_LABELS[adapter.kind]}</span>
      </div>

      <dl className="mt-3 space-y-1.5 text-xs leading-5 text-slate-300">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-400">Status</dt>
          <dd className="font-mono text-yellow-100">{adapter.enabled ? "ENABLED" : "DISABLED"}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-400">Credentials</dt>
          <dd className="font-mono text-yellow-100">{adapter.hasCredentials ? "yes" : "no"}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-400">Last run</dt>
          <dd className="font-mono">{formatRunTimestamp(lastRun?.startedAt)}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-400">Last success</dt>
          <dd className="font-mono">{lastRun?.status === "success" ? formatRunTimestamp(lastRun.finishedAt) : "never"}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-400">Last error</dt>
          <dd className="font-mono">{lastRun?.status === "error" ? lastRun.errorMessage ?? "unknown error" : "never"}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-400">Rate limit</dt>
          <dd className="font-mono">{formatRateLimit(adapter.rateLimitPerMinute)}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-400">Inserted / updated</dt>
          <dd className="font-mono tabular-nums">{lastRun ? `${lastRun.inserted} / ${lastRun.updated}` : "0 / 0"}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-400">Next run</dt>
          <dd className="font-mono">manual</dd>
        </div>
      </dl>

      {isStub && (
        <p className="mt-3 border-t border-white/10 pt-3 text-[11px] leading-5 text-slate-400">
          Needs approval/API key.{adapter.policy?.notes ? ` ${adapter.policy.notes}` : ""}
        </p>
      )}
    </FloatingCard>
  );
}

export function ControlCenter() {
  const sourceStatus = useSourceStatus();

  return (
    <section className="space-y-5">
      <SectionHeader kicker="CONTROL CENTER" title="Source adapters" />

      {sourceStatus.status === "loading" && (
        <div className="orbit-grid card-stage">
          {Array.from({ length: 4 }, (_, index) => (
            <SkeletonPanel key={index} />
          ))}
        </div>
      )}

      {sourceStatus.status === "error" && (
        <EmptyState
          title="ADAPTERS OFFLINE"
          body={`${sourceStatus.message} Retry by reloading this tab once the source registry is reachable.`}
        />
      )}

      {sourceStatus.status === "ready" && (
        <CardOrbitGrid>
          {sourceStatus.adapters.map((adapter) => (
            <AdapterCard key={adapter.id} adapter={adapter} />
          ))}
        </CardOrbitGrid>
      )}
    </section>
  );
}
