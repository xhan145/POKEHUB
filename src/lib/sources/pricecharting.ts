import { POKEHUB_PROJECT_TAG } from "@/lib/project-tag";
import type { MarketSnapshot } from "@/types/pokehub";

import { createRateLimiter } from "./throttle";
import type { SourceAdapter, SourceFetchInput, SourceFetchResult } from "./types";

const PRODUCTS_URL = "https://www.pricecharting.com/api/products";
const CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_QUERY = "pokemon booster box";

const limiter = createRateLimiter(1000);
const cache = new Map<string, { expiresAt: number; result: SourceFetchResult }>();

type PriceChartingProduct = {
  id?: string;
  "product-name"?: string;
  "console-name"?: string;
  "loose-price"?: number;
  "cib-price"?: number;
  "new-price"?: number;
};

function centsToDollars(cents?: number) {
  return typeof cents === "number" && Number.isFinite(cents) ? cents / 100 : undefined;
}

function toSnapshot(product: PriceChartingProduct, observedAt: string): MarketSnapshot {
  return {
    projectTag: POKEHUB_PROJECT_TAG,
    itemKind: "card",
    itemRef: product["product-name"] ?? product.id ?? "unknown-pricecharting-product",
    source: "pricecharting",
    observedAt,
    low: centsToDollars(product["loose-price"]),
    mid: centsToDollars(product["cib-price"]),
    high: centsToDollars(product["new-price"]),
    confidenceScore: 60,
    rawJson: product
  };
}

export const priceChartingAdapter: SourceAdapter = {
  id: "pricecharting",
  label: "PriceCharting API",
  kind: "api",
  get enabled() {
    return Boolean(process.env.PRICECHARTING_TOKEN);
  },
  requiresSecret: true,
  rateLimitPerMinute: 60,
  async checkCredentials() {
    const hasCredentials = Boolean(process.env.PRICECHARTING_TOKEN);
    return {
      sourceId: "pricecharting",
      hasCredentials,
      required: true,
      detail: hasCredentials
        ? "PRICECHARTING_TOKEN is set."
        : "Set PRICECHARTING_TOKEN to enable PriceCharting lookups."
    };
  },
  async fetchSnapshot(input: SourceFetchInput): Promise<SourceFetchResult> {
    const token = process.env.PRICECHARTING_TOKEN;
    if (!token) {
      return {
        status: "no_credentials",
        message: "Set PRICECHARTING_TOKEN to enable PriceCharting lookups."
      };
    }

    const query = input.query ?? DEFAULT_QUERY;
    const cached = cache.get(query);
    if (cached && cached.expiresAt > Date.now()) return cached.result;

    try {
      await limiter.acquire();

      const url = new URL(PRODUCTS_URL);
      url.searchParams.set("t", token);
      url.searchParams.set("q", query);

      const response = await fetch(url);
      if (!response.ok) {
        return {
          status: "error",
          message: `PriceCharting API failed: ${response.status} ${response.statusText}`
        };
      }

      const payload = (await response.json()) as { products?: PriceChartingProduct[] };
      const observedAt = new Date().toISOString();
      const result: SourceFetchResult = {
        status: "ok",
        snapshots: (payload.products ?? []).map((product) => toSnapshot(product, observedAt))
      };

      cache.set(query, { expiresAt: Date.now() + CACHE_TTL_MS, result });
      return result;
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }
};
