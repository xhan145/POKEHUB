export const POKEHUB_PROJECT_TAG =
  process.env.POKEHUB_PROJECT_TAG ??
  process.env.NEXT_PUBLIC_POKEHUB_PROJECT_TAG ??
  "POKE";

export function withProjectTag<T extends Record<string, unknown>>(payload: T) {
  return {
    project_tag: POKEHUB_PROJECT_TAG,
    ...payload
  };
}

export function requireProjectTagFilter() {
  return POKEHUB_PROJECT_TAG;
}
