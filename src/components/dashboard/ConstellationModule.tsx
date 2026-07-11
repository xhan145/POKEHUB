"use client";

import { useEffect, useMemo, useState } from "react";

import {
  DetailDrawer,
  EmptyState,
  Money,
  SectionHeader,
  SkeletonPanel
} from "@/components/pixel/atoms";
import { CardOrbitGrid } from "@/components/three/CardOrbitGrid";
import type { ConstellationPayload } from "@/lib/api-v1/constellation-repo";
import {
  buildCardFlatNodes,
  TYPE_COLOR,
  type ConstellationCard
} from "@/lib/constellation/card-source";
import type { SelectPayload } from "@/lib/constellation/core/constellation";
import type { Theme } from "@/lib/constellation/core/types";
import { HierarchicalAggregator, buildTreeSource } from "@/lib/constellation/providers";
import { ConstellationView } from "@/lib/constellation/react/ConstellationView";
import { isWebglAvailable, useConstellationData } from "@/lib/use-constellation-data";

// Dark background matching the app shell; emerald primary / gold secondary accents.
const POKE_THEME: Theme = {
  background: "#08070d",
  accentPrimary: "#34d399",
  accentSecondary: "#fbbf24",
  gridPrimary: "#34d399",
  gridSecondary: "#fbbf24",
  defaultGradient: ["#0b1220", "#0e7490", "#6ee7b7"],
  anomalyWarn: "#f59e0b",
  anomalyError: "#ef4444"
};

function colorForType(type: string): string {
  return TYPE_COLOR[type] ?? TYPE_COLOR.Other;
}

export function ConstellationModule() {
  const state = useConstellationData();
  // null = not yet decided (avoids a fallback flash before the browser check).
  const [supports3D, setSupports3D] = useState<boolean | null>(null);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setSupports3D(isWebglAvailable() && !reduced);
  }, []);

  if (state.status === "loading") {
    return (
      <div className="pixel-panel p-4">
        <SkeletonPanel lines={10} />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <EmptyState
        title="Constellation unavailable"
        body={`The galaxy could not load from /api/v1/constellation (${state.message}). The rest of POKEHUB is unaffected.`}
      />
    );
  }

  if (supports3D === null) {
    return (
      <div className="pixel-panel p-4">
        <SkeletonPanel lines={10} />
      </div>
    );
  }

  if (!supports3D) {
    return <ConstellationFallback payload={state.payload} />;
  }

  return <ConstellationStage payload={state.payload} />;
}

function ConstellationStage({ payload }: { payload: ConstellationPayload }) {
  const [drawerCard, setDrawerCard] = useState<ConstellationCard | null>(null);

  const provider = useMemo(
    () =>
      new HierarchicalAggregator(
        buildTreeSource(buildCardFlatNodes(payload.cards, payload.types))
      ),
    [payload]
  );

  const onSelect = (p: SelectPayload) => {
    const data = p.node?.data as ConstellationCard | undefined;
    if (data) setDrawerCard(data);
  };

  return (
    <section className="pixel-panel overflow-hidden">
      <div className="border-b border-fuchsia-500/30 p-4">
        <SectionHeader kicker="CARD CONSTELLATION" title="Every card, grouped into energy-type galaxies" />
      </div>

      <div className="relative" style={{ height: "70vh" }}>
        <ConstellationView
          provider={provider}
          theme={POKE_THEME}
          budget={2500}
          bloom
          style={{ height: "70vh" }}
          onSelect={onSelect}
        />

        <div className="pointer-events-none absolute left-4 top-4 max-w-[min(20rem,70vw)] border-2 border-emerald-400/40 bg-black/70 p-3">
          <p className="pixel-kicker text-[10px]">
            {payload.total.toLocaleString("en-US")} cards - {payload.types.length} galaxies
          </p>
          <p className="mt-2 text-[11px] leading-5 text-slate-200">
            <span className="text-emerald-200">size</span> = price -{" "}
            <span className="text-yellow-200">glow</span> = trust -{" "}
            <span className="text-amber-300">ring</span> = stale
          </p>
          <p className="mt-1 text-[10px] leading-4 text-slate-400">
            Click a galaxy to drill in - click a card to inspect.
          </p>
        </div>
      </div>

      <DetailDrawer
        open={drawerCard !== null}
        onClose={() => setDrawerCard(null)}
        title={drawerCard ? drawerCard.name : "Card"}
      >
        {drawerCard && <DrawerCardDetail card={drawerCard} />}
      </DetailDrawer>
    </section>
  );
}

