import {
  getAnonClient,
  searchCards,
  SNAPSHOT_COLUMNS,
  toCardObject,
  type SnapshotRow
} from "@/lib/api-v1/cards-repo";
import { parseCardsParams } from "@/lib/api-v1/query";
import { errorResponse, listResponse } from "@/lib/api-v1/respond";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const params = parseCardsParams(new URL(request.url).searchParams);

  const result = await searchCards(params);
  if (!result.ok) return errorResponse(503, "catalog database unavailable");
  const { rows, totalCount } = result.value;

  const latestByCard = new Map<string, SnapshotRow>();
  const ids = rows
    .map((row) => row.pokemon_tcg_id)
    .filter((id): id is string => id !== null);

  if (ids.length > 0) {
    const client = getAnonClient();
    if (!client) return errorResponse(503, "catalog database unavailable");

    const { data, error } = await client
      .from("poke_market_snapshots")
      .select(SNAPSHOT_COLUMNS)
      .eq("item_kind", "card")
      .in("item_ref", ids)
      .order("observed_at", { ascending: false });
    if (error) return errorResponse(503, "catalog database unavailable");

    for (const snapshot of (data ?? []) as unknown as SnapshotRow[]) {
      if (!latestByCard.has(snapshot.item_ref)) {
        latestByCard.set(snapshot.item_ref, snapshot);
      }
    }
  }

  const cards = rows.map((row) =>
    toCardObject(row, row.pokemon_tcg_id ? (latestByCard.get(row.pokemon_tcg_id) ?? null) : null)
  );
  return listResponse(cards, params.page, params.pageSize, totalCount);
}
