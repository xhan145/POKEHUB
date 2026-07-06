import type { SupabaseClient } from "@supabase/supabase-js";

import { POKEHUB_PROJECT_TAG, withProjectTag } from "@/lib/project-tag";

export function selectProjectRows(client: SupabaseClient, tableName: string) {
  return client.from(tableName).select("*").eq("project_tag", POKEHUB_PROJECT_TAG);
}

export function upsertProjectRows<T extends Record<string, unknown>>(
  client: SupabaseClient,
  tableName: string,
  rows: T[],
  onConflict: string
 ) {
  return client
    .from(tableName)
    .upsert(rows.map((row) => withProjectTag(row)), { onConflict });
}

export function selectPokeView(client: SupabaseClient, viewName: `poke_${string}`) {
  return client.from(viewName).select("*");
}
