import type { ScrapePolicy } from "./types";

export const scrapePolicies: ScrapePolicy[] = [
  {
    sourceId: "tcgplayer-direct",
    robotsTxtAllowed: "unknown",
    tosAllowsScraping: "no",
    requiresApproval: true,
    notes:
      "TCGplayer ToS prohibits scraping. Apply to the TCGplayer developer program and use an approved API key instead."
  },
  {
    sourceId: "cardmarket-direct",
    robotsTxtAllowed: "unknown",
    tosAllowsScraping: "no",
    requiresApproval: true,
    notes:
      "Cardmarket ToS prohibits scraping. Request a Cardmarket API app token and secret through their developer program instead."
  },
  {
    sourceId: "psa-population",
    robotsTxtAllowed: "unknown",
    tosAllowsScraping: "unknown",
    requiresApproval: true,
    notes:
      "Do not scrape PSA population report pages. Register for the PSA Public API and use a PSA_API_TOKEN instead."
  },
  {
    sourceId: "cgc-population",
    robotsTxtAllowed: "unknown",
    tosAllowsScraping: "unknown",
    requiresApproval: true,
    notes:
      "CGC offers no public API. Population data requires written permission from CGC or a licensed data feed."
  },
  {
    sourceId: "bgs-population",
    robotsTxtAllowed: "unknown",
    tosAllowsScraping: "unknown",
    requiresApproval: true,
    notes:
      "Beckett (BGS) offers no public API. Population data requires written permission from Beckett or a licensed data feed."
  }
];

export function getScrapePolicy(sourceId: string): ScrapePolicy | undefined {
  return scrapePolicies.find((policy) => policy.sourceId === sourceId);
}
