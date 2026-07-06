export type MsrpProduct = {
  name: string;
  msrp: number;
  currency: "USD";
  productType: string;
  source: "manual_seed";
};

export type CardIdentity = {
  pokemonTcgId: string;
  name: string;
  setId: string;
  setName: string;
  number: string;
  rarity?: string;
  artist?: string;
  supertype?: string;
  subtypes?: string[];
  imageSmall?: string;
  imageLarge?: string;
};

export type MarketSnapshot = {
  itemId: string;
  itemKind: "card" | "sealed_product";
  source: "pokemon_tcg_api" | "pricecharting" | "ebay" | "manual";
  observedAt: string;
  low?: number;
  mid?: number;
  high?: number;
  market?: number;
  directLow?: number;
  activeListings?: number;
  soldCount?: number;
  confidenceScore: number;
};
