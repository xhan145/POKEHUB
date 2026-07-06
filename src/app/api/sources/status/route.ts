import type { ApiEnvelope } from "@/lib/sources/ingest-schemas";
import { getLatestRuns } from "@/lib/sources/ingestion-runs";
import { jsonError } from "@/lib/sources/route-helpers";
import { getAdapterStatuses } from "@/lib/sources/source-registry";
import type { AdapterStatus } from "@/types/pokehub";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [statuses, latestRuns] = await Promise.all([getAdapterStatuses(), getLatestRuns()]);

    const adapters: AdapterStatus[] = statuses.map((status) => ({
      ...status,
      lastRun: latestRuns[status.id] ?? null
    }));

    const envelope: ApiEnvelope<{ adapters: AdapterStatus[] }> = {
      ok: true,
      data: { adapters }
    };
    return Response.json(envelope);
  } catch (error) {
    return jsonError(500, error instanceof Error ? error.message : "failed to load source statuses");
  }
}
