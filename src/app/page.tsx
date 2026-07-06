import { DashboardApp } from "@/components/dashboard/DashboardApp";
import { PixelShell } from "@/components/pixel/PixelShell";
import msrpSeed from "@/data/msrp-seed.json";
import { apiCardToLiveCard, mockToLiveCards, type LiveCard } from "@/lib/api-v1/card-mapper";
import { searchCardObjects } from "@/lib/api-v1/cards-repo";
import { getLiveOverview } from "@/lib/live-data";
import { getEnvReadiness, mockCards, mockPortfolio } from "@/lib/pokehub-data";
import type { MsrpProduct } from "@/types/pokehub";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = msrpSeed.products as MsrpProduct[];
  const live = await getLiveOverview();

  const cardsResult = await searchCardObjects({
    q: undefined,
    page: 1,
    pageSize: 24,
    orderBy: "default"
  });
  const liveCards: LiveCard[] = cardsResult.ok
    ? cardsResult.value.cards.map(apiCardToLiveCard)
    : mockToLiveCards(mockCards);
  const cardTotal = cardsResult.ok ? cardsResult.value.totalCount : mockCards.length;

  return (
    <PixelShell liveMode={Boolean(live)}>
      <DashboardApp
        products={products}
        liveCards={liveCards}
        cardTotal={cardTotal}
        portfolio={mockPortfolio}
        env={getEnvReadiness()}
        live={live}
      />
    </PixelShell>
  );
}
