import { POKEHUB_PROJECT_TAG, withProjectTag } from "@/lib/project-tag";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

import type { IngestionRun } from "./types";

type IngestionRunRow = {
  id: string;
  project_tag: string;
  source_id: string;
  status: "success" | "error" | "partial";
  started_at: string;
  finished_at: string | null;
  inserted: number;
  updated: number;
  skipped: number;
  error_message: string | null;
};

function runToRow(run: IngestionRun) {
  return withProjectTag({
    source_id: run.sourceId,
    status: run.status,
    started_at: run.startedAt,
    finished_at: run.finishedAt ?? null,
    inserted: run.inserted,
    updated: run.updated,
    skipped: run.skipped,
    error_message: run.errorMessage ?? null
  });
}

function rowToRun(row: IngestionRunRow): IngestionRun {
  return {
    id: row.id,
    projectTag: POKEHUB_PROJECT_TAG,
    sourceId: row.source_id,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at ?? undefined,
    inserted: row.inserted,
    updated: row.updated,
    skipped: row.skipped,
    errorMessage: row.error_message ?? undefined
  };
}

export async function recordIngestionRun(run: IngestionRun): Promise<void> {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("ingestion_runs").insert(runToRow(run));
  if (error) {
    console.error(`Failed to record ingestion run for ${run.sourceId}: ${error.message}`);
  }
}

export async function getLatestRuns(): Promise<Record<string, IngestionRun>> {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return {};

  const { data, error } = await supabase
    .from("ingestion_runs")
    .select(
      "id, project_tag, source_id, status, started_at, finished_at, inserted, updated, skipped, error_message"
    )
    .eq("project_tag", POKEHUB_PROJECT_TAG)
    .order("started_at", { ascending: false })
    .limit(200);

  if (error || !data) return {};

  const latest: Record<string, IngestionRun> = {};
  for (const row of data as IngestionRunRow[]) {
    if (!latest[row.source_id]) {
      latest[row.source_id] = rowToRun(row);
    }
  }

  return latest;
}
