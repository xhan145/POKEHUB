import type { SupabaseClient } from "@supabase/supabase-js";

import { parseCardQuery, type CardsParams } from "@/lib/api-v1/query";
import { computeTrust, type TrustResult, type TrustSnapshotInput } from "@/lib/api-v1/trust-engine";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export type RepoResult<T> = { ok: true; value: T } | { ok: false; error: string };

export type CardRow = {
  pokemon_tcg_id: string | null;
  name: string;
  set_id: string | null;
  set_name: string | null;
  number: string | null;
  rarity: string | null;
  artist: string | null;
  supertype: string | null;
  subtypes: string[] | null;
  image_small: string | null;
  image_large: string | null;
  raw_json: Record<string, unknown> | null;
};

export type SetRow = {
  id: string;
  name: string | null;
  total: number;
};

export type SnapshotRow = {
  item_ref: string;
  source: string;
  observed_at: string;
  low: number | null;
  mid: number | null;
  high: number | null;
  market: number | null;
  direct_low: number | null;
  confidence_score: number | null;
};

export type TrustSnapshotRow = {
  item_ref: string;
  source: string;
  market: number | null;
  observed_at: string;
};

const CARD_COLUMNS =
  "pokemon_tcg_id, name, set_id, set_name, number, rarity, artist, supertype, subtypes, image_small, image_large, raw_json";

export const SNAPSHOT_COLUMNS =
  "item_ref, source, observed_at, low, mid, high, market, direct_low, confidence_score";

export const TRUST_SNAPSHOT_COLUMNS = "item_ref, source, market, observed_at";

const CLIENT_UNAVAILABLE = "supabase anon client is not configured";

export function getAnonClient(): SupabaseClient | null {
  return createBrowserSupabaseClient();
}

export async function searchCards(
  params: CardsParams
): Promise<RepoResult<{ rows: CardRow[]; totalCount: number }>> {
  const client = getAnonClient();
  if (!client) return { ok: false, error: CLIENT_UNAVAILABLE };

  let query = client.from("poke_cards").select(CARD_COLUMNS, { count: "exact" });

  for (const filter of params.q ? parseCardQuery(params.q) : []) {
    if (filter.kind === "name-contains") {
      query = query.ilike("name", `%${filter.value}%`);
    } else if (filter.op === "eq") {
      // Case-insensitive exact match: ilike with no wildcards.
      query = query.ilike(filter.column, filter.value);
    } else {
      query = query.ilike(filter.column, `%${filter.value}%`);
    }
  }

  switch (params.orderBy) {
    case "name":
      query = query.order("name", { ascending: true });
      break;
    case "-name":
      query = query.order("name", { ascending: false });
      break;
    case "number":
      query = query.order("number", { ascending: true });
      break;
    case "-number":
      query = query.order("number", { ascending: false });
      break;
    case "set.name":
      query = query.order("set_name", { ascending: true });
      break;
    case "-set.name":
      query = query.order("set_name", { ascending: false });
      break;
    default:
      query = query.order("set_name", { ascending: true }).order("number", { ascending: true });
  }

  const from = (params.page - 1) * params.pageSize;
  const { data, error, count } = await query.range(from, from + params.pageSize - 1);
  if (error) return { ok: false, error: error.message };
  return { ok: true, value: { rows: (data ?? []) as unknown as CardRow[], totalCount: count ?? 0 } };
}

export async function searchCardObjects(
  params: CardsParams
): Promise<RepoResult<{ cards: Record<string, unknown>[]; totalCount: number }>> {
  const result = await searchCards(params);
  if (!result.ok) return result;
  const { rows, totalCount } = result.value;

  const latestByCard = new Map<string, SnapshotRow>();
  const ids = rows
    .map((row) => row.pokemon_tcg_id)
    .filter((id): id is string => id !== null);

  if (ids.length > 0) {
    const client = getAnonClient();
    if (!client) return { ok: false, error: CLIENT_UNAVAILABLE };

    const { data, error } = await client
      .from("poke_market_snapshots")
      .select(SNAPSHOT_COLUMNS)
      .eq("item_kind", "card")
      .in("item_ref", ids)
      .order("observed_at", { ascending: false });
    if (error) return { ok: false, error: error.message };

    for (const snapshot of (data ?? []) as unknown as SnapshotRow[]) {
      if (!latestByCard.has(snapshot.item_ref)) {
        latestByCard.set(snapshot.item_ref, snapshot);
      }
    }
  }

  const trustResult = await getTrustForCards(ids);
  if (!trustResult.ok) return trustResult;
  const trustByCard = trustResult.value;

  const cards = rows.map((row) =>
    toCardObject(
      row,
      row.pokemon_tcg_id ? (latestByCard.get(row.pokemon_tcg_id) ?? null) : null,
      row.pokemon_tcg_id ? (trustByCard[row.pokemon_tcg_id] ?? null) : null
    )
  );
  return { ok: true, value: { cards, totalCount } };
}

export async function getCardById(id: string): Promise<RepoResult<CardRow | null>> {
  const client = getAnonClient();
  if (!client) return { ok: false, error: CLIENT_UNAVAILABLE };

  const { data, error } = await client
    .from("poke_cards")
    .select(CARD_COLUMNS)
    .eq("pokemon_tcg_id", id)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  return { ok: true, value: (data as unknown as CardRow | null) ?? null };
}

