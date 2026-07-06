import { POKEHUB_PROJECT_TAG, withProjectTag } from "@/lib/project-tag";
import type { ApiEnvelope } from "@/lib/sources/ingest-schemas";
import { msrpIngestSchema } from "@/lib/sources/ingest-schemas";
import { recordIngestionRun } from "@/lib/sources/ingestion-runs";
import { parseManualCsv } from "@/lib/sources/manual-csv";
import { jsonError, requireIngestToken } from "@/lib/sources/route-helpers";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import type { IngestionRun } from "@/types/pokehub";

export const runtime = "nodejs";

const SOURCE_ID = "manual-csv";

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

  const parsed = msrpIngestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues.map((issue) => issue.message).join("; "));
  }

  const startedAt = new Date().toISOString();
  const errors: string[] = [];
  let skipped = 0;

  const rows = (parsed.data.products ?? []).map((product) =>
    withProjectTag({
      name: product.name,
      product_type: product.productType,
      msrp: product.msrp,
      currency: product.currency ?? "USD",
      source: "manual",
      updated_at: startedAt
    })
  );

  if (parsed.data.csv) {
    const csvResult = parseManualCsv(parsed.data.csv);
    errors.push(...csvResult.errors);
    skipped += csvResult.errors.length;

    for (const row of csvResult.rows) {
      if (row.kind !== "sealed_product") {
        skipped += 1;
        errors.push(`Skipped "${row.name}": kind "${row.kind}" is not a sealed product.`);
        continue;
      }
      rows.push(
        withProjectTag({
          name: row.name,
          product_type: "sealed_product",
          msrp: row.price,
          currency: "USD",
          source: "manual",
          updated_at: startedAt
        })
      );
    }
  }

  if (rows.length === 0 && errors.length === 0) {
    return jsonError(400, "request must include products and/or csv");
  }

  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    return jsonError(503, "supabase is not configured; set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }

  const run: IngestionRun = {
    projectTag: POKEHUB_PROJECT_TAG,
    sourceId: SOURCE_ID,
    status: "success",
    startedAt,
    inserted: 0,
    updated: 0,
    skipped,
    errorMessage: undefined
  };

  if (rows.length > 0) {
    const { error } = await supabase.from("sealed_products").upsert(rows, { onConflict: "project_tag,name" });
    if (error) {
      run.status = "error";
      run.finishedAt = new Date().toISOString();
      run.errorMessage = error.message;
      await recordIngestionRun(run);
      return jsonError(500, `sealed_products upsert failed: ${error.message}`);
    }
  }

  run.status = errors.length === 0 ? "success" : rows.length > 0 ? "partial" : "error";
  run.finishedAt = new Date().toISOString();
  run.inserted = rows.length;
  run.errorMessage = errors.length > 0 ? errors.join("; ") : undefined;
  await recordIngestionRun(run);

  const envelope: ApiEnvelope<{ upserted: number; skipped: number; errors: string[] }> = {
    ok: true,
    data: { upserted: rows.length, skipped, errors },
    run
  };
  return Response.json(envelope);
}
