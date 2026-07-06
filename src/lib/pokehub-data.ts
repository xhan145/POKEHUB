import type {
  CardIdentity,
  EnvReadiness,
  MsrpProduct,
  PortfolioItem,
  ProjectTag,
  SealedProduct,
  SignalBadge
} from "@/types/pokehub";

export function getSignalBadge(product: Pick<MsrpProduct, "name" | "msrp">): SignalBadge {
  if (product.msrp >= 100) return "GRAIL WATCH";
  if (product.name.includes("Elite Trainer") || product.name.includes("Ultra-Premium")) return "CORE SEALED";
  if (product.name.includes("Mini Tin") || product.msrp <= 15) return "LOW ENTRY";
  if (product.name.includes("Battle Deck")) return "PLAYABILITY";
  return "TRACK";
}

export function getEstimatedMarketPrice(product: Pick<MsrpProduct, "name" | "msrp">) {
  const badge = getSignalBadge(product);
  const multiplier: Record<SignalBadge, number> = {
    "GRAIL WATCH": 1.42,
    "CORE SEALED": 1.18,
    "LOW ENTRY": 0.96,
    PLAYABILITY: 1.08,
    TRACK: 1.03
  };

  return Number((product.msrp * multiplier[badge]).toFixed(2));
}

export function toSealedProducts(products: MsrpProduct[], projectTag: ProjectTag): SealedProduct[] {
  return products.map((product) => ({
    projectTag,
    name: product.name,
    productType: product.productType,
    msrp: product.msrp,
    currency: product.currency,
    source: product.source,
    signalBadge: getSignalBadge(product)
  }));
}

export const mockCards: CardIdentity[] = [
  {
    projectTag: "POKE",
    pokemonTcgId: "sv3pt5-199",
    name: "Charizard ex",
    setId: "sv3pt5",
    setName: "Scarlet & Violet 151",
    number: "199",
    rarity: "Special Illustration Rare",
    artist: "miki kudo",
    supertype: "Pokemon",
    subtypes: ["Stage 2", "ex"],
    imageSmall: "https://images.pokemontcg.io/sv3pt5/199.png",
    imageLarge: "https://images.pokemontcg.io/sv3pt5/199_hires.png"
  },
  {
    projectTag: "POKE",
    pokemonTcgId: "swsh12pt5-160",
    name: "Pikachu",
    setId: "swsh12pt5",
    setName: "Crown Zenith",
    number: "160",
    rarity: "Secret Rare",
    artist: "Kouki Saitou",
    supertype: "Pokemon",
    subtypes: ["Basic"],
    imageSmall: "https://images.pokemontcg.io/swsh12pt5/160.png",
    imageLarge: "https://images.pokemontcg.io/swsh12pt5/160_hires.png"
  },
  {
    projectTag: "POKE",
    pokemonTcgId: "swsh7-215",
    name: "Umbreon VMAX",
    setId: "swsh7",
    setName: "Evolving Skies",
    number: "215",
    rarity: "Rare Rainbow",
    artist: "PLANETA Mochizuki",
    supertype: "Pokemon",
    subtypes: ["VMAX"],
    imageSmall: "https://images.pokemontcg.io/swsh7/215.png",
    imageLarge: "https://images.pokemontcg.io/swsh7/215_hires.png"
  }
];

export const mockPortfolio: PortfolioItem[] = [
  {
    id: "pf-1",
    projectTag: "POKE",
    itemName: "30th Celebration Ultra-Premium Collection",
    itemKind: "sealed_product",
    quantity: 2,
    acquisitionCost: 359.98,
    currentEstimatedValue: 511.18,
    unrealizedGainLoss: 151.2,
    status: "hold",
    notes: "Core sealed position. Recheck supply after holiday listings."
  },
  {
    id: "pf-2",
    projectTag: "POKE",
    itemName: "Charizard ex SIR",
    itemKind: "card",
    quantity: 1,
    acquisitionCost: 92,
    currentEstimatedValue: 118,
    unrealizedGainLoss: 26,
    status: "grade",
    notes: "Inspect corners and centering before submission."
  },
  {
    id: "pf-3",
    projectTag: "POKE",
    itemName: "30th Celebration Mini Tin",
    itemKind: "sealed_product",
    quantity: 6,
    acquisitionCost: 59.94,
    currentEstimatedValue: 57.54,
    unrealizedGainLoss: -2.4,
    status: "watch",
    notes: "Low entry item; needs sold velocity before adding more."
  }
];

export function getEnvReadiness(): EnvReadiness {
  return {
    projectTag: "POKE",
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    pokemonTcgApiKey: Boolean(process.env.POKEMON_TCG_API_KEY),
    priceChartingToken: Boolean(process.env.PRICECHARTING_TOKEN),
    ebayCredentials: Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET),
    ingestToken: Boolean(process.env.POKEHUB_INGEST_TOKEN),
    sharedDatabaseMode: true
  };
}
