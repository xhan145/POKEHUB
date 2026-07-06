import { z } from "zod";

import { POKEHUB_PROJECT_TAG } from "@/lib/project-tag";
import type { CardIdentity, MarketSnapshot } from "@/types/pokehub";

import type { SourceAdapter, SourceFetchInput, SourceFetchResult } from "./types";

const CARDS_URL = "https://api.pokemontcg.io/v2/cards";

const PriceSchema = z.object({
  low: z.number().optional(),
  mid: z.number().optional(),
  high: z.number().optional(),
  market: z.number().optional(),
  directLow: z.number().optional()
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
      prices: z.record(z.number()).optional()
    })
    .optional()
});

const ApiResponseSchema = z.object({
  data: z.array(CardSchema)
});

type PokemonTcgCard = z.infer<typeof CardSchema>;

function firstTcgplayerPrice(card: PokemonTcgCard) {
  const priceSets = Object.values(card.tcgplayer?.prices ?? {});
  return priceSets.find((price) => price.market || price.mid || price.low);
}

function toCardIdentity(card: PokemonTcgCard): CardIdentity {
  return {
    projectTag: POKEHUB_PROJECT_TAG,
    pokemonTcgId: card.id,
    name: card.name,
    setId: card.set.id,
    setName: card.set.name,
    number: card.number ?? "",
    rarity: card.rarity,
    artist: card.artist,
    supertype: card.supertype,
    subtypes: card.subtypes,
    imageSmall: card.images?.small,
    imageLarge: card.images?.large,
    rawJson: card
  };
}

function toSnapshots(card: PokemonTcgCard, observedAt: string): MarketSnapshot[] {
  const snapshots: MarketSnapshot[] = [];
  const tcgplayerPrice = firstTcgplayerPrice(card);

  if (tcgplayerPrice) {
    snapshots.push({
      projectTag: POKEHUB_PROJECT_TAG,
      itemKind: "card",
      itemRef: card.id,
      source: "pokemon_tcg_api",
      observedAt,
      low: tcgplayerPrice.low,
      mid: tcgplayerPrice.mid,
      high: tcgplayerPrice.high,
      market: tcgplayerPrice.market,
      directLow: tcgplayerPrice.directLow,
      confidenceScore: 72,
      rawJson: card.tcgplayer
    });
  }

  if (card.cardmarket?.prices) {
    snapshots.push({
      projectTag: POKEHUB_PROJECT_TAG,
      itemKind: "card",
      itemRef: card.id,
      source: "pokemon_tcg_api",
      observedAt,
      low: card.cardmarket.prices.lowPrice,
      mid: card.cardmarket.prices.averageSellPrice,
      market: card.cardmarket.prices.trendPrice,
      confidenceScore: 68,
      rawJson: card.cardmarket
    });
  }

  return snapshots;
}

export const pokemonTcgAdapter: SourceAdapter = {
  id: "pokemon-tcg",
  label: "Pokemon TCG API",
  kind: "api",
  enabled: true,
  requiresSecret: false,
  async checkCredentials() {
    const hasCredentials = Boolean(process.env.POKEMON_TCG_API_KEY);
    return {
      sourceId: "pokemon-tcg",
      hasCredentials,
      required: false,
      detail: hasCredentials
        ? "POKEMON_TCG_API_KEY is set; higher rate limits apply."
        : "Keyless mode: shared public rate limits apply."
    };
  },
  async fetchSnapshot(input: SourceFetchInput): Promise<SourceFetchResult> {
    try {
      const url = new URL(CARDS_URL);
      url.searchParams.set("pageSize", String(Math.min(input.limit ?? 20, 50)));
      if (input.query) url.searchParams.set("q", input.query);

      const headers: Record<string, string> = {};
      const apiKey = process.env.POKEMON_TCG_API_KEY;
      if (apiKey) headers["X-Api-Key"] = apiKey;

      const response = await fetch(url, { headers });
      if (!response.ok) {
        return {
          status: "error",
          message: `Pokemon TCG API failed: ${response.status} ${response.statusText}`
        };
      }

      const payload = ApiResponseSchema.parse(await response.json());
      const observedAt = new Date().toISOString();

      return {
        status: "ok",
        snapshots: payload.data.flatMap((card) => toSnapshots(card, observedAt)),
        cards: payload.data.map(toCardIdentity)
      };
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }
};
