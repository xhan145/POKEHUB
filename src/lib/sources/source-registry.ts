import { ebayBrowseAdapter } from "./ebay-browse";
import { manualCsvAdapter } from "./manual-csv";
import { pokemonTcgAdapter } from "./pokemon-tcg";
import { priceChartingAdapter } from "./pricecharting";
import { getScrapePolicy, scrapePolicies } from "./scrape-policy";
import type { AdapterStatus, ScrapePolicy, SourceAdapter } from "./types";

const STUB_LABELS: Record<string, string> = {
  "tcgplayer-direct": "TCGplayer Direct (scrape stub)",
  "cardmarket-direct": "Cardmarket Direct (scrape stub)",
  "psa-population": "PSA Population (scrape stub)",
  "cgc-population": "CGC Population (scrape stub)",
  "bgs-population": "BGS Population (scrape stub)"
};

function toStubAdapter(policy: ScrapePolicy): SourceAdapter {
  return {
    id: policy.sourceId,
    label: STUB_LABELS[policy.sourceId] ?? `${policy.sourceId} (scrape stub)`,
    kind: "scraper_stub",
    enabled: false,
    requiresSecret: false,
    async checkCredentials() {
      return {
        sourceId: policy.sourceId,
        hasCredentials: false,
        required: false,
        detail: policy.notes
      };
    },
    async fetchSnapshot() {
      return { status: "disabled", message: policy.notes };
    }
  };
}

export function getSourceAdapters(): SourceAdapter[] {
  return [
    pokemonTcgAdapter,
    ebayBrowseAdapter,
    priceChartingAdapter,
    manualCsvAdapter,
    ...scrapePolicies.map(toStubAdapter)
  ];
}

export async function getAdapterStatuses(): Promise<AdapterStatus[]> {
  const adapters = getSourceAdapters();

  return Promise.all(
    adapters.map(async (adapter) => {
      const credentials = await adapter.checkCredentials();
      return {
        id: adapter.id,
        label: adapter.label,
        kind: adapter.kind,
        enabled: adapter.enabled,
        requiresSecret: adapter.requiresSecret,
        hasCredentials: credentials.hasCredentials,
        rateLimitPerMinute: adapter.rateLimitPerMinute,
        policy: getScrapePolicy(adapter.id)
      };
    })
  );
}
