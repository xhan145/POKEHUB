type ScoreInput = {
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

function clamp(score = 0) {
  return Math.max(0, Math.min(100, score));
}

export function valueSignalScore(input: ScoreInput) {
  return clamp(
    0.22 * clamp(input.liquidity) +
      0.18 * clamp(input.soldVelocity) +
      0.15 * clamp(input.rarity) +
      0.12 * clamp(input.gradeScarcity) +
      0.10 * clamp(input.characterDemand) +
      0.08 * clamp(input.setAge) +
      0.07 * clamp(input.conditionConfidence) +
      0.05 * clamp(input.marketSpread) +
      0.03 * clamp(input.sourceFreshness)
  );
}

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
