import { getCardById, getTrustForCard } from "@/lib/api-v1/cards-repo";
import { CACHE_OK, errorResponse, singleResponse } from "@/lib/api-v1/respond";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ cardId: string }> }) {
  const { cardId } = await context.params;

  const card = await getCardById(cardId);
  if (!card.ok) return errorResponse(503, "catalog database unavailable");
  if (card.value === null) return errorResponse(404, "Card not found");

  const trust = await getTrustForCard(cardId);
  if (!trust.ok) return errorResponse(503, "catalog database unavailable");

  return singleResponse({ cardId, ...trust.value }, CACHE_OK);
}
