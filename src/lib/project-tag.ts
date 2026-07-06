import type { ProjectTag } from "@/types/pokehub";

export const POKEHUB_PROJECT_TAG = (process.env.POKEHUB_PROJECT_TAG ||
  process.env.NEXT_PUBLIC_POKEHUB_PROJECT_TAG ||
  "POKE") as ProjectTag;

export function withProjectTag<T extends Record<string, unknown>>(row: T) {
  return {
    ...row,
    project_tag: POKEHUB_PROJECT_TAG
  };
}

export function projectScopedFilterDescription(tableName: string) {
  return `${tableName}.eq("project_tag", "${POKEHUB_PROJECT_TAG}")`;
}

export function toProjectTag(projectTag?: string): ProjectTag {
  return (projectTag || POKEHUB_PROJECT_TAG) as ProjectTag;
}
