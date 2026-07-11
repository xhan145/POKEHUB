import { getAnonClient, type RepoResult } from "@/lib/api-v1/cards-repo";
import { computeTrust, type TrustSnapshotInput } from "@/lib/api-v1/trust-engine";
import type { ConstellationCard, TypeSummary } from "@/lib/constellation/card-source";

export type ConstellationPayload = {
  total: number;
  types: TypeSummary[];
  cards: ConstellationCard[];
};

type ConstellationRow = {
  id: string | null;
  name: string | null;
  rarity: string | null;
  set_name: string | null;
  type: string | null;
  market_tcgplayer: number | null;
  market_cardmarket: number | null;
  newest_observed: string | null;
};

const CONSTELLATION_COLUMNS =
  "id, name, rarity, set_name, type, market_tcgplayer, market_cardmarket, newest_observed";

const CLIENT_UNAVAILABLE = "supabase anon client is not configured";

// Supabase caps a single select at 1000 rows, so page through the whole view.
const PAGE_SIZE = 1000;

function isFinitePrice(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export async function getConstellation(): Promise<RepoResult<ConstellationPayload>> {
  const client = getAnonClient();
  if (!client) return { ok: false, error: CLIENT_UNAVAILABLE };

  const rows: ConstellationRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from("poke_card_constellation")
      .select(CONSTELLATION_COLUMNS)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) return { ok: false, error: error.message };

    const page = (data ?? []) as unknown as ConstellationRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  const now = Date.now();
  const cards: ConstellationCard[] = [];
  const typeCounts = new Map<string, number>();

  for (const row of rows) {
    if (!row.id) continue;

    const observedAt = row.newest_observed ?? new Date(0).toISOString();
    const trustSnapshots: TrustSnapshotInput[] = [
      { source: "tcgplayer", market: row.market_tcgplayer, observedAt },
      { source: "cardmarket", market: row.market_cardmarket, observedAt }
    ].filter((snapshot) => isFinitePrice(snapshot.market));

    const tier = computeTrust(trustSnapshots, now).tier;
    const price = isFinitePrice(row.market_tcgplayer)
      ? row.market_tcgplayer
      : isFinitePrice(row.market_cardmarket)
        ? row.market_cardmarket
        : 0;
    const type = row.type ?? "Other";

    cards.push({
      id: row.id,
      name: row.name ?? row.id,
      type,
      price,
      tier,
      rarity: row.rarity ?? "",
      set: row.set_name ?? ""
    });

    typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
  }

  const types: TypeSummary[] = [...typeCounts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  return { ok: true, value: { total: cards.length, types, cards } };
}
