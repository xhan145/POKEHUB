import type { MsrpProduct } from "@/types/pokehub";

export function MarketArcade({ products }: { products: MsrpProduct[] }) {
  const totalMsrp = products.reduce((sum, item) => sum + item.msrp, 0);
  const avgMsrp = totalMsrp / Math.max(products.length, 1);

  const stats = [
    { label: "Tracked sealed products", value: products.length.toString() },
    { label: "Total MSRP basis", value: `$${totalMsrp.toFixed(2)}` },
    { label: "Average MSRP", value: `$${avgMsrp.toFixed(2)}` },
    { label: "Data confidence", value: "Seeded" }
  ];

  return (
    <section className="grid gap-4 md:grid-cols-4">
      {stats.map((stat) => (
        <article key={stat.label} className="pixel-panel p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-fuchsia-300">{stat.label}</p>
          <p className="mt-2 font-mono text-2xl text-emerald-200">{stat.value}</p>
        </article>
      ))}
    </section>
  );
}
