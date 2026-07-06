import { POKEHUB_PROJECT_TAG } from "@/lib/project-tag";
import type { ApiEnvelope } from "@/lib/sources/ingest-schemas";
import { marketSnapshotIngestSchema } from "@/lib/sources/ingest-schemas";
import { recordIngestionRun } from "@/lib/sources/ingestion-runs";
import { jsonError, requireIngestToken, snapshotToRow } from "@/lib/sources/route-helpers";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import type { IngestionRun, MarketSnapshot } from "@/types/pokehub";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = requireIngestToken(request);
  if (!auth.ok) {
    return jsonError(auth.status, auth.error);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid JSON body");
  }

  const parsed = marketSnapshotIngestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues.map((issue) => issue.message).join("; "));
  }

  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    return jsonError(503, "supabase is not configured; set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }

  const startedAt = new Date().toISOString();
  const snapshot: MarketSnapshot = {
    projectTag: POKEHUB_PROJECT_TAG,
    itemKind: parsed.data.itemKind,
    itemRef: parsed.data.itemRef,
    source: parsed.data.source,
    observedAt: parsed.data.observedAt ?? startedAt,
    low: parsed.data.low,
    mid: parsed.data.mid,
    high: parsed.data.high,
    market: parsed.data.market,
    activeListings: parsed.data.activeListings,
    soldCount: parsed.data.soldCount,
    confidenceScore: parsed.data.confidenceScore ?? 50
  };

  const run: IngestionRun = {
    projectTag: POKEHUB_PROJECT_TAG,
    sourceId: parsed.data.source,
    status: "success",
    startedAt,
    inserted: 0,
    updated: 0,
    skipped: 0
  };

  const { error } = await supabase.from("market_snapshots").insert(snapshotToRow(snapshot));
  if (error) {
    run.status = "error";
    run.finishedAt = new Date().toISOString();
    run.errorMessage = `market_snapshots insert failed: ${error.message}`;
    await recordIngestionRun(run);
    return jsonError(500, run.errorMessage);
  }

  run.finishedAt = new Date().toISOString();
  run.inserted = 1;
  await recordIngestionRun(run);

  const envelope: ApiEnvelope<{ inserted: number }> = {
    ok: true,
    data: { inserted: 1 },
    run
  };
  return Response.json(envelope);
}
