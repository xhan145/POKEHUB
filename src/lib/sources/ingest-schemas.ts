import { z } from "zod";

import type { IngestionRun } from "./types";

export type MsrpIngestPayload = {
  products?: { name: string; msrp: number; productType: string; currency?: "USD" }[];
  csv?: string;
};

export const msrpIngestSchema: z.ZodType<MsrpIngestPayload> = z.object({
  products: z
    .array(
      z.object({
        name: z.string().min(1),
        msrp: z.number().nonnegative(),
        productType: z.string().min(1),
        currency: z.literal("USD").optional()
      })
    )
    .optional(),
  csv: z.string().optional()
});

export type PokemonTcgIngestPayload = { query?: string; limit?: number };

export const pokemonTcgIngestSchema: z.ZodType<PokemonTcgIngestPayload> = z.object({
  query: z.string().min(1).optional(),
  limit: z.number().int().positive().max(50).optional()
});

export const marketSnapshotIngestSchema = z.object({
  itemKind: z.enum(["card", "sealed_product"]),
  itemRef: z.string().min(1),
  source: z.enum([
    "manual_seed",
    "pokemon_tcg_api",
    "tcgdex",
    "pricecharting",
    "ebay_browse",
    "psa_public_api",
    "manual"
  ]),
  observedAt: z.string().datetime({ offset: true }).optional(),
  low: z.number().nonnegative().optional(),
  mid: z.number().nonnegative().optional(),
  high: z.number().nonnegative().optional(),
  market: z.number().nonnegative().optional(),
  activeListings: z.number().int().nonnegative().optional(),
  soldCount: z.number().int().nonnegative().optional(),
  confidenceScore: z.number().min(0).max(100).optional()
});

export type MarketSnapshotIngestPayload = z.infer<typeof marketSnapshotIngestSchema>;

export type ApiEnvelope<T> = { ok: true; data: T; run?: IngestionRun } | { ok: false; error: string };
