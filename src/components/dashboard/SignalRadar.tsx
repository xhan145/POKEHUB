const signals = [
  {
    title: "Above MSRP Delta",
    body: "Compare sealed product MSRP against current low, market, and sold comp medians."
  },
  {
    title: "Liquidity",
    body: "Score sold count, active listing count, days since last sale, and bid depth."
  },
  {
    title: "Grading Arbitrage",
    body: "Compare raw value plus grading costs against PSA/CGC/BGS value bands."
  },
  {
    title: "Noise Filter",
    body: "Flag thin comps, outlier listings, fake-looking sales, and stale source snapshots."
  }
];

export function SignalRadar() {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      {signals.map((signal) => (
        <article key={signal.title} className="pixel-panel p-5">
          <h3 className="font-bold text-yellow-200">{signal.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">{signal.body}</p>
        </article>
      ))}
    </section>
  );
}
