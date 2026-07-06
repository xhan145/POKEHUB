import { POKEHUB_PROJECT_TAG } from "@/lib/project-tag";
import type { MarketSnapshot } from "@/types/pokehub";

import type { SourceAdapter, SourceFetchInput, SourceFetchResult } from "./types";

const TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const SEARCH_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search";
const POKEMON_CATEGORY_ID = "183454";

type EbayCredentials = { clientId: string; clientSecret: string };

let cachedToken: { value: string; expiresAt: number } | null = null;

function getCredentials(): EbayCredentials | null {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

async function getAccessToken({ clientId, clientSecret }: EbayCredentials): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now) return cachedToken.value;

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope"
  });

  if (!response.ok) {
    throw new Error(`eBay token request failed: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!payload.access_token) {
    throw new Error("eBay token response missing access_token.");
  }

  const expiresInSeconds = payload.expires_in ?? 7200;
  cachedToken = {
    value: payload.access_token,
    expiresAt: now + (expiresInSeconds - 60) * 1000
  };
  return payload.access_token;
}

type EbaySearchPayload = {
  total?: number;
  itemSummaries?: { price?: { value?: string } }[];
};

export const ebayBrowseAdapter: SourceAdapter = {
  id: "ebay-browse",
  label: "eBay Browse API",
  kind: "api",
  get enabled() {
    return getCredentials() !== null;
  },
  requiresSecret: true,
  async checkCredentials() {
    const hasCredentials = getCredentials() !== null;
    return {
      sourceId: "ebay-browse",
      hasCredentials,
      required: true,
      detail: hasCredentials
        ? "eBay client credentials are set."
        : "Set EBAY_CLIENT_ID and EBAY_CLIENT_SECRET (Browse API, client-credentials grant)."
    };
  },
  async fetchSnapshot(input: SourceFetchInput): Promise<SourceFetchResult> {
    const credentials = getCredentials();
    if (!credentials) {
      return {
        status: "no_credentials",
        message: "Set EBAY_CLIENT_ID and EBAY_CLIENT_SECRET to enable the eBay Browse API."
      };
    }

    try {
      const token = await getAccessToken(credentials);
      const url = new URL(SEARCH_URL);
      if (input.query) url.searchParams.set("q", input.query);
      url.searchParams.set("limit", String(input.limit ?? 50));
      url.searchParams.set("category_ids", POKEMON_CATEGORY_ID);

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        return {
          status: "error",
          message: `eBay Browse search failed: ${response.status} ${response.statusText}`
        };
      }

      const payload = (await response.json()) as EbaySearchPayload;
      const prices = (payload.itemSummaries ?? [])
        .map((item) => Number(item.price?.value))
        .filter((value) => Number.isFinite(value) && value > 0);

      const snapshot: MarketSnapshot = {
        projectTag: POKEHUB_PROJECT_TAG,
        itemKind: "sealed_product",
        itemRef: input.query ?? `ebay-category-${POKEMON_CATEGORY_ID}`,
        source: "ebay_browse",
        observedAt: new Date().toISOString(),
        low: prices.length > 0 ? Math.min(...prices) : undefined,
        high: prices.length > 0 ? Math.max(...prices) : undefined,
        activeListings: payload.total,
        confidenceScore: 55
      };

      return {
        status: "ok",
        snapshots: [snapshot],
        activeListings: payload.total
      };
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }
};
