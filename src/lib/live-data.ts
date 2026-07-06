import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { LiveOverview } from "@/types/pokehub";

const LIVE_OVERVIEW_TIMEOUT_MS = 3000;

async function fetchLiveOverview(): Promise<LiveOverview | null> {
  const client = createBrowserSupabaseClient();
  if (!client) {
    return null;
  }

  try {
    const [sealedResult, cardResult, snapshotResult, lastSyncResult] = await Promise.all([
      client.from("poke_sealed_products").select("*", { count: "exact", head: true }),
      client.from("poke_cards").select("*", { count: "exact", head: true }),
      client.from("poke_market_snapshots").select("*", { count: "exact", head: true }),
      client
        .from("poke_market_snapshots")
        .select("observed_at")
        .order("observed_at", { ascending: false })
        .limit(1)
    ]);

    if (sealedResult.error || cardResult.error || snapshotResult.error || lastSyncResult.error) {
      return null;
    }

    const newestSnapshot = lastSyncResult.data?.[0] as { observed_at?: string | null } | undefined;

    return {
      sealedCount: sealedResult.count ?? 0,
      cardCount: cardResult.count ?? 0,
      snapshotCount: snapshotResult.count ?? 0,
      lastSync: newestSnapshot?.observed_at ?? null
    };
  } catch {
    return null;
  }
}

export async function getLiveOverview(): Promise<LiveOverview | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), LIVE_OVERVIEW_TIMEOUT_MS);
  });

  try {
    return await Promise.race([fetchLiveOverview(), timeout]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
