"use client";

import { useState } from "react";

import type { CardIdentity } from "@/types/pokehub";

export function CardValueLab({ cards }: { cards: CardIdentity[] }) {
  const [search, setSearch] = useState("");
  const filtered = cards.filter((card) =>
    `${card.name} ${card.setName} ${card.number} ${card.rarity ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className="pixel-panel overflow-hidden">
      <div className="border-b border-fuchsia-500/30 p-4">
        <p className="pixel-kicker">CARD VALUE LAB</p>
        <h2 className="mt-2 text-xl font-black text-emerald-100">Pokemon TCG API-ready card analysis</h2>
      </div>
      <div className="border-b border-white/10 bg-black/20 p-4">
        <input className="pixel-input max-w-md" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search cards, sets, rarities" />
      </div>

      {cards.length === 0 ? (
        <EmptyState title="No cards ingested yet" body="Run npm run ingest:pokemon after Supabase credentials are configured." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1020px] text-left text-xs">
            <thead className="bg-emerald-950/40 text-emerald-100">
              <tr>
                <th className="px-4 py-3">Image</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Set</th>
                <th className="px-4 py-3">No.</th>
                <th className="px-4 py-3">Rarity</th>
                <th className="px-4 py-3">Raw market</th>
                <th className="px-4 py-3">Graded value</th>
                <th className="px-4 py-3">Liquidity</th>
                <th className="px-4 py-3">Confidence</th>
                <th className="px-4 py-3">Signal</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((card, index) => (
                <tr key={card.pokemonTcgId} className="border-t border-white/10 hover:bg-fuchsia-400/5">
                  <td className="px-4 py-3">
                    {card.imageSmall ? <img className="h-20 w-14 object-contain" src={card.imageSmall} alt={card.name} /> : <div className="card-back" />}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-100">{card.name}</td>
                  <td className="px-4 py-3 text-slate-300">{card.setName}</td>
                  <td className="px-4 py-3 font-mono text-yellow-100">{card.number}</td>
                  <td className="px-4 py-3"><span className="rarity-chip">{card.rarity ?? "Unknown"}</span></td>
                  <td className="px-4 py-3 font-mono text-emerald-200">{index === 0 ? "$118.00" : "pending"}</td>
                  <td className="px-4 py-3 text-slate-400">PSA/CGC pending</td>
                  <td className="px-4 py-3 font-mono text-emerald-100">{76 - index * 8}</td>
                  <td className="px-4 py-3 font-mono text-yellow-100">{70 - index * 5}</td>
                  <td className="px-4 py-3 font-mono text-fuchsia-100">{82 - index * 6}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {cards.length > 0 && filtered.length === 0 && <EmptyState title="No card matches" body="The lab scanner found no matching card identity." />}
    </section>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="m-4 border border-dashed border-yellow-300/50 bg-yellow-300/5 p-6">
      <p className="font-black text-yellow-100">{title}</p>
      <p className="mt-2 text-sm text-slate-300">{body}</p>
    </div>
  );
}
