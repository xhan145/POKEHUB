"use client";

import { useMemo, useState } from "react";

import { CardFlip } from "@/components/three/CardFlip";
import { CardOrbitGrid } from "@/components/three/CardOrbitGrid";
import type { GlowTier } from "@/components/three/FloatingCard";
import { FloatingCard } from "@/components/three/FloatingCard";
import { getDerivedSealedStats } from "@/lib/derived-stats";
import { getEstimatedMarketPrice, getSignalBadge } from "@/lib/pokehub-data";
import { DetailDrawer, EstimateTag, Money } from "@/components/pixel/atoms";
import { IconBox } from "@/components/pixel/icons";
import type { MsrpProduct, SignalBadge } from "@/types/pokehub";

const signalOptions: ("ALL" | SignalBadge)[] = ["ALL", "GRAIL WATCH", "CORE SEALED", "LOW ENTRY", "PLAYABILITY", "TRACK"];

const GLOW_BY_BADGE: Record<SignalBadge, GlowTier> = {
  "GRAIL WATCH": "secret",
  "CORE SEALED": "ultra",
  "LOW ENTRY": "common",
  PLAYABILITY: "rare",
  TRACK: "common"
};

type SortKey = "name" | "msrp" | "market" | "aboveMsrp" | "velocity";

const VELOCITY_RANK: Record<string, number> = { SLOW: 0, STEADY: 1, FAST: 2 };

