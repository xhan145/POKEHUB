"use client";

import { useMemo, useState } from "react";

import { getEstimatedMarketPrice, getSignalBadge } from "@/lib/pokehub-data";
import type { MsrpProduct, SignalBadge } from "@/types/pokehub";

const signalOptions: ("ALL" | SignalBadge)[] = ["ALL", "GRAIL WATCH", "CORE SEALED", "LOW ENTRY", "PLAYABILITY", "TRACK"];

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function SealedDex({ products }: { products: MsrpProduct[] }) {
  const [search, setSearch] = useState("");
  const [productType, setProductType] = useState("ALL");
  const [msrpRange, setMsrpRange] = useState("ALL");
  const [signal, setSignal] = useState<(typeof signalOptions)[number]>("ALL");

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

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1060px] text-left text-xs">
          <thead className="bg-fuchsia-950/50 text-fuchsia-100">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">MSRP</th>
              <th className="px-4 py-3">Product type</th>
              <th className="px-4 py-3">Est. market</th>
              <th className="px-4 py-3">Above MSRP</th>
              <th className="px-4 py-3">Active listings</th>
              <th className="px-4 py-3">Sold comps</th>
              <th className="px-4 py-3">Velocity</th>
              <th className="px-4 py-3">Signal</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => {
              const market = getEstimatedMarketPrice(product);
              const aboveMsrp = ((market - product.msrp) / product.msrp) * 100;
              const badge = getSignalBadge(product);

              return (
                <tr key={product.name} className="border-t border-white/10 hover:bg-emerald-400/5">
                  <td className="px-4 py-3 font-semibold text-slate-100">{product.name}</td>
                  <td className="px-4 py-3 font-mono text-emerald-200">{money(product.msrp)}</td>
                  <td className="px-4 py-3 text-slate-300">{product.productType}</td>
                  <td className="px-4 py-3 font-mono text-yellow-100">{money(market)}</td>
                  <td className="px-4 py-3 font-mono text-fuchsia-100">{aboveMsrp.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-slate-400">pending</td>
                  <td className="px-4 py-3 text-slate-400">pending</td>
                  <td className="px-4 py-3 text-slate-400">seed</td>
                  <td className="px-4 py-3">
                    <span className="pixel-chip">{badge}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && <div className="p-6 text-sm text-yellow-100">No sealed products match that terminal filter.</div>}
    </section>
  );
}
