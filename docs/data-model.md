# POKEHUB Data Model

## Identity tables

### cards
Canonical card metadata from Pokemon TCG API.

Key fields:
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
- name
- product_type
- msrp
- currency
- release_date
- set_name

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