const sortHeaders: { key: SortKey; label: string }[] = [
  { key: "name", label: "Product" },
  { key: "msrp", label: "MSRP" },
  { key: "market", label: "Est. market" },
  { key: "aboveMsrp", label: "Above MSRP" },
  { key: "velocity", label: "Velocity" }
];

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function SealedDex({ products }: { products: MsrpProduct[] }) {
  const [search, setSearch] = useState("");
  const [productType, setProductType] = useState("ALL");
  const [msrpRange, setMsrpRange] = useState("ALL");
  const [signal, setSignal] = useState<(typeof signalOptions)[number]>("ALL");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "name", dir: "asc" });
  const [activeProduct, setActiveProduct] = useState<MsrpProduct | null>(null);

  const productTypes = useMemo(() => ["ALL", ...Array.from(new Set(products.map((item) => item.productType)))], [products]);

  const filtered = products.filter((product) => {
    const badge = getSignalBadge(product);
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = productType === "ALL" || product.productType === productType;
    const matchesSignal = signal === "ALL" || badge === signal;
    const matchesMsrp =
      msrpRange === "ALL" ||
      (msrpRange === "LOW" && product.msrp <= 20) ||
      (msrpRange === "MID" && product.msrp > 20 && product.msrp < 75) ||
      (msrpRange === "HIGH" && product.msrp >= 75);

    return matchesSearch && matchesType && matchesSignal && matchesMsrp;
  });

  const sorted = useMemo(() => {
    const withStats = filtered.map((product) => {
      const market = getEstimatedMarketPrice(product);
      const aboveMsrp = ((market - product.msrp) / product.msrp) * 100;
      const derived = getDerivedSealedStats(product.name, product.msrp);
      return { product, market, aboveMsrp, derived };
    });

    const dirMultiplier = sort.dir === "asc" ? 1 : -1;
    return withStats.sort((a, b) => {
      switch (sort.key) {
        case "name":
          return a.product.name.localeCompare(b.product.name) * dirMultiplier;
        case "msrp":
          return (a.product.msrp - b.product.msrp) * dirMultiplier;
        case "market":
          return (a.market - b.market) * dirMultiplier;
        case "aboveMsrp":
          return (a.aboveMsrp - b.aboveMsrp) * dirMultiplier;
        case "velocity":
          return (VELOCITY_RANK[a.derived.velocity] - VELOCITY_RANK[b.derived.velocity]) * dirMultiplier;
        default:
          return 0;
      }
    });
  }, [filtered, sort]);

  const toggleSort = (key: SortKey) => {
    setSort((current) => {
      if (current.key !== key) {
        return { key, dir: "asc" };
      }
      return { key, dir: current.dir === "asc" ? "desc" : "asc" };
    });
  };

  const activeBadge = activeProduct ? getSignalBadge(activeProduct) : null;
  const activeMarket = activeProduct ? getEstimatedMarketPrice(activeProduct) : null;
  const activeDerived = activeProduct ? getDerivedSealedStats(activeProduct.name, activeProduct.msrp) : null;

  return (
    <section className="pixel-panel overflow-hidden">
      <div className="border-b border-fuchsia-500/30 p-4">
        <p className="pixel-kicker">SEALED PRODUCT DEX</p>
        <h2 className="mt-2 text-xl font-black text-emerald-100">MSRP seed products and placeholder market pressure</h2>
      </div>

      <div className="grid gap-3 border-b border-white/10 bg-black/20 p-4 md:grid-cols-4">
        <input className="pixel-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product" />
        <select className="pixel-input" value={productType} onChange={(event) => setProductType(event.target.value)}>
          {productTypes.map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>
        <select className="pixel-input" value={msrpRange} onChange={(event) => setMsrpRange(event.target.value)}>
          <option value="ALL">All MSRP</option>
          <option value="LOW">$0-$20</option>
          <option value="MID">$20-$75</option>
          <option value="HIGH">$75+</option>
        </select>
        <select className="pixel-input" value={signal} onChange={(event) => setSignal(event.target.value as (typeof signalOptions)[number])}>
          {signalOptions.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1180px] text-left text-xs">
          <thead className="bg-fuchsia-950/50 text-fuchsia-100">
            <tr>
              {sortHeaders.map((header) => {
                const isActive = sort.key === header.key;
                const ariaSort = isActive ? (sort.dir === "asc" ? "ascending" : "descending") : "none";
                return (
                  <th key={header.key} className="px-4 py-3" aria-sort={ariaSort}>
                    <button
                      type="button"
                      onClick={() => toggleSort(header.key)}
                      className="flex min-h-[44px] cursor-pointer items-center gap-1 text-left uppercase tracking-wide text-fuchsia-100"
                    >
                      {header.label}
                      <span aria-hidden="true">{isActive ? (sort.dir === "asc" ? "▲" : "▼") : ""}</span>
                    </button>
                  </th>
                );
              })}
              <th className="px-4 py-3">Product type</th>
              <th className="px-4 py-3">Active listings</th>
              <th className="px-4 py-3">Sold comps</th>
              <th className="px-4 py-3">Reprint risk</th>
              <th className="px-4 py-3">Last checked</th>
              <th className="px-4 py-3">Signal</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ product, market, aboveMsrp, derived }) => {
              const badge = getSignalBadge(product);

              return (
                <tr
                  key={product.name}
                  className="cursor-pointer border-t border-white/10 hover:bg-emerald-400/5"
                  onClick={() => setActiveProduct(product)}
                >
                  <td className="px-4 py-3 font-semibold text-slate-100">{product.name}</td>
                  <td className="px-4 py-3 font-mono text-emerald-200">{money(product.msrp)}</td>
                  <td className="px-4 py-3 font-mono text-yellow-100">
                    <span className="inline-flex items-center gap-1">
                      {money(market)}
                      <EstimateTag />
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-fuchsia-100">{aboveMsrp.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-slate-200">{derived.velocity}</td>
                  <td className="px-4 py-3 text-slate-300">{product.productType}</td>
                  <td className="px-4 py-3 font-mono text-slate-200">{derived.activeListings}</td>
                  <td className="px-4 py-3 font-mono text-slate-200">{derived.soldComps}</td>
                  <td className="px-4 py-3 text-slate-200">{derived.reprintRisk}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      SEED
                      <EstimateTag />
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="pixel-chip">{badge}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="p-4 md:hidden">
        <CardOrbitGrid>
          {sorted.map(({ product, market }) => {
            const badge = getSignalBadge(product);
            return (
              <FloatingCard
                key={product.name}
                glow={GLOW_BY_BADGE[badge]}
                onClick={() => setActiveProduct(product)}
                ariaLabel={`${product.name} sealed product detail`}
              >
                <div className="pixel-panel p-4">
                  <div className="flex items-center justify-center border-2 border-dashed border-white/20 bg-black/30 py-6">
                    <IconBox className="text-emerald-200" width={40} height={40} />
                  </div>
                  <p className="mt-3 font-semibold text-slate-100">{product.name}</p>
                  <p className="mt-1 font-mono text-emerald-200">{money(product.msrp)}</p>
                  <p className="mt-1 inline-flex items-center gap-1 font-mono text-yellow-100">
                    {money(market)}
                    <EstimateTag />
                  </p>
                  <span className="pixel-chip mt-3 inline-block">{badge}</span>
                </div>
              </FloatingCard>
            );
          })}
        </CardOrbitGrid>
      </div>

      {sorted.length === 0 && <div className="p-6 text-sm text-yellow-100">No sealed products match that terminal filter.</div>}

      <DetailDrawer open={activeProduct !== null} onClose={() => setActiveProduct(null)} title="SEALED PRODUCT DETAIL">
        {activeProduct && activeBadge && activeMarket !== null && activeDerived && (
          <div className="space-y-4">
            <CardFlip
              glow={GLOW_BY_BADGE[activeBadge]}
              ariaLabel={`${activeProduct.name} flip card`}
              front={
                <div className="pixel-panel flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
                  <div className="flex items-center justify-center border-2 border-dashed border-white/20 bg-black/30 p-6">
                    <IconBox className="text-emerald-200" width={48} height={48} />
                  </div>
                  <p className="font-semibold text-slate-100">{activeProduct.name}</p>
                  <span className="pixel-chip">{activeBadge}</span>
                </div>
              }
              back={
                <div className="pixel-panel h-full space-y-2 p-4 text-xs">
                  <p className="pixel-kicker">FULL STAT SHEET</p>
                  <p className="text-slate-300">
                    MSRP <span className="font-mono text-emerald-200">{money(activeProduct.msrp)}</span>
                  </p>
                  <p className="text-slate-300">
                    Est. market <span className="font-mono text-yellow-100">{money(activeMarket)}</span>
                  </p>
                  <p className="text-slate-300">
                    Active listings <span className="font-mono text-slate-100">{activeDerived.activeListings}</span>
                  </p>
                  <p className="text-slate-300">
                    Sold comps <span className="font-mono text-slate-100">{activeDerived.soldComps}</span>
                  </p>
                  <p className="text-slate-300">
                    Velocity <span className="font-mono text-slate-100">{activeDerived.velocity}</span>
                  </p>
                  <p className="text-slate-300">
                    Reprint risk <span className="font-mono text-slate-100">{activeDerived.reprintRisk}</span>
                  </p>
                  <p className="text-slate-300">
                    Liquidity score <span className="font-mono text-slate-100">{activeDerived.liquidityScore}</span>
                  </p>
                  <p className="text-slate-300">
                    Signal score <span className="font-mono text-slate-100">{activeDerived.signalScore}</span>
                  </p>
                </div>
              }
            />

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="pixel-panel p-3">
                <p className="pixel-kicker">MSRP</p>
                <p className="mt-1"><Money value={activeProduct.msrp} /></p>
              </div>
              <div className="pixel-panel p-3">
                <p className="pixel-kicker">EST. MARKET</p>
                <p className="mt-1 inline-flex items-center gap-1">
                  <Money value={activeMarket} />
                  <EstimateTag />
                </p>
              </div>
              <div className="pixel-panel p-3">
                <p className="pixel-kicker">ACTIVE LISTINGS</p>
                <p className="mt-1 font-mono text-slate-100">{activeDerived.activeListings}</p>
              </div>
              <div className="pixel-panel p-3">
                <p className="pixel-kicker">SOLD COMPS</p>
                <p className="mt-1 font-mono text-slate-100">{activeDerived.soldComps}</p>
              </div>
              <div className="pixel-panel p-3">
                <p className="pixel-kicker">REPRINT RISK</p>
                <p className="mt-1 font-mono text-slate-100">{activeDerived.reprintRisk}</p>
              </div>
              <div className="pixel-panel p-3">
                <p className="pixel-kicker">LAST CHECKED</p>
                <p className="mt-1 inline-flex items-center gap-1 font-mono text-slate-400">
                  SEED
                  <EstimateTag />
                </p>
              </div>
            </div>
          </div>
        )}
      </DetailDrawer>
    </section>
  );
}
