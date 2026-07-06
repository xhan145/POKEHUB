import type { PortfolioItem } from "@/types/pokehub";
import { CardOrbitGrid } from "@/components/three/CardOrbitGrid";
import { FloatingCard, type GlowTier } from "@/components/three/FloatingCard";
import { Money, SectionHeader, StatValue } from "@/components/pixel/atoms";

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function signedMoney(value: number) {
  const sign = value >= 0 ? "+" : "−";
  return `${sign}${money(Math.abs(value))}`;
}

function glowForStatus(status: PortfolioItem["status"]): GlowTier {
  if (status === "grade") {
    return "ultra";
  }
  if (status === "hold") {
    return "rare";
  }
  return "common";
}

export function PixelPortfolio({ items }: { items: PortfolioItem[] }) {
  const totalValue = items.reduce((sum, item) => sum + item.currentEstimatedValue, 0);
  const totalGainLoss = items.reduce((sum, item) => sum + item.unrealizedGainLoss, 0);
  const gainLossPositive = totalGainLoss >= 0;

  return (
    <section className="pixel-panel overflow-hidden">
      <div className="border-b border-fuchsia-500/30 p-4">
        <SectionHeader kicker="PIXEL PORTFOLIO" title="Mock collection ledger shaped for Supabase storage" />
        <div className="mt-4 flex flex-wrap gap-6">
          <div>
            <p className="pixel-kicker text-[10px]">Total value</p>
            <p className="mt-1 text-2xl font-black text-emerald-100">
              <StatValue value={totalValue} format="money" />
            </p>
          </div>
          <div>
            <p className="pixel-kicker text-[10px]">Unrealized G/L</p>
            <p className={gainLossPositive ? "mt-1 text-2xl font-black text-emerald-300" : "mt-1 text-2xl font-black text-fuchsia-300"}>
              {signedMoney(totalGainLoss)}
            </p>
          </div>
        </div>
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[980px] text-left text-xs">
          <thead className="bg-fuchsia-950/50 text-fuchsia-100">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Kind</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Acquisition</th>
              <th className="px-4 py-3">Current est.</th>
              <th className="px-4 py-3">Gain/loss</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Notes</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-white/10 hover:bg-emerald-400/5">
                <td className="px-4 py-3 font-bold text-slate-100">{item.itemName}</td>
                <td className="px-4 py-3 text-slate-300">{item.itemKind}</td>
                <td className="px-4 py-3 font-mono text-yellow-100">{item.quantity}</td>
                <td className="px-4 py-3 font-mono text-slate-200">{money(item.acquisitionCost)}</td>
                <td className="px-4 py-3 font-mono text-emerald-200">{money(item.currentEstimatedValue)}</td>
                <td className={item.unrealizedGainLoss >= 0 ? "px-4 py-3 font-mono text-emerald-200" : "px-4 py-3 font-mono text-fuchsia-200"}>
                  {signedMoney(item.unrealizedGainLoss)}
                </td>
                <td className="px-4 py-3"><span className="pixel-chip">{item.status.toUpperCase()}</span></td>
                <td className="px-4 py-3 text-slate-400">{item.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-4 md:hidden">
        <CardOrbitGrid>
          {items.map((item) => (
            <FloatingCard key={item.id} glow={glowForStatus(item.status)} ariaLabel={`${item.itemName} portfolio entry`}>
              <div className="flex h-full flex-col justify-between gap-2 p-4">
                <div>
                  <p className="font-bold text-slate-100">{item.itemName}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">{item.itemKind}</p>
                </div>
                <dl className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-400">Qty</dt>
                    <dd className="font-mono text-yellow-100">{item.quantity}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-400">Current est.</dt>
                    <dd className="font-mono text-emerald-200">
                      <Money value={item.currentEstimatedValue} />
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-400">Gain/loss</dt>
                    <dd className={item.unrealizedGainLoss >= 0 ? "font-mono text-emerald-200" : "font-mono text-fuchsia-200"}>
                      {signedMoney(item.unrealizedGainLoss)}
                    </dd>
                  </div>
                </dl>
                <div>
                  <span className="pixel-chip">{item.status.toUpperCase()}</span>
                </div>
              </div>
            </FloatingCard>
          ))}
        </CardOrbitGrid>
      </div>
    </section>
  );
}
