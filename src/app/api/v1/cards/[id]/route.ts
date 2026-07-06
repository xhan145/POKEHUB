import {
  getCardById,
  getSnapshotsForCard,
  getTrustForCard,
  toCardObject
} from "@/lib/api-v1/cards-repo";
import { errorResponse, singleResponse } from "@/lib/api-v1/respond";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const card = await getCardById(id);
  if (!card.ok) return errorResponse(503, "catalog database unavailable");
  if (card.value === null) return errorResponse(404, "Card not found");

  const snapshots = await getSnapshotsForCard(id, 1);
  if (!snapshots.ok) return errorResponse(503, "catalog database unavailable");

  const trust = await getTrustForCard(id);
  if (!trust.ok) return errorResponse(503, "catalog database unavailable");

  return singleResponse(toCardObject(card.value, snapshots.value[0] ?? null, trust.value));
}
