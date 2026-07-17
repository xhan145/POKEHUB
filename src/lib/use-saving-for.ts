"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "pokehub.savingFor";

function readStored(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function useSavingFor(): { ids: string[]; toggle(id: string): void; has(id: string): boolean } {
  const [ids, setIds] = useState<string[]>([]);

  // localStorage is browser-only; read after mount so SSR markup stays stable.
  useEffect(() => {
    setIds(readStored());
  }, []);

  const toggle = (id: string) => {
    setIds((current) => {
      const next = current.includes(id) ? current.filter((existing) => existing !== id) : [...current, id];
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage may be unavailable (private mode); the toggle still works for the session.
      }
      return next;
    });
  };

  return { ids, toggle, has: (id) => ids.includes(id) };
}
