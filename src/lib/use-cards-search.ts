"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiCardToLiveCard, type LiveCard } from "@/lib/api-v1/card-mapper";

export type CardsSearchState = {
  status: "ready" | "loading" | "error";
  cards: LiveCard[];
  totalCount: number;
  page: number;
};

const PAGE_SIZE = 24;
const DEBOUNCE_MS = 300;

function buildCardsQuery(text: string, rarity: string, setName: string): string {
  const parts: string[] = [];
  const bare = text.trim();
  if (bare) parts.push(bare);
  if (rarity !== "ALL") parts.push(`rarity:"${rarity}"`);
  if (setName !== "ALL") parts.push(`set.name:"${setName}"`);
  return parts.join(" ");
}

export function useCardsSearch(initial: { cards: LiveCard[]; totalCount: number }): {
  state: CardsSearchState;
  query: string;
  setQuery(q: string): void;
  rarity: string;
  setRarity(r: string): void;
  setName: string;
  setSetName(s: string): void;
  setPage(p: number): void;
} {
  const [query, setQueryState] = useState("");
  const [rarity, setRarityState] = useState("ALL");
  const [setName, setSetNameState] = useState("ALL");
  const [page, setPageState] = useState(1);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [state, setState] = useState<CardsSearchState>({
    status: "ready",
    cards: initial.cards,
    totalCount: initial.totalCount,
    page: 1
  });
  const initialRef = useRef(initial);
  const pristineRef = useRef(true);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const pristine =
      debouncedQuery.trim() === "" && rarity === "ALL" && setName === "ALL" && page === 1;
    if (pristine) {
      if (!pristineRef.current) {
        pristineRef.current = true;
        setState({
          status: "ready",
          cards: initialRef.current.cards,
          totalCount: initialRef.current.totalCount,
          page: 1
        });
      }
      return;
    }
    pristineRef.current = false;

    const controller = new AbortController();
    setState((prev) => ({ ...prev, status: "loading", page }));

    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    const q = buildCardsQuery(debouncedQuery, rarity, setName);
    if (q) params.set("q", q);

    fetch(`/api/v1/cards?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`cards request failed with status ${response.status}`);
        const body = (await response.json()) as { data?: unknown; totalCount?: unknown };
        const cards = (Array.isArray(body.data) ? body.data : []).map((item) =>
          apiCardToLiveCard(
            item !== null && typeof item === "object" ? (item as Record<string, unknown>) : {}
          )
        );
        const totalCount = typeof body.totalCount === "number" ? body.totalCount : 0;
        setState({ status: "ready", cards, totalCount, page });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setState((prev) => ({ ...prev, status: "error" }));
      });

    return () => controller.abort();
  }, [debouncedQuery, rarity, setName, page]);

  const setQuery = useCallback((q: string) => {
    setQueryState(q);
    setPageState(1);
  }, []);

  const setRarity = useCallback((r: string) => {
    setRarityState(r);
    setPageState(1);
  }, []);

  const setSetName = useCallback((s: string) => {
    setSetNameState(s);
    setPageState(1);
  }, []);

  const setPage = useCallback((p: number) => {
    setPageState(Math.max(1, Math.floor(p)));
  }, []);

  return { state, query, setQuery, rarity, setRarity, setName, setSetName, setPage };
}