export async function listSets(
  page: number,
  pageSize: number
): Promise<RepoResult<{ rows: SetRow[]; totalCount: number }>> {
  const client = getAnonClient();
  if (!client) return { ok: false, error: CLIENT_UNAVAILABLE };

  const from = (page - 1) * pageSize;
  const { data, error, count } = await client
    .from("poke_sets")
    .select("id, name, total", { count: "exact" })
    .order("id", { ascending: true })
    .range(from, from + pageSize - 1);
  if (error) return { ok: false, error: error.message };
  return { ok: true, value: { rows: (data ?? []) as unknown as SetRow[], totalCount: count ?? 0 } };
}

export async function getSetById(id: string): Promise<RepoResult<SetRow | null>> {
  const client = getAnonClient();
  if (!client) return { ok: false, error: CLIENT_UNAVAILABLE };

  const { data, error } = await client
    .from("poke_sets")
    .select("id, name, total")
    .eq("id", id)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  return { ok: true, value: (data as unknown as SetRow | null) ?? null };
}

export async function getSnapshotsForCard(
  cardId: string,
  limit?: number
): Promise<RepoResult<SnapshotRow[]>> {
  const client = getAnonClient();
  if (!client) return { ok: false, error: CLIENT_UNAVAILABLE };

  const { data, error } = await client
    .from("poke_market_snapshots")
    .select(SNAPSHOT_COLUMNS)
    .eq("item_kind", "card")
    .eq("item_ref", cardId)
    .order("observed_at", { ascending: false })
    .limit(limit ?? 100);
  if (error) return { ok: false, error: error.message };
  return { ok: true, value: (data ?? []) as unknown as SnapshotRow[] };
}

export async function getTrustForCards(
  cardIds: string[]
): Promise<RepoResult<Record<string, TrustResult>>> {
  if (cardIds.length === 0) return { ok: true, value: {} };

  const client = getAnonClient();
  if (!client) return { ok: false, error: CLIENT_UNAVAILABLE };

  const { data, error } = await client
    .from("poke_market_snapshots")
    .select(TRUST_SNAPSHOT_COLUMNS)
    .eq("item_kind", "card")
    .in("item_ref", cardIds);
  if (error) return { ok: false, error: error.message };

  const snapshotsByCard = new Map<string, TrustSnapshotInput[]>();
  for (const row of (data ?? []) as unknown as TrustSnapshotRow[]) {
    const list = snapshotsByCard.get(row.item_ref) ?? [];
    list.push({ source: row.source, market: row.market, observedAt: row.observed_at });
    snapshotsByCard.set(row.item_ref, list);
  }

  const now = Date.now();
  const value: Record<string, TrustResult> = {};
  for (const cardId of cardIds) {
    value[cardId] = computeTrust(snapshotsByCard.get(cardId) ?? [], now);
  }
  return { ok: true, value };
}

export async function getTrustForCard(cardId: string): Promise<RepoResult<TrustResult>> {
  const result = await getTrustForCards([cardId]);
  if (!result.ok) return result;
  return { ok: true, value: result.value[cardId] ?? computeTrust([], Date.now()) };
}

export async function getHealth(): Promise<
  RepoResult<{ cards: number; snapshots: number; lastIngest: string | null }>
> {
  const client = getAnonClient();
  if (!client) return { ok: false, error: CLIENT_UNAVAILABLE };

  const [cardsRes, snapshotsRes, ingestRes] = await Promise.all([
    client.from("poke_cards").select("*", { count: "exact", head: true }),
    client.from("poke_market_snapshots").select("*", { count: "exact", head: true }),
    client
      .from("poke_ingestion_runs")
      .select("started_at")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);
  if (cardsRes.error) return { ok: false, error: cardsRes.error.message };
  if (snapshotsRes.error) return { ok: false, error: snapshotsRes.error.message };

  const lastIngest = ingestRes.error
    ? null
    : ((ingestRes.data as { started_at: string } | null)?.started_at ?? null);
  return {
    ok: true,
    value: { cards: cardsRes.count ?? 0, snapshots: snapshotsRes.count ?? 0, lastIngest }
  };
}

export function toSnapshotSummary(row: SnapshotRow): Record<string, unknown> {
  return {
    source: row.source,
    observedAt: row.observed_at,
    low: row.low,
    mid: row.mid,
    high: row.high,
    market: row.market,
    directLow: row.direct_low,
    confidenceScore: row.confidence_score
  };
}

export function toCardObject(
  row: CardRow,
  lastSnapshot: SnapshotRow | null,
  trust: TrustResult | null = null
): Record<string, unknown> {
  const base: Record<string, unknown> =
    row.raw_json !== null && typeof row.raw_json === "object"
      ? row.raw_json
      : {
          id: row.pokemon_tcg_id,
          name: row.name,
          set: { id: row.set_id, name: row.set_name },
          number: row.number,
          rarity: row.rarity,
          artist: row.artist,
          supertype: row.supertype,
          subtypes: row.subtypes,
          images: { small: row.image_small, large: row.image_large }
        };
  return {
    ...base,
    pokehub: { lastSnapshot: lastSnapshot ? toSnapshotSummary(lastSnapshot) : null, trust }
  };
}
