# POKEHUB Data Model

POKEHUB runs in shared database mode. Every project-owned row includes `project_tag = POKE`.

Reads from shared tables must filter by project tag unless using a `poke_*` view. Uniqueness is scoped by project tag.

## Identity tables

### cards
Canonical card metadata from Pokemon TCG API.

Key fields:
- project_tag
- pokemon_tcg_id
- name
- set_id
- set_name
- number
- rarity
- artist
- supertype
- subtypes
- image_small
- image_large
- raw_json

### sealed_products
Manual and scraped product catalog.

Key fields:
- project_tag
- name
- product_type
- msrp
- currency
- release_date
- set_name

## Market facts

### market_snapshots
Append-only pricing observations.

Key fields include `project_tag`, `item_kind`, `item_ref`, `source`, `observed_at`, low/mid/high/market prices, active listings, sold counts, and confidence.

Sources can include:
- pokemon_tcg_api
- pricecharting
- ebay
- manual
- psa_pop
- cgc_pop
- bgs_pop

Never overwrite old observations. The market is a flipbook, not a sticky note.

## Scores

### value_scores
Computed daily or after ingestion.

Main score:
- value_signal_score

Component scores:
- liquidity_score
- sold_velocity_score
- rarity_score
- grade_scarcity_score
- character_demand_score
- set_age_score
- condition_confidence_score
- market_spread_score
- source_freshness_score

## Operations

### ingestion_runs
One row per ingestion attempt, written by the `/api/ingest/*` routes (and readable through `GET /api/sources/status` as each adapter's `lastRun`). Append-only; the latest row per `source_id` is the source's freshness signal.

Key fields:
- project_tag
- source_id (adapter id, e.g. `pokemon-tcg`, `manual-csv`, or the snapshot `source` for `/api/ingest/market-snapshot`)
- status (`success`, `error`, or `partial`)
- started_at / finished_at
- inserted / updated / skipped (row counts for the run)
- error_message (populated for `error` and `partial` runs; never contains secret values)

Reads go through the `poke_ingestion_runs` view or filter `project_tag = 'POKE'`. Writes happen server-side only via the service-role client; ingest routes are gated by the `x-pokehub-ingest-token` header matching `POKEHUB_INGEST_TOKEN`.
