"use client";

import { useMemo, useState } from "react";

import { CardOrbitGrid } from "@/components/three/CardOrbitGrid";
import { CardFlip } from "@/components/three/CardFlip";
import { EmptyState, EstimateTag, Money, SectionHeader } from "@/components/pixel/atoms";
import { getDerivedCardStats } from "@/lib/derived-stats";
import type { CardIdentity } from "@/types/pokehub";

const minScoreOptions = ["ALL", "60+", "75+", "90+"] as const;
type MinScoreOption = (typeof minScoreOptions)[number];

const MIN_SCORE_THRESHOLD: Record<MinScoreOption, number> = {
  ALL: 0,
  "60+": 60,
  "75+": 75,
  "90+": 90
};

export function CardValueLab({ cards }: { cards: CardIdentity[] }) {
  const [search, setSearch] = useState("");
  const [rarity, setRarity] = useState("ALL");
  const [setName, setSetName] = useState("ALL");
  const [minScore, setMinScore] = useState<MinScoreOption>("ALL");

  const rarities = useMemo(
    () => ["ALL", ...Array.from(new Set(cards.map((card) => card.rarity ?? "Unknown")))],
    [cards]
  );

  const sets = useMemo(
    () => ["ALL", ...Array.from(new Set(cards.map((card) => card.setName)))],
    [cards]
  );

  const filtered = cards.filter((card) => {
    const matchesSearch = `${card.name} ${card.setName} ${card.number} ${card.rarity ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesRarity = rarity === "ALL" || (card.rarity ?? "Unknown") === rarity;
    const matchesSet = setName === "ALL" || card.setName === setName;
    const matchesScore = getDerivedCardStats(card).signalScore >= MIN_SCORE_THRESHOLD[minScore];

    return matchesSearch && matchesRarity && matchesSet && matchesScore;
  });

  return (
    <section className="pixel-panel overflow-hidden">
      <div className="border-b border-fuchsia-500/30 p-4">
        <SectionHeader kicker="CARD VALUE LAB" title="Pokemon TCG API-ready card analysis" />
      </div>
      <div className="grid gap-3 border-b border-white/10 bg-black/20 p-4 md:grid-cols-4">
        <input
          className="pixel-input"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search cards, sets, rarities"
        />
        <select className="pixel-input" value={rarity} onChange={(event) => setRarity(event.target.value)}>
          {rarities.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select className="pixel-input" value={setName} onChange={(event) => setSetName(event.target.value)}>
          {sets.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select
          className="pixel-input"
          value={minScore}
          onChange={(event) => setMinScore(event.target.value as MinScoreOption)}
        >
          {minScoreOptions.map((option) => (
            <option key={option} value={option}>
              Signal {option}
            </option>
          ))}
        </select>
      </div>

      {cards.length === 0 ? (
        <EmptyState title="No cards ingested yet" body="Run npm run ingest:pokemon after Supabase credentials are configured." />
      ) : (
        <>
          {filtered.length > 0 && (
            <div className="p-4">
              <CardOrbitGrid>
                {filtered.map((card) => {
                  const stats = getDerivedCardStats(card);
                  return (
                    <CardFlip
                      key={card.pokemonTcgId}
                      glow={stats.glow}
                      ariaLabel={`${card.name}, flip for market detail`}
                      front={
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-black/40 p-3">
                          {card.imageSmall ? (
                            <img
                              className="h-40 w-28 object-contain"
                              src={card.imageSmall}
                              alt={card.name}
                              loading="lazy"
                            />
                          ) : (
                            <div className="card-back h-40 w-28" style={{ height: "10rem", width: "7rem" }} />
                          )}
                          <p className="text-center text-xs font-bold text-slate-100">{card.name}</p>
                        </div>
                      }
                      back={
                        <div className="flex h-full w-full flex-col gap-1.5 bg-black/70 p-3 text-[11px]">
                          <p className="font-black text-emerald-100">{card.name}</p>
                          <p className="flex items-center justify-between text-slate-300">
                            <span>Raw market</span>
                            <span className="font-mono text-emerald-200">
                              <Money value={stats.rawMarket} />
                            </span>
                          </p>
                          <p className="flex items-center justify-between text-slate-300">
                            <span>Graded est.</span>
                            <span className="font-mono text-yellow-100">
                              <Money value={stats.gradedEstimate} />
                            </span>
                          </p>
                          <p className="flex items-center justify-between text-slate-300">
                            <span>Population</span>
                            <span className="font-mono text-slate-400">{stats.population}</span>
                          </p>
                          <p className="flex items-center justify-between text-slate-300">
                            <span>Spread</span>
                            <span className="font-mono text-fuchsia-100">{stats.spread.toFixed(2)}</span>
                          </p>
                          <p className="flex items-center justify-between text-slate-300">
                            <span>Liquidity</span>
                            <span className="font-mono text-emerald-100">{stats.liquidityScore}</span>
                          </p>
                          <p className="flex items-center justify-between text-slate-300">
                            <span>Confidence</span>
                            <span className="font-mono text-yellow-100">{stats.confidenceScore}</span>
                          </p>
                          <p className="flex items-center justify-between text-slate-300">
                            <span>Signal</span>
                            <span className="font-mono text-fuchsia-100">{stats.signalScore}</span>
                          </p>
                          <div className="mt-auto flex justify-end">
                            <EstimateTag />
                          </div>
                        </div>
                      }
                    />
                  );
                })}
              </CardOrbitGrid>
            </div>
          )}

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
                {filtered.map((card) => {
                  const stats = getDerivedCardStats(card);
                  return (
                    <tr key={card.pokemonTcgId} className="border-t border-white/10 hover:bg-fuchsia-400/5">
                      <td className="px-4 py-3">
                        {card.imageSmall ? (
                          <img className="h-20 w-14 object-contain" src={card.imageSmall} alt={card.name} loading="lazy" />
                        ) : (
                          <div className="card-back h-20 w-14" />
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-100">{card.name}</td>
                      <td className="px-4 py-3 text-slate-300">{card.setName}</td>
                      <td className="px-4 py-3 font-mono text-yellow-100">{card.number}</td>
                      <td className="px-4 py-3"><span className="rarity-chip">{card.rarity ?? "Unknown"}</span></td>
                      <td className="px-4 py-3 font-mono text-emerald-200">
                        <Money value={stats.rawMarket} /> <EstimateTag />
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-200">
                        <Money value={stats.gradedEstimate} />
                      </td>
                      <td className="px-4 py-3 font-mono text-emerald-100">{stats.liquidityScore}</td>
                      <td className="px-4 py-3 font-mono text-yellow-100">{stats.confidenceScore}</td>
                      <td className="px-4 py-3 font-mono text-fuchsia-100">{stats.signalScore}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && <EmptyState title="No card matches" body="The lab scanner found no matching card identity." />}
        </>
      )}
    </section>
  );
}
