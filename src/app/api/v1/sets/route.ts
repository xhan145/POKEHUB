import { listSets } from "@/lib/api-v1/cards-repo";
import { parseCardsParams } from "@/lib/api-v1/query";
import { errorResponse, listResponse } from "@/lib/api-v1/respond";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { page, pageSize } = parseCardsParams(new URL(request.url).searchParams);

  const result = await listSets(page, pageSize);
  if (!result.ok) return errorResponse(503, "catalog database unavailable");

  return listResponse(result.value.rows, page, pageSize, result.value.totalCount);
}
