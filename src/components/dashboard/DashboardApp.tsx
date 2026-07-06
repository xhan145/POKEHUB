"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import { MarketArcade } from "@/components/dashboard/MarketArcade";
import { SkeletonPanel } from "@/components/pixel/atoms";
import {
  IconArcade,
  IconBox,
  IconCard,
  IconFolder,
  IconGear,
  IconMore,
  IconRadar,
  IconSatellite
} from "@/components/pixel/icons";
import type { LiveCard } from "@/lib/api-v1/card-mapper";
import type {
  EnvReadiness,
  LiveOverview,
  MsrpProduct,
  PortfolioItem
} from "@/types/pokehub";

const SealedDex = dynamic(
  () => import("@/components/dashboard/SealedDex").then((mod) => mod.SealedDex),
  { loading: () => <SkeletonPanel lines={8} /> }
);
const CardValueLab = dynamic(
  () => import("@/components/dashboard/CardValueLab").then((mod) => mod.CardValueLab),
  { loading: () => <SkeletonPanel lines={8} /> }
);
const SignalRadar = dynamic(
  () => import("@/components/dashboard/SignalRadar").then((mod) => mod.SignalRadar),
  { loading: () => <SkeletonPanel lines={8} /> }
);
const PixelPortfolio = dynamic(
  () => import("@/components/dashboard/PixelPortfolio").then((mod) => mod.PixelPortfolio),
  { loading: () => <SkeletonPanel lines={8} /> }
);
const ControlCenter = dynamic(
  () => import("@/components/dashboard/ControlCenter").then((mod) => mod.ControlCenter),
  { loading: () => <SkeletonPanel lines={8} /> }
);
const SettingsPanel = dynamic(
  () => import("@/components/dashboard/SettingsPanel").then((mod) => mod.SettingsPanel),
  { loading: () => <SkeletonPanel lines={8} /> }
);

type TabId = "arcade" | "sealed" | "cards" | "radar" | "portfolio" | "control" | "settings";

type TabDef = {
  id: TabId;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const tabs: TabDef[] = [
  { id: "arcade", label: "Arcade", icon: IconArcade },
  { id: "sealed", label: "Sealed", icon: IconBox },
  { id: "cards", label: "Cards", icon: IconCard },
  { id: "radar", label: "Radar", icon: IconRadar },
  { id: "portfolio", label: "Portfolio", icon: IconFolder },
  { id: "control", label: "Control Center", icon: IconSatellite },
  { id: "settings", label: "Settings", icon: IconGear }
];

const primaryTabs = tabs.slice(0, 5);
const overflowTabs = tabs.slice(5);

export function DashboardApp({
  products,
  liveCards,
  cardTotal,
  portfolio,
  env,
  live
}: {
  products: MsrpProduct[];
  liveCards: LiveCard[];
  cardTotal: number;
  portfolio: PortfolioItem[];
  env: EnvReadiness;
  live: LiveOverview | null;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("arcade");
  const [moreOpen, setMoreOpen] = useState(false);
  const cards = useMemo(() => liveCards.map((c) => c.identity), [liveCards]);

  const selectTab = (tabId: TabId) => {
    setActiveTab(tabId);
    setMoreOpen(false);
  };

  return (
    <section className="space-y-5">
      <div className="pixel-hero">
        <div>
          <p className="pixel-kicker">UUPM // UNIFIED UNDERGROUND PRICE MONITOR</p>
          <h1 className="pixel-title">POKEHUB</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
            Pokemon TCG market intelligence for sealed MSRP, card identity, price signals,
            grading upside, liquidity, and collector risk.
          </p>
        </div>
        <div className="pokeball-sigil" aria-hidden="true">
          <span />
        </div>
      </div>

      <div className="lg:flex lg:gap-5">
        <nav className="side-rail" role="tablist" aria-label="POKEHUB modules">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className="nav-item cursor-pointer"
              onClick={() => selectTab(tab.id)}
            >
              <tab.icon />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1 pb-20 lg:pb-0">
          <div key={activeTab} className="tab-panel">
            {activeTab === "arcade" && (
              <MarketArcade products={products} cards={cards} env={env} live={live} />
            )}
            {activeTab === "sealed" && <SealedDex products={products} />}
            {activeTab === "cards" && <CardValueLab initialCards={liveCards} totalCount={cardTotal} />}
            {activeTab === "radar" && <SignalRadar products={products} cards={cards} />}
            {activeTab === "portfolio" && <PixelPortfolio items={portfolio} />}
            {activeTab === "control" && <ControlCenter />}
            {activeTab === "settings" && <SettingsPanel env={env} />}
          </div>
        </div>
      </div>

      <nav className="bottom-nav" role="tablist" aria-label="POKEHUB modules">
        {primaryTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className="nav-item cursor-pointer"
            onClick={() => selectTab(tab.id)}
          >
            <tab.icon />
            <span>{tab.label}</span>
          </button>
        ))}
        <button
          type="button"
          aria-expanded={moreOpen}
          aria-selected={overflowTabs.some((tab) => tab.id === activeTab)}
          className="nav-item cursor-pointer"
          onClick={() => setMoreOpen((open) => !open)}
        >
          <IconMore />
          <span>More</span>
        </button>
      </nav>

      {moreOpen && (
        <>
          <div className="drawer-scrim" style={{ zIndex: 65 }} onClick={() => setMoreOpen(false)} aria-hidden="true" />
          <div className="more-sheet" role="dialog" aria-label="More modules">
            <div className="grid grid-cols-2 gap-2">
              {overflowTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  aria-selected={activeTab === tab.id}
                  className="nav-item cursor-pointer"
                  onClick={() => selectTab(tab.id)}
                >
                  <tab.icon />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