function DrawerCardDetail({ card }: { card: ConstellationCard }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    setImageUrl(null);
    const controller = new AbortController();
    fetch(`/api/v1/cards/${encodeURIComponent(card.id)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as {
          data?: { images?: { small?: string | null; large?: string | null } };
        };
        const images = body.data?.images;
        const url = images?.small ?? images?.large ?? null;
        if (typeof url === "string" && url.length > 0) setImageUrl(url);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [card.id]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-center">
        {imageUrl ? (
          <img className="h-56 w-40 object-contain" src={imageUrl} alt={card.name} loading="lazy" />
        ) : (
          <div className="card-back h-56 w-40" />
        )}
      </div>
      <div className="space-y-1.5 text-[12px]">
        <p className="flex items-center justify-between text-slate-300">
          <span className="pixel-kicker text-[9px]">Type</span>
          <span className="inline-flex items-center gap-1.5 font-mono text-slate-100">
            <span
              className="inline-block h-2.5 w-2.5"
              style={{ backgroundColor: colorForType(card.type) }}
              aria-hidden="true"
            />
            {card.type}
          </span>
        </p>
        <p className="flex items-center justify-between text-slate-300">
          <span className="pixel-kicker text-[9px]">Price</span>
          <span className="font-mono text-emerald-200">
            {card.price > 0 ? <Money value={card.price} /> : "Unpriced"}
          </span>
        </p>
        <p className="flex items-center justify-between text-slate-300">
          <span className="pixel-kicker text-[9px]">Trust tier</span>
          <span className="rarity-chip">{card.tier}</span>
        </p>
        {card.rarity && (
          <p className="flex items-center justify-between text-slate-300">
            <span className="pixel-kicker text-[9px]">Rarity</span>
            <span className="font-mono text-yellow-100">{card.rarity}</span>
          </p>
        )}
        {card.set && (
          <p className="flex items-center justify-between text-slate-300">
            <span className="pixel-kicker text-[9px]">Set</span>
            <span className="font-mono text-slate-200">{card.set}</span>
          </p>
        )}
      </div>
    </div>
  );
}

function ConstellationFallback({ payload }: { payload: ConstellationPayload }) {
  return (
    <section className="pixel-panel overflow-hidden">
      <div className="border-b border-fuchsia-500/30 p-4">
        <SectionHeader kicker="CARD CONSTELLATION" title="Energy-type galaxies (static view)" />
      </div>
      <div className="p-4">
        <p className="mb-4 text-sm leading-6 text-slate-300">
          Your browser or settings disabled the live galaxy (no WebGL or reduced-motion is on).
          Here are the {payload.total.toLocaleString("en-US")} cards by energy type - browse cards
          in Card Lab for full detail.
        </p>
        <CardOrbitGrid>
          {payload.types.map((summary) => (
            <div
              key={summary.type}
              className="flex items-center justify-between border-2 border-emerald-400/40 bg-black/50 p-3"
            >
              <span className="inline-flex items-center gap-2 font-terminal text-sm text-slate-100">
                <span
                  className="inline-block h-3 w-3"
                  style={{ backgroundColor: colorForType(summary.type) }}
                  aria-hidden="true"
                />
                {summary.type}
              </span>
              <span className="font-mono text-emerald-200">
                {summary.count.toLocaleString("en-US")}
              </span>
            </div>
          ))}
        </CardOrbitGrid>
      </div>
    </section>
  );
}
