import { DashboardApp } from "@/components/dashboard/DashboardApp";
import { PixelShell } from "@/components/pixel/PixelShell";
import msrpSeed from "@/data/msrp-seed.json";
import { getEnvReadiness, mockCards, mockPortfolio } from "@/lib/pokehub-data";
import type { MsrpProduct } from "@/types/pokehub";

export default function HomePage() {
  const products = msrpSeed.products as MsrpProduct[];

  return (
    <PixelShell>
      <DashboardApp products={products} cards={mockCards} portfolio={mockPortfolio} env={getEnvReadiness()} />
    </PixelShell>
  );
}
