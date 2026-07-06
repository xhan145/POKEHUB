import { withProjectTag } from "@/lib/project-tag";
import type { CardIdentity, MarketSnapshot } from "@/types/pokehub";

const INGEST_TOKEN_HEADER = "x-pokehub-ingest-token";

export function requireIngestToken(
  request: Request
): { ok: true } | { ok: false; status: 401 | 503; error: string } {
  const expected = process.env.POKEHUB_INGEST_TOKEN;
  if (!expected) {
    return { ok: false, status: 503, error: "ingest token not configured" };
  }

  const provided = request.headers.get(INGEST_TOKEN_HEADER);
  if (!provided || provided !== expected) {
    return { ok: false, status: 401, error: "invalid ingest token" };
  }

  return { ok: true };
}

export function jsonError(status: number, error: string): Response {
  return Response.json({ ok: false, error }, { status });
}

export function cardToRow(card: CardIdentity): Record<string, unknown> {
  return withProjectTag({
    pokemon_tcg_id: card.pokemonTcgId,
    name: card.name,
    set_id: card.setId,
    set_name: card.setName,
    number: card.number,
    rarity: card.rarity ?? null,
    artist: card.artist ?? null,
    supertype: card.supertype ?? null,
    subtypes: card.subtypes ?? [],
    image_small: card.imageSmall ?? null,
    image_large: card.imageLarge ?? null,
    raw_json: card.rawJson ?? null,
    updated_at: new Date().toISOString()
  });
}

export function snapshotToRow(snap: MarketSnapshot): Record<string, unknown> {
  return withProjectTag({
    item_kind: snap.itemKind,
    item_ref: snap.itemRef,
    source: snap.source,
    observed_at: snap.observedAt,
    low: snap.low ?? null,
    mid: snap.mid ?? null,
    high: snap.high ?? null,
    market: snap.market ?? null,
    direct_low: snap.directLow ?? null,
    active_listings: snap.activeListings ?? null,
    sold_count: snap.soldCount ?? null,
    yearly_sales_volume: snap.yearlySalesVolume ?? null,
    confidence_score: snap.confidenceScore,
    raw_json: snap.rawJson ?? null
  });
}
