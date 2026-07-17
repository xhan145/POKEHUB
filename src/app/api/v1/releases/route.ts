import releasesSeed from "@/data/releases-seed.json";
import { getRecentSets, getReleasePressure } from "@/lib/api-v1/releases-repo";
import { CACHE_OK, singleResponse } from "@/lib/api-v1/respond";
import { buildUpcoming } from "@/lib/releases";
import type { ReleaseSeedEntry } from "@/types/pokehub";

export const runtime = "nodejs";

export async function GET() {
  const seed = releasesSeed.releases as ReleaseSeedEntry[];

  // Pressure signals degrade to neutral when the DB is unreachable — the
  // curated seed is local, so the calendar itself never goes down with the DB.
  const pressureEntries = await Promise.all(
    seed.map(async (release) => [release.id, await getReleasePressure(release.products ?? [])] as const)
  );
  const recentSets = await getRecentSets();

  const upcoming = buildUpcoming(seed, Object.fromEntries(pressureEntries), Date.now());

  return singleResponse({ upcoming, recentSets }, CACHE_OK);
}
