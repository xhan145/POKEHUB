import { getEstimatedMarketPrice } from "@/lib/pokehub-data";
import type { CardIdentity, EnvReadiness, MsrpProduct } from "@/types/pokehub";

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function MarketArcade({
  products,
  cards,
  env
}: {
  products: MsrpProduct[];
  cards: CardIdentity[];
  env: EnvReadiness;
}) {
  const totalMsrp = products.reduce((sum, item) => sum + item.msrp, 0);
  const marketValue = products.reduce((sum, item) => sum + getEstimatedMarketPrice(item), 0);
  const delta = marketValue - totalMsrp;

  const stats = [
    { label: "Tracked sealed products", value: products.length.toString(), hint: "MSRP seed online" },
    { label: "Total MSRP basis", value: money(totalMsrp), hint: "Manual seed" },
    { label: "Est. market value", value: money(marketValue), hint: "Placeholder model" },
    { label: "Above MSRP delta", value: money(delta), hint: `${((delta / totalMsrp) * 100).toFixed(1)}% blended` },
    { label: "Card identities", value: cards.length.toString(), hint: env.pokemonTcgApiKey ? "API key ready" : "API key optional" },
    { label: "Source freshness", value: "SEED", hint: "Live sync pending" },
    { label: "Last sync", value: "LOCAL", hint: "Workers ready" },
    { label: "Shared DB", value: env.sharedDatabaseMode ? "POKE" : "OFF", hint: "project_tag scoped" }
  ];

  return (
    <section className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article key={stat.label} className="pixel-stat">
            <p className="text-[10px] uppercase text-fuchsia-200">{stat.label}</p>
            <p className="mt-2 font-mono text-2xl font-black text-emerald-200">{stat.value}</p>
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
