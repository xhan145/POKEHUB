"use client";

import { useEffect, useState } from "react";

import type { AdapterStatus } from "@/types/pokehub";

export type SourceStatusState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; adapters: AdapterStatus[] };

type StatusResponse = { ok: true; data: { adapters: AdapterStatus[] } } | { ok: false; error: string };

export function useSourceStatus(): SourceStatusState {
  const [state, setState] = useState<SourceStatusState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/sources/status");
        const payload = (await response.json()) as StatusResponse;
        if (cancelled) {
          return;
        }
        if (!response.ok || !payload.ok) {
          setState({
            status: "error",
            message: payload.ok === false ? payload.error : "Failed to load source status"
          });
          return;
        }
        setState({ status: "ready", adapters: payload.data.adapters });
      } catch (error) {
        if (cancelled) {
          return;
        }
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Failed to load source status"
        });
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
