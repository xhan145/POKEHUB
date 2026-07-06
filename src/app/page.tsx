import { MarketArcade } from "@/components/dashboard/MarketArcade";
import { SealedDex } from "@/components/dashboard/SealedDex";
import { SignalRadar } from "@/components/dashboard/SignalRadar";
import { PixelShell } from "@/components/pixel/PixelShell";
import msrpSeed from "@/data/msrp-seed.json";

export default function HomePage() {
  return (
    <PixelShell>
      <section className="space-y-6">
        <div className="pixel-panel p-6">
          <p className="pixel-kicker">POKEHUB // MARKET ARCADE</p>
          <h1 className="pixel-title">Pokémon Card Value Intelligence</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            Standardize MSRP, cards, sealed products, graded comps, marketplace
            listings, sold velocity, scarcity, and risk signals into one
            collector-grade dashboard.
          </p>
        </div>

        <MarketArcade products={msrpSeed.products} />
        <SealedDex products={msrpSeed.products} />
        <SignalRadar />
      </section>
    </PixelShell>
  );
}
