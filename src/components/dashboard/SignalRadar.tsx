const signals = [
  ["Under-MSRP sealed opportunities", "Mini tins and low-entry boxes need live sold velocity before buy signals activate.", "WATCH"],
  ["Above-MSRP movers", "UPC and ETB seed models show early premium pressure, pending marketplace confirmation.", "MOVE"],
  ["High spread / low liquidity traps", "Listings without sold comps stay quarantined until eBay or PriceCharting confirms demand.", "RISK"],
  ["Stale source alerts", "Any snapshot older than seven days should decay confidence automatically.", "STALE"],
  ["Grade arbitrage candidates", "Raw cards with strong centering and clean surfaces can move to the grading queue.", "GRADE"],
  ["Character hype spikes", "Charizard, Pikachu, Umbreon, Mew, and Greninja get separate demand flags.", "HYPE"],
  ["Low-population grails", "PSA/CGC/BGS population sources are permission-gated and stored as snapshots.", "POP"],
  ["Fast-velocity commons/uncommons", "Tournament playability can make cheap cards surprisingly liquid.", "PLAY"]
];

export function SignalRadar() {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {signals.map(([title, body, tag]) => (
        <article key={title} className="pixel-panel p-5 transition hover:-translate-y-1 hover:translate-x-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-black text-yellow-100">{title}</h3>
            <span className="pixel-chip">{tag}</span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-300">{body}</p>
        </article>
      ))}
    </section>
  );
}
