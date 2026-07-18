# POKEHUB Release Constellation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline). Checkbox steps.

**Goal:** GPU/WebGL 3D orbit view of the Release Radar (release orbs, product moons, cadence constellation, saving ring + HUD save toggle) above the existing calendar.

**Architecture:** Pure source builder (TDD) → shared-theme extraction → client component on the vendored engine → tab integration → ship. Spec: `docs/superpowers/specs/2026-07-17-pokehub-release-constellation-design.md` (exact channels, ids, labels).

**Tech Stack:** Existing only (vendored engine, three r169 already installed). Zero new dependencies.

## Global Constraints

- Vendored engine files untouched. `three` stays lazy (`dynamic(ssr:false)` for the component).
- Channel formulas/ids/labels exactly per spec. Deterministic, no randomness.
- WebGL-unavailable / reduced-motion → one-line note; the HTML calendar stays the accessible path.
- Saving toggle mirrors the existing `useSavingFor` state (single source of truth in ReleaseRadar; component receives ids + toggle via props).
- 2-space, double quotes; test registered in package.json.

### Task 1: `release-source.ts` (TDD)
- [ ] Failing tests per spec Testing section → RED.
- [ ] Implement `buildReleaseFlatNodes` + `TIER_COLOR` → GREEN. Register test file.

### Task 2: Theme extract + component + integration
- [ ] Move `POKE_THEME` from `ConstellationModule.tsx` to `src/lib/constellation/poke-theme.ts`; update import.
- [ ] `ReleaseConstellation.tsx` per spec (provider memo, HUD, guards).
- [ ] `ReleaseRadar.tsx`: dynamic(ssr:false) import; render when ready with savingFor wiring.
- [ ] `npx tsc --noEmit` + `npm test` + `npm run build` green.

### Task 3 (ship)
- [ ] Dev-server DOM smoke: canvas mounts in Release Radar, HUD select works, toggle updates ring/localStorage; fallback note under reduced motion.
- [ ] Commit (bash, no embedded double quotes), push → deploy; live verify tab; memory + report.
