import type { MsrpProduct } from "@/types/pokehub";

function mockSignal(product: MsrpProduct) {
  if (product.msrp >= 100) return "GRAIL WATCH";
  if (product.name.includes("Elite Trainer")) return "CORE SEALED";
  if (product.name.includes("Mini Tin")) return "LOW ENTRY";
  if (product.name.includes("Battle Deck")) return "PLAYABILITY";
  return "TRACK";
}

export function SealedDex({ products }: { products: MsrpProduct[] }) {
  return (
    <section className="pixel-panel overflow-hidden">
      <div className="border-b border-fuchsia-500/30 p-4">
        <h2 className="font-black tracking-[0.18em] text-emerald-200">SEALED PRODUCT DEX</h2>
        <p className="mt-2 text-xs text-slate-400">
          MSRP seed table. Connect live sources to populate market, spread, velocity, and confidence.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[840px] text-left text-xs">
          <thead className="bg-fuchsia-950/40 text-fuchsia-200">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">MSRP</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Signal</th>
              <th className="px-4 py-3">Next Data</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.name} className="border-t border-white/10 hover:bg-emerald-400/5">
                <td className="px-4 py-3 font-semibold text-slate-100">{product.name}</td>
                <td className="px-4 py-3 font-mono text-emerald-200">${product.msrp.toFixed(2)}</td>
                <td className="px-4 py-3 text-slate-300">{product.productType}</td>
                <td className="px-4 py-3">
                  <span className="pixel-chip">{mockSignal(product)}</span>
                </td>
                <td className="px-4 py-3 text-slate-400">market, comps, velocity, spread</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
