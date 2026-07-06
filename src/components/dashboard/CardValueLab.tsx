"use client";

import { useEffect, useState } from "react";

import { CardOrbitGrid } from "@/components/three/CardOrbitGrid";
import { CardFlip } from "@/components/three/CardFlip";
import { EmptyState, EstimateTag, Money, SectionHeader, SkeletonPanel } from "@/components/pixel/atoms";
import type { LiveCard } from "@/lib/api-v1/card-mapper";
import { getDerivedCardStats } from "@/lib/derived-stats";
import { useCardsSearch } from "@/lib/use-cards-search";

const minScoreOptions = ["ALL", "60+", "75+", "90+"] as const;
type MinScoreOption = (typeof minScoreOptions)[number];

const MIN_SCORE_THRESHOLD: Record<MinScoreOption, number> = {
  ALL: 0,
  "60+": 60,
  "75+": 75,
  "90+": 90
};

const rarityOptions = [
  "ALL",
  "Common",
  "Uncommon",
  "Rare",
  "Rare Holo",
  "Ultra Rare",
  "Secret Rare",
  "Special Illustration Rare",
  "Illustration Rare",
  "Double Rare",
  "Hyper Rare"
];

const PAGE_SIZE = 24;

const pagerButtonClass =
  "min-h-[44px] min-w-[44px] cursor-pointer border-2 border-emerald-400/50 bg-black/40 px-4 font-terminal text-xs font-black text-emerald-100 transition-colors hover:border-yellow-300/80 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-emerald-400/50";

export function CardValueLab({
  initialCards,
  totalCount
}: {
  initialCards: LiveCard[];
  totalCount: number;
}) {
  const { state, query, setQuery, rarity, setRarity, setName, setSetName, setPage } =
    useCardsSearch({ cards: initialCards, totalCount });
  const [minScore, setMinScore] = useState<MinScoreOption>("ALL");
  const [setOptions, setSetOptions] = useState<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v1/sets?pageSize=250", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as { data?: unknown };
        const names = (Array.isArray(body.data) ? body.data : [])
          .map((row) =>
            row !== null && typeof row === "object" ? (row as { name?: unknown }).name : undefined
          )
          .filter((name): name is string => typeof name === "string" && name.length > 0)
          .sort((a, b) => a.localeCompare(b));
        setSetOptions(names);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const visible = state.cards.filter(
    (card) => getDerivedCardStats(card.identity).signalScore >= MIN_SCORE_THRESHOLD[minScore]
  );
  const totalPages = Math.max(1, Math.ceil(state.totalCount / PAGE_SIZE));

  return (
    <section className="pixel-panel overflow-hidden">
      <div className="border-b border-fuchsia-500/30 p-4">
        <SectionHeader kicker="CARD VALUE LAB" title="Pokemon TCG API-ready card analysis" />
      </div>
      <div className="grid gap-3 border-b border-white/10 bg-black/20 p-4 md:grid-cols-4">
        <input
          className="pixel-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search cards by name"
        />
        <select className="pixel-input" value={rarity} onChange={(event) => setRarity(event.target.value)}>
          {rarityOptions.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select className="pixel-input" value={setName} onChange={(event) => setSetName(event.target.value)}>
          <option>ALL</option>
          {setOptions.map((item) => (
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

      {state.status === "loading" ? (
        <div className="p-4">
          <SkeletonPanel lines={8} />
        </div>
      ) : (
        <>
          {visible.length > 0 && (
            <div className="p-4">
              <CardOrbitGrid>
                {visible.map((card) => {
                  const stats = getDerivedCardStats(card.identity);
                  return (
                    <CardFlip
                      key={card.identity.pokemonTcgId}
                      glow={stats.glow}
                      ariaLabel={`${card.identity.name}, flip for market detail`}
                      front={
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-black/40 p-3">
                          {card.identity.imageSmall ? (
                            <img
                              className="h-40 w-28 object-contain"
                              src={card.identity.imageSmall}
                              alt={card.identity.name}
                              loading="lazy"
                            />
                          ) : (
                            <div className="card-back h-40 w-28" style={{ height: "10rem", width: "7rem" }} />
                          )}
                          <p className="text-center text-xs font-bold text-slate-100">{card.identity.name}</p>
                        </div>
                      }
                      back={
                        <div className="flex h-full w-full flex-col gap-1.5 bg-black/70 p-3 text-[11px]">
                          <p className="font-black text-emerald-100">{card.identity.name}</p>
                          <p className="flex items-center justify-between text-slate-300">
                            <span>Raw market</span>
                            <span className="font-mono text-emerald-200">
                              <Money value={card.market ?? stats.rawMarket} />
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
                          {card.market === null && (
                            <div className="mt-auto flex justify-end">
                              <EstimateTag />
                            </div>
                          )}
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
                {visible.map((card) => {
                  const stats = getDerivedCardStats(card.identity);
                  return (
                    <tr key={card.identity.pokemonTcgId} className="border-t border-white/10 hover:bg-fuchsia-400/5">
                      <td className="px-4 py-3">
                        {card.identity.imageSmall ? (
                          <img
                            className="h-20 w-14 object-contain"
                            src={card.identity.imageSmall}
                            alt={card.identity.name}
                            loading="lazy"
                          />
                        ) : (
                          <div className="card-back h-20 w-14" />
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-100">{card.identity.name}</td>
                      <td className="px-4 py-3 text-slate-300">{card.identity.setName}</td>
                      <td className="px-4 py-3 font-mono text-yellow-100">{card.identity.number}</td>
                      <td className="px-4 py-3"><span className="rarity-chip">{card.identity.rarity ?? "Unknown"}</span></td>
                      <td className="px-4 py-3 font-mono text-emerald-200">
                        <Money value={card.market ?? stats.rawMarket} />{" "}
                        {card.market === null && <EstimateTag />}
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

          {state.status === "error" && (
            <EmptyState
              title="Card API unreachable"
              body="Live card data could not be loaded from /api/v1/cards. Showing the last loaded cards; adjust filters or flip pages to retry."
            />
          )}
          {state.status === "ready" && visible.length === 0 && (
            <EmptyState title="No card matches" body="The lab scanner found no matching card identity." />
          )}
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-black/20 p-4">
        <button
          type="button"
          className={pagerButtonClass}
          onClick={() => setPage(state.page - 1)}
          disabled={state.page <= 1 || state.status === "loading"}
        >
          PREV
        </button>
        <p className="text-center font-terminal text-xs text-emerald-100">
          PAGE {state.page} / {totalPages} - {state.totalCount.toLocaleString("en-US")} CARDS TRACKED
        </p>
        <button
          type="button"
          className={pagerButtonClass}
          onClick={() => setPage(state.page + 1)}
          disabled={state.page >= totalPages || state.status === "loading"}
        >
          NEXT
        </button>
      </div>
    </section>
  );
}
