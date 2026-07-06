export const CACHE_OK = "public, s-maxage=3600, stale-while-revalidate=86400";
export const CACHE_INDEX = "public, s-maxage=300, stale-while-revalidate=3600";

function jsonResponse(body: unknown, status: number, cacheControl: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": cacheControl
    }
  });
}

export function listResponse(
  data: unknown[],
  page: number,
  pageSize: number,
  totalCount: number,
  cache?: string
): Response {
  return jsonResponse({ data, page, pageSize, count: data.length, totalCount }, 200, cache ?? CACHE_OK);
}

export function singleResponse(data: unknown, cache?: string): Response {
  return jsonResponse({ data }, 200, cache ?? CACHE_OK);
}

export function errorResponse(status: number, error: string): Response {
  return jsonResponse({ error }, status, "no-store");
}
