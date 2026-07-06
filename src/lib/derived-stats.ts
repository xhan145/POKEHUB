import {
  scoreCardValueSignal,
  scoreDataConfidence,
  scoreLiquidity,
  scoreSealedProductSignal
} from "@/workers/score-market";

// Deterministic placeholder market stats derived from string hashes (djb2).
// Everything here is a seed estimate until live marketplace data is wired in;
// no randomness, so the same input always yields the same output.

export type DerivedSealedStats = {
  activeListings: number;
  soldComps: number;
  velocity: "SLOW" | "STEADY" | "FAST";
  reprintRisk: "LOW" | "MED" | "HIGH";
  liquidityScore: number;
  signalScore: number;
};

export type DerivedCardStats = {
  rawMarket: number;
  gradedEstimate: number;
  population: "PENDING";
  spread: number;
  liquidityScore: number;
  confidenceScore: number;
  signalScore: number;
  glow: "common" | "rare" | "ultra" | "secret";
};

function djb2Hash(value: string) {
  let h = 5381;
  for (const c of value) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0;
  return h;
}

function hashRange(seed: string, min: number, max: number) {
  return min + (djb2Hash(seed) % (max - min + 1));
}

// Estimates observed by seed data are not fresh marketplace snapshots.
const SEED_SOURCE_FRESHNESS = 60;

export function getDerivedSealedStats(name: string, msrp: number): DerivedSealedStats {
  const activeListings = hashRange(`${name}|listings`, 3, 40);
  const soldComps = hashRange(`${name}|sold`, 1, 25);
  const velocity: DerivedSealedStats["velocity"] = soldComps >= 16 ? "FAST" : soldComps >= 8 ? "STEADY" : "SLOW";
  const reprintRoll = djb2Hash(`${name}|reprint`) % 3;
  const reprintRisk: DerivedSealedStats["reprintRisk"] = reprintRoll === 0 ? "LOW" : reprintRoll === 1 ? "MED" : "HIGH";
  const liquidityScore = scoreLiquidity({ activeListings, soldCount: soldComps });
  const signalScore = scoreSealedProductSignal({
    aboveMsrp: hashRange(`${name}|premium`, 20, 90),
    soldVelocity: Math.min(100, soldComps * 4),
    productTypeDemand: msrp >= 100 ? 85 : msrp >= 40 ? 70 : 55,
    setPopularity: hashRange(`${name}|set`, 40, 90),
    supplyAbsorption: Math.min(100, Math.round((soldComps / activeListings) * 100)),
    reprintRiskInverse: reprintRisk === "LOW" ? 80 : reprintRisk === "MED" ? 50 : 20,
    sourceFreshness: SEED_SOURCE_FRESHNESS
  });

  return { activeListings, soldComps, velocity, reprintRisk, liquidityScore, signalScore };
}

const GRADED_MULTIPLIER_BY_GLOW: Record<DerivedCardStats["glow"], number> = {
  secret: 2.4,
  ultra: 2.2,
  rare: 1.9,
  common: 1.6
};

const RARITY_SCORE_BY_GLOW: Record<DerivedCardStats["glow"], number> = {
  secret: 95,
  ultra: 85,
  rare: 65,
  common: 40
};

function glowFromRarity(rarity?: string): DerivedCardStats["glow"] {
  const value = rarity ?? "";
  if (value.includes("Secret") || value.includes("Rainbow")) return "secret";
  if (
    value.includes("Special Illustration") ||
    value.includes("Ultra") ||
    value.includes("VMAX") ||
    value.includes("Hyper")
  ) {
    return "ultra";
  }
  if (value.includes("Rare") || value.includes("Holo")) return "rare";
  return "common";
}

export function getDerivedCardStats(card: { pokemonTcgId: string; name: string; rarity?: string }): DerivedCardStats {
  const glow = glowFromRarity(card.rarity);
  const rawMarket = Number((5 + (djb2Hash(`${card.name}|raw`) % 24501) / 100).toFixed(2));
  const gradedEstimate = Number((rawMarket * GRADED_MULTIPLIER_BY_GLOW[glow]).toFixed(2));
  const spread = Number(((djb2Hash(`${card.pokemonTcgId}|spread`) % 101) / 100).toFixed(2));
  const activeListings = hashRange(`${card.pokemonTcgId}|listings`, 2, 30);
  const soldCount = hashRange(`${card.pokemonTcgId}|sold`, 1, 18);
  const liquidityScore = scoreLiquidity({ activeListings, soldCount });
  const spreadSanity = Math.round((1 - spread) * 100);
  const confidenceScore = scoreDataConfidence({
    sourceFreshness: SEED_SOURCE_FRESHNESS,
    sourceQuality: 40,
    sampleSize: Math.min(100, soldCount * 5),
    spreadSanity
  });
  const signalScore = scoreCardValueSignal({
    liquidity: liquidityScore,
    soldVelocity: Math.min(100, soldCount * 5),
    rarity: RARITY_SCORE_BY_GLOW[glow],
    gradeScarcity: hashRange(`${card.pokemonTcgId}|scarcity`, 30, 80),
    characterDemand: hashRange(`${card.name}|demand`, 35, 95),
    setAge: hashRange(`${card.pokemonTcgId}|age`, 20, 80),
    conditionConfidence: 50,
    marketSpread: spreadSanity,
    sourceFreshness: SEED_SOURCE_FRESHNESS
  });

  return {
    rawMarket,
    gradedEstimate,
    population: "PENDING",
    spread,
    liquidityScore,
    confidenceScore,
    signalScore,
    glow
  };
}
