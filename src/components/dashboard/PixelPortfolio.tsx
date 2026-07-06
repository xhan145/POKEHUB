import type { PortfolioItem } from "@/types/pokehub";

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function PixelPortfolio({ items }: { items: PortfolioItem[] }) {
  return (
    <section className="pixel-panel overflow-hidden">
      <div className="border-b border-fuchsia-500/30 p-4">
        <p className="pixel-kicker">PIXEL PORTFOLIO</p>
        <h2 className="mt-2 text-xl font-black text-emerald-100">Mock collection ledger shaped for Supabase storage</h2>
      </div>
      <div className="overflow-x-auto">
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
                  {money(item.unrealizedGainLoss)}
                </td>
                <td className="px-4 py-3"><span className="pixel-chip">{item.status.toUpperCase()}</span></td>
                <td className="px-4 py-3 text-slate-400">{item.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
