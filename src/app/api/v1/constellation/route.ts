import { getConstellation } from "@/lib/api-v1/constellation-repo";
import { CACHE_OK, errorResponse, singleResponse } from "@/lib/api-v1/respond";

export const runtime = "nodejs";

export async function GET() {
  const result = await getConstellation();
  if (!result.ok) return errorResponse(503, "catalog database unavailable");

  return singleResponse(result.value, CACHE_OK);
}
