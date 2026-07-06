"use client";

import { useState } from "react";

import { CardValueLab } from "@/components/dashboard/CardValueLab";
import { MarketArcade } from "@/components/dashboard/MarketArcade";
import { PixelPortfolio } from "@/components/dashboard/PixelPortfolio";
import { SealedDex } from "@/components/dashboard/SealedDex";
import { SettingsPanel } from "@/components/dashboard/SettingsPanel";
import { SignalRadar } from "@/components/dashboard/SignalRadar";
import type { CardIdentity, EnvReadiness, MsrpProduct, PortfolioItem } from "@/types/pokehub";

type TabId = "arcade" | "sealed" | "cards" | "radar" | "portfolio" | "settings";

const tabs: { id: TabId; label: string }[] = [
  { id: "arcade", label: "Market Arcade" },
  { id: "sealed", label: "Sealed Dex" },
  { id: "cards", label: "Card Lab" },
  { id: "radar", label: "Signal Radar" },
  { id: "portfolio", label: "Portfolio" },
  { id: "settings", label: "Settings" }
];

export function DashboardApp({
  products,
  cards,
  portfolio,
  env
}: {
  products: MsrpProduct[];
  cards: CardIdentity[];
  portfolio: PortfolioItem[];
  env: EnvReadiness;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("arcade");

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

      <div className="tab-bar" role="tablist" aria-label="POKEHUB modules">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className="pixel-tab"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "arcade" && <MarketArcade products={products} cards={cards} env={env} />}
      {activeTab === "sealed" && <SealedDex products={products} />}
      {activeTab === "cards" && <CardValueLab cards={cards} />}
      {activeTab === "radar" && <SignalRadar />}
      {activeTab === "portfolio" && <PixelPortfolio items={portfolio} />}
      {activeTab === "settings" && <SettingsPanel env={env} />}
    </section>
  );
}
