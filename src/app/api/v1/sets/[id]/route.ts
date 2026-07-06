import { getSetById } from "@/lib/api-v1/cards-repo";
import { errorResponse, singleResponse } from "@/lib/api-v1/respond";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const set = await getSetById(id);
  if (!set.ok) return errorResponse(503, "catalog database unavailable");
  if (set.value === null) return errorResponse(404, "Set not found");

  return singleResponse(set.value);
}
