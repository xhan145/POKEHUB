import assert from "node:assert/strict";
import test from "node:test";

import {
  cardValueSignalScore,
  clampScore,
  dataConfidenceScore,
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
