import { z } from "zod";

import { POKEHUB_PROJECT_TAG, withProjectTag } from "../lib/project-tag";
import { createServiceSupabaseClient } from "../lib/supabase/server";

// The Pokemon TCG API returns explicit null (not just missing) for price fields
// that have no data, so every numeric price field must be nullish, not just optional.
const PriceSchema = z.object({
  low: z.number().nullish(),
  mid: z.number().nullish(),
  high: z.number().nullish(),
  market: z.number().nullish(),
  directLow: z.number().nullish()
});

const CardSchema = z.object({
  id: z.string(),
  name: z.string(),
  set: z.object({
    id: z.string(),
    name: z.string(),
    releaseDate: z.string().optional()
  }),
  number: z.string().optional(),
  rarity: z.string().optional(),
  artist: z.string().optional(),
  supertype: z.string().optional(),
  subtypes: z.array(z.string()).optional(),
  images: z
    .object({
      small: z.string().optional(),
      large: z.string().optional()
    })
    .optional(),
  tcgplayer: z
    .object({
      updatedAt: z.string().optional(),
      prices: z.record(PriceSchema).optional()
    })
    .optional(),
  cardmarket: z
    .object({
      updatedAt: z.string().optional(),
      prices: z.record(z.number().nullish()).optional()
    })
    .optional()
});

const ApiResponseSchema = z.object({
  data: z.array(CardSchema),
  page: z.number(),
  pageSize: z.number(),
  count: z.number(),
  totalCount: z.number()
});

type PokemonTcgCard = z.infer<typeof CardSchema>;

function getArgNumber(name: string, fallback: number) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  if (!match) return fallback;
  const value = Number(match.slice(prefix.length));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getArgString(name: string, fallback: string) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toCardRow(card: PokemonTcgCard) {
  return withProjectTag({
    pokemon_tcg_id: card.id,
    name: card.name,
    set_id: card.set.id,
    set_name: card.set.name,
    number: card.number ?? null,
    rarity: card.rarity ?? null,
    artist: card.artist ?? null,
    supertype: card.supertype ?? null,
    subtypes: card.subtypes ?? [],
    image_small: card.images?.small ?? null,
    image_large: card.images?.large ?? null,
    raw_json: card,
    updated_at: new Date().toISOString()
  });
}

function firstTcgplayerPrice(card: PokemonTcgCard) {
  const priceSets = Object.values(card.tcgplayer?.prices ?? {});
  return priceSets.find((price) => price.market || price.mid || price.low);
}

function toSnapshotRows(card: PokemonTcgCard) {
  const observedAt = new Date().toISOString();
  const snapshots: Record<string, unknown>[] = [];
  const tcgplayerPrice = firstTcgplayerPrice(card);

  if (tcgplayerPrice) {
    snapshots.push(
      withProjectTag({
        item_kind: "card",
        item_ref: card.id,
        source: "tcgplayer",
        observed_at: observedAt,
        low: tcgplayerPrice.low ?? null,
        mid: tcgplayerPrice.mid ?? null,
        high: tcgplayerPrice.high ?? null,
        market: tcgplayerPrice.market ?? null,
        direct_low: tcgplayerPrice.directLow ?? null,
        confidence_score: 72,
        raw_json: card.tcgplayer ?? null
      })
    );
  }

  if (card.cardmarket?.prices) {
    snapshots.push(
      withProjectTag({
        item_kind: "card",
        item_ref: card.id,
        source: "cardmarket",
        observed_at: observedAt,
        low: card.cardmarket.prices.lowPrice ?? null,
        mid: card.cardmarket.prices.averageSellPrice ?? null,
        high: null,
        market: card.cardmarket.prices.trendPrice ?? null,
        direct_low: null,
        confidence_score: 68,
        raw_json: card.cardmarket
      })
    );
  }

  return snapshots;
}

