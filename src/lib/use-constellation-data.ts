"use client";

import { useEffect, useState } from "react";

import type { ConstellationPayload } from "@/lib/api-v1/constellation-repo";

export type ConstellationState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; payload: ConstellationPayload };

/**
 * Fetch the constellation payload from `/api/v1/constellation` exactly once on
 * mount. The route wraps the payload as `{ data }` (singleResponse); we unwrap
 * it here so consumers see the bare `ConstellationPayload`.
 */
export function useConstellationData(): ConstellationState {
  const [state, setState] = useState<ConstellationState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/v1/constellation", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`constellation request failed (${response.status})`);
        }
        const body = (await response.json()) as { data?: ConstellationPayload };
        if (!body.data || !Array.isArray(body.data.cards)) {
          throw new Error("constellation payload was malformed");
        }
        setState({ status: "ready", payload: body.data });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        const message = error instanceof Error ? error.message : "unknown error";
        setState({ status: "error", message });
      });

    return () => controller.abort();
  }, []);

  return state;
}

/**
 * True when the browser can create a WebGL rendering context. Uses a throwaway
 * canvas so nothing touches the DOM. Any throw (e.g. blocked context) counts as
 * unavailable so the module can fall back gracefully.
 */
export function isWebglAvailable(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const context =
      canvas.getContext("webgl2") || canvas.getContext("webgl");
    return Boolean(context);
  } catch {
    return false;
  }
}
