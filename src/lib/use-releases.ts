"use client";

import { useEffect, useState } from "react";

import type { UpcomingRelease } from "@/types/pokehub";

export type ReleasesState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; upcoming: UpcomingRelease[]; recentSets: { name: string; releaseDate: string }[] };

export function useReleases(): ReleasesState {
  const [state, setState] = useState<ReleasesState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    fetch("/api/v1/releases")
      .then(async (response) => {
        if (!response.ok) throw new Error(`Release API returned ${response.status}`);
        const body = (await response.json()) as {
          data: { upcoming: UpcomingRelease[]; recentSets: { name: string; releaseDate: string }[] };
        };
        if (!cancelled) {
          setState({ status: "ready", upcoming: body.data.upcoming, recentSets: body.data.recentSets });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ status: "error", message: error instanceof Error ? error.message : "fetch failed" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
