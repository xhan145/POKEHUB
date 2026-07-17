import { getAnonClient } from "@/lib/api-v1/cards-repo";
import { getEstimatedMarketPrice } from "@/lib/pokehub-data";

export type ReleasePressure = { marketPressure: number; dataConfidence: number };

const NEUTRAL_PRESSURE: ReleasePressure = { marketPressure: 40, dataConfidence: 0 };

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

/**
 * Preorder-pressure signal for a release from its tracked sealed products:
 * average above-MSRP premium mapped 0% -> 40, +50% -> 90 (linear, clamped).
 * Confidence reflects how many of the release's products we actually track.
 */
export async function getReleasePressure(productNames: string[]): Promise<ReleasePressure> {
  if (productNames.length === 0) return NEUTRAL_PRESSURE;

  const client = getAnonClient();
  if (!client) return NEUTRAL_PRESSURE;

  const result = await client
    .from("poke_sealed_products")
    .select("name, msrp")
    .in("name", productNames);

  if (result.error || !result.data || result.data.length === 0) return NEUTRAL_PRESSURE;

  const premiums = result.data
    .filter((row): row is { name: string; msrp: number } => typeof row.msrp === "number" && row.msrp > 0)
    .map((row) => {
      const market = getEstimatedMarketPrice({ name: row.name, msrp: row.msrp });
      return ((market - row.msrp) / row.msrp) * 100;
    });

  if (premiums.length === 0) return NEUTRAL_PRESSURE;

  const averagePremium = premiums.reduce((sum, value) => sum + value, 0) / premiums.length;
  return {
    marketPressure: clamp(40 + averagePremium),
    dataConfidence: clamp((premiums.length / productNames.length) * 100)
  };
}

export async function getRecentSets(limit = 8): Promise<{ name: string; releaseDate: string }[]> {
  const client = getAnonClient();
  if (!client) return [];

  const result = await client
    .from("poke_set_dates")
    .select("name, release_date")
    .not("release_date", "is", null)
    .order("release_date", { ascending: false })
    .limit(limit);

  if (result.error || !result.data) return [];

  return result.data
    .filter((row): row is { name: string; release_date: string } => Boolean(row.name && row.release_date))
    .map((row) => ({ name: row.name, releaseDate: row.release_date }));
}
