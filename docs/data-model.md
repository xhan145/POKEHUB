# POKEHUB Data Model

POKEHUB is designed to run in a shared Supabase/Postgres database.

Every project-owned row must include:

- `project_tag`
- Default value: `POKE`

This allows POKEHUB to share tables with other dashboards or tools while keeping Pokémon records separated by a simple namespace filter.

## Required query rule

Every read/write query must filter or insert using:

```sql
project_tag = 'POKE'
```

The repo also includes helper views:

- `poke_data_sources`
- `poke_sealed_products`
- `poke_cards`
- `poke_market_snapshots`
- `poke_value_scores`

Use these views for simple POKEHUB-only reads.

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

Uniqueness:
- `project_tag + pokemon_tcg_id`

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

Uniqueness:
- `project_tag + name`

## Market facts

### market_snapshots
Append-only pricing observations.

Sources can include:
- pokemon_tcg_api
- pricecharting
- ebay
- manual
- psa_pop
- cgc_pop
- bgs_pop

Never overwrite old observations. The market is a flipbook, not a sticky note.

Indexes include `project_tag`, `item_kind`, `item_ref`, and `observed_at` so POKEHUB can pull only its own market history from a shared database.

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

## Shared database safety checklist

- Never create global uniqueness constraints on card/product names.
- Always use composite uniqueness with `project_tag`.
- Never query raw tables without a `project_tag` filter unless building an admin/global view.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in browser code.
- Keep `.env.local` uncommitted.
