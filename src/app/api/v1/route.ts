import { getHealth } from "@/lib/api-v1/cards-repo";
import { CACHE_INDEX, errorResponse, singleResponse } from "@/lib/api-v1/respond";

export const runtime = "nodejs";

export async function GET() {
  const health = await getHealth();
  if (!health.ok) return errorResponse(503, "catalog database unavailable");

  const { cards, snapshots, lastIngest } = health.value;
  return singleResponse(
    {
      name: "POKEHUB API",
      version: "v1",
      endpoints: [
        "/api/v1/cards",
        "/api/v1/cards/{id}",
        "/api/v1/sets",
        "/api/v1/sets/{id}",
        "/api/v1/prices/{cardId}"
      ],
      cards,
      snapshots,
      lastIngest
    },
    CACHE_INDEX
  );
}
