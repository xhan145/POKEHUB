export type CardScoreInput = {
  liquidity?: number;
  soldVelocity?: number;
  rarity?: number;
  gradeScarcity?: number;
  characterDemand?: number;
  setAge?: number;
  conditionConfidence?: number;
  marketSpread?: number;
  sourceFreshness?: number;
};

export type SealedScoreInput = {
  aboveMsrp?: number;
  soldVelocity?: number;
  productTypeDemand?: number;
  setPopularity?: number;
  supplyAbsorption?: number;
  reprintRiskInverse?: number;
  sourceFreshness?: number;
};

export type DataConfidenceInput = {
  sourceFreshness?: number;
  sourceQuality?: number;
  sampleSize?: number;
  spreadSanity?: number;
};

export function clampScore(score = 0) {
  return Math.max(0, Math.min(100, score));
}

export function cardValueSignalScore(input: CardScoreInput) {
  return clampScore(
    // Liquidity: more real buyers and easier exits make the signal stronger.
    0.22 * clampScore(input.liquidity) +
      // Sold velocity: recent sold comps matter more than static asking prices.
      0.18 * clampScore(input.soldVelocity) +
      // Rarity: rarer cards can justify stronger collector demand.
      0.15 * clampScore(input.rarity) +
      // Grade scarcity: low PSA/CGC/BGS gem populations can support grading upside.
      0.12 * clampScore(input.gradeScarcity) +
      // Character demand: Charizard, Eeveelutions, Pikachu, waifus, and mascots move markets.
      0.1 * clampScore(input.characterDemand) +
      // Set age: older sets can have less fresh supply entering the market.
      0.08 * clampScore(input.setAge) +
      // Condition confidence: raw cards with trustworthy condition notes are less risky.
      0.07 * clampScore(input.conditionConfidence) +
      // Market spread: tight spreads are healthier than wild low/high gaps.
      0.05 * clampScore(input.marketSpread) +
      // Source freshness: recent data beats stale snapshots.
      0.03 * clampScore(input.sourceFreshness)
  );
}

export function valueSignalScore(input: CardScoreInput) {
  return cardValueSignalScore(input);
}

export function sealedProductSignalScore(input: SealedScoreInput) {
  return clampScore(
    // Above MSRP: sealed products trading above MSRP may show collector demand.
    0.28 * clampScore(input.aboveMsrp) +
      // Sold velocity: sealed strength needs completed sales, not just listings.
      0.2 * clampScore(input.soldVelocity) +
      // Product type demand: UPCs, ETBs, booster bundles, and tins behave differently.
      0.15 * clampScore(input.productTypeDemand) +
      // Set popularity: character, era, and nostalgia strength.
      0.12 * clampScore(input.setPopularity) +
      // Supply absorption: whether active supply is being eaten by sales.
      0.1 * clampScore(input.supplyAbsorption) +
      // Reprint risk inverse: lower reprint risk improves the signal.
      0.08 * clampScore(input.reprintRiskInverse) +
      // Source freshness: fresh marketplace snapshots are more trustworthy.
      0.07 * clampScore(input.sourceFreshness)
  );
}

export function dataConfidenceScore(input: DataConfidenceInput) {
  return clampScore(
    // Freshness: old signals decay quickly in collectible markets.
    0.35 * clampScore(input.sourceFreshness) +
      // Source quality: first-party APIs and marketplace APIs score higher than scraped pages.
      0.3 * clampScore(input.sourceQuality) +
      // Sample size: more comps means less noise.
      0.2 * clampScore(input.sampleSize) +
      // Spread sanity: extreme spreads reduce trust.
      0.15 * clampScore(input.spreadSanity)
  );
}

function runExample() {
  console.log(
    "Example value signal:",
    valueSignalScore({
      liquidity: 72,
      soldVelocity: 64,
      rarity: 85,
      gradeScarcity: 40,
      characterDemand: 90,
      setAge: 35,
      conditionConfidence: 80,
      marketSpread: 55,
      sourceFreshness: 90
    }).toFixed(2)
  );

  console.log(
    "Example sealed signal:",
    sealedProductSignalScore({
      aboveMsrp: 65,
      soldVelocity: 58,
      productTypeDemand: 74,
      setPopularity: 82,
      supplyAbsorption: 50,
      reprintRiskInverse: 60,
      sourceFreshness: 90
    }).toFixed(2)
  );
}

if (process.argv[1]?.endsWith("score-market.ts")) {
  runExample();
}
