import { DashboardApp } from "@/components/dashboard/DashboardApp";
import { PixelShell } from "@/components/pixel/PixelShell";
import msrpSeed from "@/data/msrp-seed.json";
import { getLiveOverview } from "@/lib/live-data";
import { getEnvReadiness, mockCards, mockPortfolio } from "@/lib/pokehub-data";
import type { MsrpProduct } from "@/types/pokehub";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = msrpSeed.products as MsrpProduct[];
  const live = await getLiveOverview();

  return (
    <PixelShell liveMode={Boolean(live)}>
      <DashboardApp
        products={products}
        cards={mockCards}
        portfolio={mockPortfolio}
        env={getEnvReadiness()}
        live={live}
      />
    </PixelShell>
  );
}
