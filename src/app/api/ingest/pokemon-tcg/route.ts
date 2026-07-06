import { POKEHUB_PROJECT_TAG } from "@/lib/project-tag";
import type { ApiEnvelope } from "@/lib/sources/ingest-schemas";
import { pokemonTcgIngestSchema } from "@/lib/sources/ingest-schemas";
import { recordIngestionRun } from "@/lib/sources/ingestion-runs";
import { cardToRow, jsonError, requireIngestToken, snapshotToRow } from "@/lib/sources/route-helpers";
import { getSourceAdapters } from "@/lib/sources/source-registry";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import type { IngestionRun } from "@/types/pokehub";

export const runtime = "nodejs";

const SOURCE_ID = "pokemon-tcg";

export async function POST(request: Request) {
  const auth = requireIngestToken(request);
  if (!auth.ok) {
    return jsonError(auth.status, auth.error);
  }

  let body: unknown = {};
  const text = await request.text();
  if (text.trim().length > 0) {
    try {
      body = JSON.parse(text);
    } catch {
      return jsonError(400, "invalid JSON body");
    }
  }

  const parsed = pokemonTcgIngestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues.map((issue) => issue.message).join("; "));
  }

  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    return jsonError(503, "supabase is not configured; set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }

  const adapter = getSourceAdapters().find((candidate) => candidate.id === SOURCE_ID);
  if (!adapter) {
    return jsonError(500, "pokemon-tcg adapter is not registered");
  }

  const startedAt = new Date().toISOString();
  const run: IngestionRun = {
    projectTag: POKEHUB_PROJECT_TAG,
    sourceId: SOURCE_ID,
    status: "success",
    startedAt,
    inserted: 0,
    updated: 0,
    skipped: 0
  };

  const result = await adapter.fetchSnapshot(parsed.data);
  if (result.status !== "ok") {
    run.status = "error";
    run.finishedAt = new Date().toISOString();
    run.errorMessage = result.message;
    await recordIngestionRun(run);
    return jsonError(500, result.message);
  }

  const cardRows = (result.cards ?? []).map(cardToRow);
  const snapshotRows = result.snapshots.map(snapshotToRow);

  if (cardRows.length > 0) {
    const { error } = await supabase.from("cards").upsert(cardRows, { onConflict: "project_tag,pokemon_tcg_id" });
    if (error) {
      run.status = "error";
      run.finishedAt = new Date().toISOString();
      run.errorMessage = `cards upsert failed: ${error.message}`;
      await recordIngestionRun(run);
      return jsonError(500, run.errorMessage);
    }
  }

  if (snapshotRows.length > 0) {
    const { error } = await supabase.from("market_snapshots").insert(snapshotRows);
    if (error) {
      run.status = "partial";
      run.finishedAt = new Date().toISOString();
      run.updated = cardRows.length;
      run.errorMessage = `market_snapshots insert failed: ${error.message}`;
      await recordIngestionRun(run);
      return jsonError(500, run.errorMessage);
    }
  }

  run.finishedAt = new Date().toISOString();
  run.inserted = snapshotRows.length;
  run.updated = cardRows.length;
  await recordIngestionRun(run);

  const envelope: ApiEnvelope<{ cards: number; snapshots: number }> = {
    ok: true,
    data: { cards: cardRows.length, snapshots: snapshotRows.length },
    run
  };
  return Response.json(envelope);
}
