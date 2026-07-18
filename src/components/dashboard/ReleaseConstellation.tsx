"use client";

import { useEffect, useMemo, useState } from "react";

import { Money } from "@/components/pixel/atoms";
import type { SelectPayload } from "@/lib/constellation/core/constellation";
import { POKE_THEME } from "@/lib/constellation/poke-theme";
import { HierarchicalAggregator, buildTreeSource } from "@/lib/constellation/providers";
import { ConstellationView } from "@/lib/constellation/react/ConstellationView";
import { buildReleaseFlatNodes } from "@/lib/constellation/release-source";
import { isWebglAvailable } from "@/lib/use-constellation-data";
import type { UpcomingRelease } from "@/types/pokehub";

type SelectedRelease = { kind: "release"; release: UpcomingRelease };
type SelectedProduct = { kind: "product"; productName: string; releaseId: string };
type Selected = SelectedRelease | SelectedProduct | null;

function toSelected(payload: SelectPayload): Selected {
  const data = payload.node?.data;
  if (!data || typeof data !== "object") return null;
  if ("anticipation" in data) return { kind: "release", release: data as UpcomingRelease };
  if ("productName" in data) {
    const product = data as { productName: string; releaseId: string };
    return { kind: "product", productName: product.productName, releaseId: product.releaseId };
  }
  return null;
}

export function ReleaseConstellation({
  upcoming,
  recentSets,
  savingIds,
  onToggleSaving
}: {
  upcoming: UpcomingRelease[];
  recentSets: { name: string; releaseDate: string }[];
  savingIds: string[];
  onToggleSaving: (id: string) => void;
}) {
  // null = undecided; avoids a fallback flash before the browser capability check.
  const [supports3D, setSupports3D] = useState<boolean | null>(null);
  const [selected, setSelected] = useState<Selected>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setSupports3D(!reducedMotion && isWebglAvailable());
  }, []);

  const provider = useMemo(
    () => new HierarchicalAggregator(buildTreeSource(buildReleaseFlatNodes(upcoming, recentSets, savingIds))),
    [upcoming, recentSets, savingIds]
  );

  if (supports3D === null) return null;
  if (!supports3D) {
    return (
      <p className="text-xs text-slate-400">
        3D orbit view is off (WebGL unavailable or reduced motion) — the calendar below has everything.
      </p>
    );
  }

  const selectedRelease =
    selected?.kind === "release"
      ? selected.release
      : selected?.kind === "product"
        ? upcoming.find((release) => release.id === selected.releaseId)
        : undefined;

  return (
    <div className="pixel-panel relative overflow-hidden" style={{ height: "55vh" }}>
      <ConstellationView
        provider={provider}
        theme={POKE_THEME}
        budget={500}
        bloom
        style={{ height: "100%" }}
        onSelect={(payload) => setSelected(toSelected(payload))}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
        <p className="pixel-kicker">ORBIT VIEW · orb = release · size = MSRP · glow = anticipation · ring = saving</p>
      </div>

      {selected && (
        <div className="absolute bottom-3 left-3 max-w-sm border-2 border-emerald-400/60 bg-black/85 p-4">
          {selected.kind === "release" ? (
            <>
              <p className="font-bold text-slate-100">{selected.release.name}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                {selected.release.anticipation.tier} ·{" "}
                {selected.release.daysUntil === null
                  ? "date not announced"
                  : `${selected.release.daysUntil} days to go`}
              </p>
              {typeof selected.release.msrpTotal === "number" && (
                <p className="mt-1 font-terminal text-sm text-emerald-200">
                  <Money value={selected.release.msrpTotal} /> line MSRP
                </p>
              )}
              <button
                type="button"
                aria-pressed={savingIds.includes(selected.release.id)}
                onClick={() => onToggleSaving(selected.release.id)}
                className={`mt-3 min-h-[44px] cursor-pointer border-2 px-3 text-[10px] font-black uppercase tracking-[0.12em] ${
                  savingIds.includes(selected.release.id)
                    ? "border-yellow-300 bg-yellow-300/20 text-yellow-100"
                    : "border-slate-500/60 bg-black/30 text-slate-300"
                }`}
              >
                {savingIds.includes(selected.release.id) ? "★ Saving for this" : "Save for this"}
              </button>
            </>
          ) : (
            <>
              <p className="font-bold text-slate-100">{selected.productName}</p>
              {selectedRelease && (
                <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                  part of {selectedRelease.name}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
