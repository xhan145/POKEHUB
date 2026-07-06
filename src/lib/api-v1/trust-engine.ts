import { scoreDataConfidence, scoreSourceFreshness, scoreSpreadRisk } from "@/workers/score-market";

export type TrustSnapshotInput = { source: string; market: number | null; observedAt: string };
export type TrustSource = { source: string; market: number; observedAt: string };
export type TrustTier = "VERIFIED" | "SOLID" | "SINGLE_SOURCE" | "STALE" | "NONE";
export type TrustResult = {
  score: number; // 0-100
  tier: TrustTier;
  parity: number | null; // 0-100 cross-source agreement; null when <2 sources
  freshness: number; // 0-100
  coverage: number; // count of distinct sources with a usable price
  sources: TrustSource[]; // latest per source, sorted by source name
  newestObservedAt: string | null;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

// Bad dates parse to NaN → treated as very old so the engine never throws.
function parseObservedAt(observedAt: string): number {
  const parsed = Date.parse(observedAt);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

export function computeTrust(snapshots: TrustSnapshotInput[], nowMs: number): TrustResult {
  // 1. Keep snapshots with a finite market > 0.
  const usable = snapshots.filter(
    (snapshot) => typeof snapshot.market === "number" && Number.isFinite(snapshot.market) && snapshot.market > 0
  );

  // 2. Group by source; keep the one with the max observedAt per source.
  const latestBySource = new Map<string, TrustSource>();
  for (const snapshot of usable) {
    const market = snapshot.market as number;
    const existing = latestBySource.get(snapshot.source);
    if (!existing || parseObservedAt(snapshot.observedAt) > parseObservedAt(existing.observedAt)) {
      latestBySource.set(snapshot.source, {
        source: snapshot.source,
        market,
        observedAt: snapshot.observedAt
      });
    }
  }

  const latest = [...latestBySource.values()];

  // 3. Coverage; short-circuit to NONE when there is nothing usable.
  const coverage = latest.length;
  if (coverage === 0) {
    return {
      score: 0,
      tier: "NONE",
      parity: null,
      freshness: 0,
      coverage: 0,
      sources: [],
      newestObservedAt: null
    };
  }

  // 8. Sources sorted by source name ascending.
  const sources = latest.slice().sort((a, b) => a.source.localeCompare(b.source));

  // 4. Newest observation and freshness.
  const newestMs = Math.max(...latest.map((source) => parseObservedAt(source.observedAt)));
  const newest = latest.reduce((best, source) =>
    parseObservedAt(source.observedAt) >= parseObservedAt(best.observedAt) ? source : best
  );
  const newestObservedAt = newest.observedAt;
  const ageHours = (nowMs - newestMs) / 3_600_000;
  const freshness = scoreSourceFreshness(ageHours);

  // 5. Cross-source parity; null when fewer than two sources.
  const markets = latest.map((source) => source.market);
  const parity =
    coverage >= 2
      ? scoreSpreadRisk({ low: Math.min(...markets), high: Math.max(...markets), mid: average(markets) })
      : null;

  // 6. Overall trust score via the shared data-confidence model.
  const score = scoreDataConfidence({
    sourceFreshness: freshness,
    sourceQuality: coverage >= 2 ? 85 : 60,
    sampleSize: clamp(coverage * 40, 0, 100),
    spreadSanity: parity ?? 55
  });

  // 7. Tier — first match wins.
  let tier: TrustTier;
  if (coverage === 0) {
    tier = "NONE";
  } else if (ageHours > 720) {
    tier = "STALE";
  } else if (coverage === 1) {
    tier = "SINGLE_SOURCE";
  } else if (parity !== null && parity >= 70 && freshness >= 60) {
    tier = "VERIFIED";
  } else {
    tier = "SOLID";
  }

  return {
    score,
    tier,
    parity,
    freshness,
    coverage,
    sources,
    newestObservedAt
  };
}
