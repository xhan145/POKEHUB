import assert from "node:assert/strict";
import test from "node:test";

import {
  anticipationTier,
  cardValueSignalScore,
  clampScore,
  dataConfidenceScore,
  scoreCardValueSignal,
  scoreDataConfidence,
  scoreLiquidity,
  scoreSealedProductSignal,
  scoreSourceFreshness,
  scoreAnticipation,
  scoreSpreadRisk,
  sealedProductSignalScore,
  valueSignalScore
} from "./score-market";

test("clampScore keeps scores in the 0 to 100 range", () => {
  assert.equal(clampScore(-20), 0);
  assert.equal(clampScore(45.5), 45.5);
  assert.equal(clampScore(140), 100);
});

test("cardValueSignalScore preserves the existing weighted card model", () => {
  const score = cardValueSignalScore({
    liquidity: 72,
    soldVelocity: 64,
    rarity: 85,
    gradeScarcity: 40,
    characterDemand: 90,
    setAge: 35,
    conditionConfidence: 80,
    marketSpread: 55,
    sourceFreshness: 90
  });

  assert.equal(Number(score.toFixed(2)), 67.76);
  assert.equal(valueSignalScore({ liquidity: 72, soldVelocity: 64 }), cardValueSignalScore({ liquidity: 72, soldVelocity: 64 }));
});

test("sealedProductSignalScore rewards MSRP premium and velocity without exceeding 100", () => {
  const score = sealedProductSignalScore({
    aboveMsrp: 120,
    soldVelocity: 90,
    productTypeDemand: 80,
    setPopularity: 70,
    supplyAbsorption: 80,
    reprintRiskInverse: 50,
    sourceFreshness: 100
  });

  assert.equal(Number(score.toFixed(2)), 85.4);
});

test("dataConfidenceScore combines freshness, source quality, sample size, and spread sanity", () => {
  const score = dataConfidenceScore({
    sourceFreshness: 90,
    sourceQuality: 80,
    sampleSize: 60,
    spreadSanity: 70
  });

  assert.equal(Number(score.toFixed(2)), 78);
});

test("scoreSourceFreshness decays linearly from 100 at 0h to 0 at 168h", () => {
  assert.equal(scoreSourceFreshness(0), 100);
  assert.equal(scoreSourceFreshness(84), 50);
  assert.equal(scoreSourceFreshness(168), 0);
  assert.equal(scoreSourceFreshness(1000), 0);
  assert.equal(scoreSourceFreshness(-12), 100);
});

test("scoreLiquidity weights active listings and sold comps and clamps to 0..100", () => {
  assert.equal(scoreLiquidity({}), 0);
  assert.equal(scoreLiquidity({ activeListings: 10, soldCount: 4 }), 20);
  assert.equal(scoreLiquidity({ activeListings: 1000, soldCount: 1000 }), 100);
  assert.ok(
    scoreLiquidity({ activeListings: 20, soldCount: 4 }) > scoreLiquidity({ activeListings: 10, soldCount: 4 })
  );
  assert.ok(
    scoreLiquidity({ activeListings: 10, soldCount: 8 }) > scoreLiquidity({ activeListings: 10, soldCount: 4 })
  );
});

test("scoreSpreadRisk scores tight spreads high, wide spreads low, invalid inputs 50", () => {
  assert.equal(scoreSpreadRisk({ low: 10, high: 10, mid: 10 }), 100);
  assert.equal(scoreSpreadRisk({ low: 5, high: 20, mid: 10 }), 0);
  assert.equal(scoreSpreadRisk({ low: 0, high: 30, mid: 10 }), 0);
  assert.equal(scoreSpreadRisk({}), 50);
  assert.equal(scoreSpreadRisk({ low: 5, high: 20 }), 50);
  assert.equal(scoreSpreadRisk({ low: 5, high: 20, mid: 0 }), 50);
  assert.ok(
    scoreSpreadRisk({ low: 9, high: 11, mid: 10 }) > scoreSpreadRisk({ low: 6, high: 14, mid: 10 })
  );
});

test("score aliases reference the existing scoring functions", () => {
  assert.equal(scoreCardValueSignal, cardValueSignalScore);
  assert.equal(scoreSealedProductSignal, sealedProductSignalScore);
  assert.equal(scoreDataConfidence, dataConfidenceScore);
});

test("scoreAnticipation blends hype, market pressure, and confidence with defaults", () => {
  assert.equal(
    scoreAnticipation({ hype: { franchiseWeight: 100, scarcityRisk: 100, nostalgiaFactor: 100 }, marketPressure: 80, dataConfidence: 90 }),
    0.6 * 100 + 0.25 * 80 + 0.15 * 90
  );
  assert.equal(scoreAnticipation({ hype: {} }), 0.6 * 0 + 0.25 * 40 + 0.15 * 30);
  assert.equal(scoreAnticipation({ hype: { franchiseWeight: 90 } }), 0.6 * (90 / 3) + 0.25 * 40 + 0.15 * 30);
  assert.equal(
    scoreAnticipation({ hype: { franchiseWeight: 500, scarcityRisk: 500, nostalgiaFactor: 500 }, marketPressure: 500, dataConfidence: 500 }),
    100
  );
});

test("anticipationTier maps score thresholds", () => {
  assert.equal(anticipationTier(85), "GRAIL");
  assert.equal(anticipationTier(84.9), "HOT");
  assert.equal(anticipationTier(70), "HOT");
  assert.equal(anticipationTier(69.9), "WARM");
  assert.equal(anticipationTier(50), "WARM");
  assert.equal(anticipationTier(49.9), "WATCH");
  assert.equal(anticipationTier(0), "WATCH");
});
