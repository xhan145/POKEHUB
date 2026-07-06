"use client";

import { EmptyState, SkeletonPanel } from "@/components/pixel/atoms";
import { useSourceStatus } from "@/lib/use-source-status";
import type { EnvReadiness } from "@/types/pokehub";

export function SettingsPanel({ env }: { env: EnvReadiness }) {
  const rows = [
    ["Project tag", env.projectTag],
    ["Supabase URL", env.supabaseUrl ? "yes" : "no"],
    ["Supabase anon key", env.supabaseAnonKey ? "yes" : "no"],
    ["Service role key", env.supabaseServiceRoleKey ? "yes" : "no"],
    ["Pokemon TCG API key", env.pokemonTcgApiKey ? "yes" : "no"],
    ["PriceCharting token", env.priceChartingToken ? "yes" : "no"],
    ["eBay credentials", env.ebayCredentials ? "yes" : "no"],
    ["Shared database mode", env.sharedDatabaseMode ? "enabled" : "disabled"],
    ["Ingest token", env.ingestToken ? "yes" : "no"]
  ];

  const sourceStatus = useSourceStatus();

  return (
    <section className="pixel-panel p-5">
      <p className="pixel-kicker">SETTINGS</p>
      <h2 className="mt-2 text-xl font-black text-emerald-100">Environment readiness</h2>
      <div className="mt-5 grid gap-2 md:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between border border-white/10 bg-black/25 px-4 py-3 text-sm">
            <span className="text-slate-300">{label}</span>
            <span className="font-mono text-yellow-100">{value}</span>
          </div>
        ))}
      </div>
      <p className="mt-5 text-xs leading-5 text-slate-400">
        Secret values are never displayed. Browser code uses only NEXT_PUBLIC_SUPABASE_URL and
        NEXT_PUBLIC_SUPABASE_ANON_KEY; ingestion workers use the service role on the server side.
      </p>

      <div className="mt-8">
        <p className="pixel-kicker">SOURCE ADAPTERS</p>
        <div className="mt-3">
          {sourceStatus.status === "loading" && <SkeletonPanel lines={4} />}
          {sourceStatus.status === "error" && (
            <EmptyState title="ADAPTERS OFFLINE" body={sourceStatus.message} />
          )}
          {sourceStatus.status === "ready" && (
            <div className="grid gap-2 md:grid-cols-2">
              {sourceStatus.adapters.map((adapter) => (
                <div
                  key={adapter.id}
                  className="flex items-center justify-between gap-3 border border-white/10 bg-black/25 px-4 py-3 text-sm"
                >
                  <span className="text-slate-300">{adapter.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="pixel-chip">{adapter.kind.toUpperCase()}</span>
                    <span className="font-mono text-yellow-100">
                      {adapter.enabled ? "ENABLED" : "DISABLED"}
                    </span>
                    <span className="font-mono text-yellow-100">
                      CRED {adapter.hasCredentials ? "yes" : "no"}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
