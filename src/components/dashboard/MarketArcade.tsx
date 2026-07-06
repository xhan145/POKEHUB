"use client";

import { CardOrbitGrid } from "@/components/three/CardOrbitGrid";
import { FloatingCard } from "@/components/three/FloatingCard";
import { getEstimatedMarketPrice } from "@/lib/pokehub-data";
import { getDerivedSealedStats } from "@/lib/derived-stats";
import { EstimateTag, Money, SectionHeader, SkeletonPanel, StatValue } from "@/components/pixel/atoms";
import type { CardIdentity, EnvReadiness, LiveOverview, MsrpProduct } from "@/types/pokehub";

function hoursAgoLabel(iso: string) {
  const then = new Date(iso).getTime();
  const hours = Math.max(0, Math.round((Date.now() - then) / (1000 * 60 * 60)));
  if (hours <= 0) return "just now";
  if (hours === 1) return "1h ago";
  return `${hours}h ago`;
}

type CountStat = { label: string; kind: "count"; value: number; format: "int" | "money"; hint: string };
type TextStat = { label: string; kind: "text"; display: string; hint: string };
type Stat = CountStat | TextStat;

export function MarketArcade({
  products,
  cards,
  env,
  live
}: {
  products: MsrpProduct[];
  cards: CardIdentity[];
  env: EnvReadiness;
  live?: LiveOverview | null;
}) {
  const totalMsrp = products.reduce((sum, item) => sum + item.msrp, 0);
  const marketValue = products.reduce((sum, item) => sum + getEstimatedMarketPrice(item), 0);
  const delta = marketValue - totalMsrp;

  const stats: Stat[] = [
    { label: "Tracked sealed products", kind: "count", value: products.length, format: "int", hint: "MSRP seed online" },
    { label: "Total MSRP basis", kind: "count", value: totalMsrp, format: "money", hint: "Manual seed" },
    { label: "Est. market value", kind: "count", value: marketValue, format: "money", hint: "Placeholder model" },
    {
      label: "Above MSRP delta",
      kind: "count",
      value: delta,
      format: "money",
      hint: `${((delta / totalMsrp) * 100).toFixed(1)}% blended`
    },
    {
      label: "Card identities",
      kind: "count",
      value: cards.length,
      format: "int",
      hint: env.pokemonTcgApiKey ? "API key ready" : "API key optional"
    },
    {
      label: "Snapshot count",
      kind: "count",
      value: live?.snapshotCount ?? 0,
      format: "int",
      hint: live ? "live" : "seed mode"
    },
    {
      label: "Source freshness",
      kind: "text",
      display: live?.lastSync ? hoursAgoLabel(live.lastSync) : "SEED",
      hint: "Live sync pending"
    },
    {
      label: "Last sync",
      kind: "text",
      display: live?.lastSync ? new Date(live.lastSync).toLocaleString("en-US") : "LOCAL",
      hint: "Workers ready"
    },
    {
      label: "Shared DB",
      kind: "text",
      display: env.sharedDatabaseMode ? "POKE" : "OFF",
      hint: "project_tag scoped"
    }
  ];

  const topMovers = [...products]
    .map((product) => ({ product, derived: getDerivedSealedStats(product.name, product.msrp) }))
    .sort((a, b) => b.derived.signalScore - a.derived.signalScore)
    .slice(0, 4);

  return (
    <section className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article key={stat.label} className="pixel-stat">
            <p className="text-[10px] uppercase text-fuchsia-200">{stat.label}</p>
            <p className="mt-2 font-mono text-2xl font-black text-emerald-200">
              {stat.kind === "count" ? <StatValue value={stat.value} format={stat.format} /> : stat.display}
            </p>
            <p className="mt-2 text-[11px] uppercase text-slate-400">{stat.hint}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="pixel-panel p-5">
          <p className="pixel-kicker">MARKET ARCADE</p>
          <h2 className="mt-2 text-xl font-black text-yellow-100">Collector terminal is running in seed mode.</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            MSRP products render without external keys. Workers can upsert sealed products, fetch
            Pokemon TCG card metadata, and store embedded TCGplayer/Cardmarket snapshots once the
            Supabase service role is configured.
          </p>
        </article>

        <article className="pixel-panel p-5">
          <p className="pixel-kicker">SOURCE READINESS</p>
          <div className="mt-4 grid gap-2 text-xs">
            <Readiness label="Supabase URL" ready={env.supabaseUrl} />
            <Readiness label="Anon key" ready={env.supabaseAnonKey} />
            <Readiness label="Service role" ready={env.supabaseServiceRoleKey} />
            <Readiness label="Pokemon TCG API" ready={env.pokemonTcgApiKey} optional />
          </div>
        </article>
      </div>

      <div className="pixel-panel p-5">
        <SectionHeader kicker="TOP MOVERS" title="Highest signal sealed products" />
        <div className="mt-4">
          {products.length === 0 ? (
            <SkeletonPanel lines={4} />
          ) : (
            <CardOrbitGrid>
              {topMovers.map(({ product, derived }) => {
                const market = getEstimatedMarketPrice(product);
                const aboveMsrp = ((market - product.msrp) / product.msrp) * 100;
                return (
                  <FloatingCard
                    key={product.name}
                    glow={derived.signalScore >= 80 ? "ultra" : derived.signalScore >= 60 ? "rare" : "common"}
                    ariaLabel={`${product.name} top mover`}
                  >
                    <div className="p-4">
                      <p className="text-xs font-semibold text-slate-100">{product.name}</p>
                      <p className="mt-2 font-mono text-lg text-emerald-200">
                        <Money value={market} />
                      </p>
                      <p className="mt-1 font-mono text-xs text-fuchsia-100">{aboveMsrp.toFixed(1)}% above MSRP</p>
                      <div className="mt-3">
                        <EstimateTag />
                      </div>
                    </div>
                  </FloatingCard>
                );
              })}
            </CardOrbitGrid>
          )}
        </div>
      </div>
    </section>
  );
}

function Readiness({ label, ready, optional = false }: { label: string; ready: boolean; optional?: boolean }) {
  return (
    <div className="flex items-center justify-between border border-white/10 bg-black/20 px-3 py-2">
      <span className="text-slate-300">{label}</span>
      <span className={ready ? "text-emerald-300" : optional ? "text-yellow-200" : "text-fuchsia-200"}>
        {ready ? "READY" : optional ? "OPTIONAL" : "MISSING"}
      </span>
    </div>
  );
}
