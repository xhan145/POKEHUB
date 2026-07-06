export type ProjectTag = "POKE";

export type SignalBadge =
  | "GRAIL WATCH"
  | "CORE SEALED"
  | "LOW ENTRY"
  | "PLAYABILITY"
  | "TRACK";

export type DataSource =
  | "manual_seed"
  | "pokemon_tcg_api"
  | "tcgdex"
  | "pricecharting"
  | "ebay_browse"
  | "psa_public_api"
  | "manual";

export type MsrpProduct = {
  projectTag?: ProjectTag;
  name: string;
  msrp: number;
  currency: "USD";
  productType: string;
  source: "manual_seed";
};

export type SealedProduct = {
  id?: string;
  projectTag: ProjectTag;
  name: string;
  productType: string;
  msrp: number;
  currency: "USD";
  releaseDate?: string;
  setName?: string;
  source: DataSource;
  signalBadge: SignalBadge;
};

export type CardIdentity = {
  id?: string;
  projectTag: ProjectTag;
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
  rawJson?: unknown;
};

export type MarketSnapshot = {
  id?: string;
  projectTag: ProjectTag;
  itemId?: string;
  itemKind: "card" | "sealed_product";
  itemRef: string;
  source: DataSource;
  observedAt: string;
  low?: number;
  mid?: number;
  high?: number;
  market?: number;
  directLow?: number;
  activeListings?: number;
  soldCount?: number;
  yearlySalesVolume?: number;
  confidenceScore: number;
  rawJson?: unknown;
};

export type ValueScore = {
  id?: string;
  projectTag: ProjectTag;
  itemKind: "card" | "sealed_product";
  itemRef: string;
  computedAt: string;
  liquidityScore: number;
  soldVelocityScore: number;
  rarityScore?: number;
  gradeScarcityScore?: number;
  characterDemandScore?: number;
  setAgeScore?: number;
  conditionConfidenceScore?: number;
  marketSpreadScore?: number;
  sourceFreshnessScore?: number;
  valueSignalScore: number;
  explanation?: Record<string, unknown>;
};

export type PortfolioItem = {
  id: string;
  projectTag: ProjectTag;
  itemName: string;
  itemKind: "card" | "sealed_product";
  quantity: number;
  acquisitionCost: number;
  currentEstimatedValue: number;
  unrealizedGainLoss: number;
  status: "watch" | "hold" | "grade" | "sell" | "avoid";
  notes: string;
};

export type IngestionResult = {
  source: DataSource;
  projectTag: ProjectTag;
  insertedOrUpdated: number;
  skipped: number;
  errors: string[];
};

export type EnvReadiness = {
  projectTag: ProjectTag;
  supabaseUrl: boolean;
  supabaseAnonKey: boolean;
  supabaseServiceRoleKey: boolean;
  pokemonTcgApiKey: boolean;
  priceChartingToken: boolean;
  ebayCredentials: boolean;
  sharedDatabaseMode: boolean;
};