async function fetchCardsPage(page: number, pageSize: number, query: string) {
  const apiKey = process.env.POKEMON_TCG_API_KEY;
  const headers: Record<string, string> = {};
  if (apiKey) headers["X-Api-Key"] = apiKey;

  const url = new URL("https://api.pokemontcg.io/v2/cards");
  url.searchParams.set("page", String(page));
  url.searchParams.set("pageSize", String(Math.min(pageSize, 250)));
  url.searchParams.set("orderBy", "-set.releaseDate");
  url.searchParams.set(
    "select",
    "id,name,set,number,rarity,artist,supertype,subtypes,images,tcgplayer,cardmarket"
  );
  if (query) url.searchParams.set("q", query);

  const maxRetries = getArgNumber("maxRetries", 5);
  let attempt = 0;
  // Retry transient rate-limit (429), server (5xx), and 404 responses with exponential
  // backoff so a long keyless full-catalog crawl is not aborted by a single blip. A 404 on
  // an in-range page is always transient here: at end-of-data the API returns 200 with an
  // empty page (count 0), never 404 — so retrying a 404 is safe and never masks real absence.
  for (;;) {
    const response = await fetch(url, { headers });
    if (response.ok) {
      return ApiResponseSchema.parse(await response.json());
    }

    const retryable = response.status === 404 || response.status === 429 || response.status >= 500;
    if (!retryable || attempt >= maxRetries) {
      throw new Error(`Pokemon TCG API failed: ${response.status} ${response.statusText}`);
    }

    attempt += 1;
    const backoffMs = Math.min(30000, 1000 * 2 ** (attempt - 1));
    console.log(`Page ${page}: HTTP ${response.status}, retry ${attempt}/${maxRetries} after ${backoffMs}ms.`);
    await sleep(backoffMs);
  }
}

export async function ingestPokemonTcgCards() {
  const supabase = createServiceSupabaseClient();
  const pageSize = getArgNumber("pageSize", 50);
  const maxPages = getArgNumber("maxPages", 1);
  const query = getArgString("q", "");
  const delayMs = getArgNumber("delayMs", 0);

  console.log(
    `Pokemon TCG API ingest starting for project_tag=${POKEHUB_PROJECT_TAG}; pageSize=${pageSize}; maxPages=${maxPages}.`
  );
  console.log("Compliant source mode: using Pokemon TCG API only; permission-only sites are not bulk scraped.");

  let upsertedCards = 0;
  let insertedSnapshots = 0;

  for (let page = 1; page <= maxPages; page += 1) {
    const payload = await fetchCardsPage(page, pageSize, query);
    const cardRows = payload.data.map(toCardRow);
    const snapshotRows = payload.data.flatMap(toSnapshotRows);

    if (!supabase) {
      console.log(
        `Fetched page ${page}/${Math.ceil(payload.totalCount / payload.pageSize)} with ${payload.count} cards. Missing Supabase credentials, so no rows were written.`
      );
    } else {
      const cardResult = await supabase
        .from("cards")
        .upsert(cardRows, { onConflict: "project_tag,pokemon_tcg_id" });
      if (cardResult.error) throw new Error(`Card upsert failed: ${cardResult.error.message}`);

      if (snapshotRows.length > 0) {
        const snapshotResult = await supabase.from("market_snapshots").insert(snapshotRows);
        if (snapshotResult.error) {
          throw new Error(`Market snapshot insert failed: ${snapshotResult.error.message}`);
        }
      }
    }

    upsertedCards += cardRows.length;
    insertedSnapshots += snapshotRows.length;
    console.log(`Page ${page}: processed ${cardRows.length} cards and ${snapshotRows.length} price snapshots.`);

    if (payload.page * payload.pageSize >= payload.totalCount || payload.count === 0) {
      break;
    }

    if (delayMs > 0) {
      await sleep(delayMs);
    }
  }

  console.log(`Pokemon TCG ingest complete: ${upsertedCards} cards, ${insertedSnapshots} snapshots.`);
  return { upsertedCards, insertedSnapshots };
}

async function main() {
  await ingestPokemonTcgCards();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
