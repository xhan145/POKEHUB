import assert from "node:assert/strict";
import test from "node:test";

import {
  POKEHUB_PROJECT_TAG,
  withProjectTag,
  projectScopedFilterDescription
} from "./project-tag";

test("project tag defaults to POKE", () => {
  assert.equal(POKEHUB_PROJECT_TAG, "POKE");
});

test("withProjectTag maps project ownership to shared table project_tag", () => {
  assert.deepEqual(withProjectTag({ name: "Booster Bundle" }), {
    name: "Booster Bundle",
    project_tag: "POKE"
  });
});

test("projectScopedFilterDescription documents the required Supabase filter", () => {
  assert.equal(projectScopedFilterDescription("cards"), 'cards.eq("project_tag", "POKE")');
});
