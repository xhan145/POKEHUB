# POKEHUB

Pixelated Pokémon card market intelligence dashboard.

POKEHUB is designed to standardize sealed product MSRP, individual card metadata, condition/grade information, marketplace snapshots, population signals, sales velocity, and value-risk scoring into one dashboard.

> Status: repo scaffold. The app now supports shared Supabase database mode using `project_tag = 'POKE'`.

## Core idea

A card or sealed product should never be treated as "just a price." POKEHUB stores identity, condition, grade, rarity, set context, marketplace liquidity, spread, population, image confidence, source freshness, and comparable sales history as separate variables.

That lets the dashboard answer:

- What is this item worth right now?
- How far above MSRP is a sealed product trading?
- Is the price real demand or thin-market noise?
- Are listings plentiful but sales weak?
- Is the card valuable because of rarity, playability, character demand, grade scarcity, sealed scarcity, or hype?
- Which products are undervalued relative to their historical spread and velocity?

## Shared database mode

POKEHUB can live inside the same Supabase/Postgres database as other projects.

Every POKEHUB-owned row is scoped with:

```txt
project_tag = POKE
```

This prevents Pokémon data from colliding with other app data in shared tables.

Required environment variables:

```env
NEXT_PUBLIC_POKEHUB_PROJECT_TAG=POKE
POKEHUB_PROJECT_TAG=POKE
```

Required query rule:

```sql
select * from sealed_products where project_tag = 'POKE';
select * from cards where project_tag = 'POKE';
select * from market_snapshots where project_tag = 'POKE';
```

The schema also creates POKEHUB-only views:

- `poke_data_sources`
- `poke_sealed_products`
- `poke_cards`
- `poke_market_snapshots`
- `poke_value_scores`

Use the views when you want the clean POKEHUB slice of the shared database.

## Stack

- Frontend: Next.js, TypeScript, Tailwind CSS
- UI feel: pixelated game dashboard, CRT glow, 8-bit panels, rarity color chips
- Charts: Recharts
- Database: Supabase Postgres, shared-database compatible through `project_tag`
- Workers: TypeScript ingestion scripts
- Data sources:
  - Pokémon TCG API for canonical card, set, image, legality, rarity, and TCGplayer/Cardmarket embedded fields
  - PriceCharting for graded/current value snapshots where available
  - eBay Browse API for active listing supply and listing-price signals
  - Manual CSV imports for MSRP, local comps, PSA pop reports, collector notes, and sealed inventory

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the app locally and import the MSRP seed file from `src/data/msrp-seed.json`.

## Supabase setup

Run the shared database schema in Supabase SQL Editor:

```txt
supabase/schema.sql
```

The schema is safe to rerun. If an earlier POKEHUB schema already exists, it adds `project_tag`, removes old global uniqueness constraints, and replaces them with tag-scoped uniqueness.

## Create the GitHub repo

```bash
gh repo create xhan145/POKEHUB --public --description "Pixelated Pokemon TCG market intelligence dashboard"
git init
git add .
git commit -m "Initial POKEHUB scaffold"
git branch -M main
git remote add origin https://github.com/xhan145/POKEHUB.git
git push -u origin main
```

## Dashboard modules

### 1. Market Arcade

Top-level cards:

- Total tracked items
- Total sealed MSRP basis
- Market value estimate
- Above-MSRP delta
- Biggest movers
- Highest confidence signals
- Lowest confidence warnings

### 2. Sealed Product Dex

For ETBs, tins, figure collections, battle decks, booster bundles, UPCs, and special boxes.

Fields:

- Product name
- MSRP
- Current low/mid/market/listing estimate
- Above MSRP %
- Active listings
- Sold comps
- Sales velocity
- Sealed premium score
- Reprint risk
- Source freshness

### 3. Card Value Lab

For individual cards.

Fields:

- Card identity
- Set
- Number
- Rarity
- Variant
- Finish
- Language
- Condition
- Grade
- Population
- Last sale
- Market spread
- Liquidity score
- Demand score
- Volatility score
- Confidence score

### 4. Pixel Portfolio

Track owned items:

- Quantity
- Acquisition cost
- Current estimate
- Unrealized gain/loss
- Grading candidates
- Sell/hold/watch flags

### 5. Signal Radar

Risk and opportunity engine:

- Under-MSRP sealed opportunities
- High spread / low liquidity traps
- Fresh reprint warnings
- Grade arbitrage candidates
- Character hype spikes
- Low-population grails
- Fast-velocity commons/uncommons

## Value scoring model

POKEHUB computes a normalized `value_signal_score` from 0-100.

Suggested first formula:

```txt
value_signal_score =
  0.22 * liquidity_score +
  0.18 * sold_velocity_score +
  0.15 * rarity_score +
  0.12 * grade_scarcity_score +
  0.10 * character_demand_score +
  0.08 * set_age_score +
  0.07 * condition_confidence_score +
  0.05 * market_spread_score +
  0.03 * source_freshness_score
```

For sealed products, use `sealed_signal_score`:

```txt
sealed_signal_score =
  0.28 * above_msrp_score +
  0.20 * sealed_sales_velocity_score +
  0.15 * product_type_demand_score +
  0.12 * set_popularity_score +
  0.10 * supply_absorption_score +
  0.08 * reprint_risk_inverse +
  0.07 * source_freshness_score
```

## Important disclaimer

POKEHUB is an analysis tool, not financial advice. Trading cards are volatile collectibles. Data sources can be incomplete, delayed, biased by listing noise, or affected by fake sales, grading variance, reprints, and market hype.
