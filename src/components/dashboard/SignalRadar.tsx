"use client";

import { getDerivedCardStats, getDerivedSealedStats } from "@/lib/derived-stats";
import { getEstimatedMarketPrice } from "@/lib/pokehub-data";
import type { CardIdentity, MsrpProduct } from "@/types/pokehub";

const HYPE_CHARACTERS = ["Charizard", "Pikachu", "Umbreon", "Mew", "Eevee"];

type RadarPanel = {
  title: string;
  body: string;
  tag: string;
  count: number;
  items: string[];
  dataSource: string;
};

function matchesHypeCharacter(name: string) {
  return HYPE_CHARACTERS.some((character) => name.includes(character));
}

function firstNames(names: string[]) {
  return names.slice(0, 3);
}

export function computeRadar(products: MsrpProduct[], cards: CardIdentity[]): RadarPanel[] {
  const underMsrp = products.filter((product) => getEstimatedMarketPrice(product) < product.msrp);
  const aboveMsrpMovers = products.filter(
    (product) => getDerivedSealedStats(product.name, product.msrp).signalScore >= 70
  );
  const highSpreadTraps = cards.filter((card) => getDerivedCardStats(card).spread >= 0.5);
  const staleSources = [...products.map((product) => product.name), ...cards.map((card) => card.name)];
  const gradeArbitrage = cards.filter((card) => {
    const stats = getDerivedCardStats(card);
    return stats.gradedEstimate >= 1.9 * stats.rawMarket;
  });
  const characterHype = [
    ...products.filter((product) => matchesHypeCharacter(product.name)),
    ...cards.filter((card) => matchesHypeCharacter(card.name))
  ];
  const lowPopGrails = cards.filter((card) => getDerivedCardStats(card).glow === "secret");
  const fastVelocity = products.filter(
    (product) => getDerivedSealedStats(product.name, product.msrp).velocity === "FAST"
  );
  const suspiciousOutliers = cards.filter((card) => getDerivedCardStats(card).spread >= 0.8);

  return [
    {
      title: "Under-MSRP sealed opportunities",
      body: "Mini tins and low-entry boxes need live sold velocity before buy signals activate.",
      tag: "WATCH",
      count: underMsrp.length,
      items: firstNames(underMsrp.map((product) => product.name)),
      dataSource: "ebay_browse"
    },
    {
      title: "Above-MSRP movers",
      body: "UPC and ETB seed models show early premium pressure, pending marketplace confirmation.",
      tag: "MOVE",
      count: aboveMsrpMovers.length,
      items: firstNames(aboveMsrpMovers.map((product) => product.name)),
      dataSource: "pricecharting"
    },
    {
      title: "High spread / low liquidity traps",
      body: "Listings without sold comps stay quarantined until eBay or PriceCharting confirms demand.",
      tag: "RISK",
      count: highSpreadTraps.length,
      items: firstNames(highSpreadTraps.map((card) => card.name)),
      dataSource: "ebay_browse"
    },
    {
      title: "Stale source alerts",
      body: "Any snapshot older than seven days should decay confidence automatically.",
      tag: "STALE",
      count: staleSources.length,
      items: firstNames(staleSources),
      dataSource: "manual_seed"
    },
    {
      title: "Grade arbitrage candidates",
      body: "Raw cards with strong centering and clean surfaces can move to the grading queue.",
      tag: "GRADE",
      count: gradeArbitrage.length,
      items: firstNames(gradeArbitrage.map((card) => card.name)),
      dataSource: "psa_public_api"
    },
    {
      title: "Character hype spikes",
      body: "Charizard, Pikachu, Umbreon, Mew, and Eevee get separate demand flags.",
      tag: "HYPE",
      count: characterHype.length,
      items: firstNames(characterHype.map((item) => item.name)),
      dataSource: "pokemon_tcg_api"
    },
    {
      title: "Low-population grails",
      body: "PSA/CGC/BGS population sources are permission-gated and stored as snapshots.",
      tag: "POP",
      count: lowPopGrails.length,
      items: firstNames(lowPopGrails.map((card) => card.name)),
      dataSource: "psa_public_api"
    },
    {
      title: "Fast-velocity commons/uncommons",
      body: "Tournament playability can make cheap cards surprisingly liquid.",
      tag: "PLAY",
      count: fastVelocity.length,
      items: firstNames(fastVelocity.map((product) => product.name)),
      dataSource: "pricecharting"
    },
    {
      title: "Suspicious outlier sales",
      body: "Sales far outside the comp cluster stay flagged until a second source confirms the print.",
      tag: "ALERT",
      count: suspiciousOutliers.length,
      items: firstNames(suspiciousOutliers.map((card) => card.name)),
      dataSource: "ebay_browse"
    }
  ];
}

export function SignalRadar({ products, cards }: { products: MsrpProduct[]; cards: CardIdentity[] }) {
  const panels = computeRadar(products, cards);

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {panels.map((panel) => (
        <article key={panel.title} className="stagger-item pixel-panel p-5 transition hover:-translate-y-1 hover:translate-x-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-black text-yellow-100">{panel.title}</h3>
            <span className="pixel-chip">{panel.tag}</span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-300">{panel.body}</p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="font-mono text-2xl font-black text-emerald-200">{panel.count}</span>
            <span className="pixel-chip text-[9px]">SEED</span>
          </div>
          {panel.count > 0 ? (
            <ul className="mt-3 space-y-1 text-xs text-slate-300">
              {panel.items.map((item, index) => (
                <li key={`${panel.title}-${index}-${item}`} className="truncate">
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-slate-500">
              Would activate once {panel.dataSource} is connected.
            </p>
          )}
        </article>
      ))}
    </section>
  );
}
