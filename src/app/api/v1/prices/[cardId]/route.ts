import { getCardById, getSnapshotsForCard, toSnapshotSummary } from "@/lib/api-v1/cards-repo";
import { errorResponse, listResponse } from "@/lib/api-v1/respond";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ cardId: string }> }) {
  const { cardId } = await context.params;

  const card = await getCardById(cardId);
  if (!card.ok) return errorResponse(503, "catalog database unavailable");
  if (card.value === null) return errorResponse(404, "Card not found");

  const snapshots = await getSnapshotsForCard(cardId);
  if (!snapshots.ok) return errorResponse(503, "catalog database unavailable");

  const data = snapshots.value.map(toSnapshotSummary);
  return listResponse(data, 1, data.length || 1, data.length);
}
