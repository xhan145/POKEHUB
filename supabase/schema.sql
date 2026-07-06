-- POKEHUB Supabase schema v0.2
-- Shared-database mode: every row is scoped by project_tag = 'POKE'.
-- Run in Supabase SQL editor. Safe to rerun.

create extension if not exists pgcrypto;

create table if not exists data_sources (
  id uuid primary key default gen_random_uuid(),
  project_tag text not null default 'POKE',
  name text not null,
  base_url text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists sealed_products (
  id uuid primary key default gen_random_uuid(),
  project_tag text not null default 'POKE',
  name text not null,
  product_type text not null default 'sealed_product',
  msrp numeric(10,2),
  currency text not null default 'USD',
  release_date date,
  set_name text,
  created_at timestamptz not null default now()
);

create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  project_tag text not null default 'POKE',
  pokemon_tcg_id text,
  name text not null,
  set_id text,
  set_name text,
  number text,
  rarity text,
  artist text,
  supertype text,
  subtypes text[],
  image_small text,
  image_large text,
  raw_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists market_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_tag text not null default 'POKE',
  item_kind text not null check (item_kind in ('card', 'sealed_product')),
  item_ref text not null,
  source text not null,
  observed_at timestamptz not null default now(),
  low numeric(12,2),
  mid numeric(12,2),
  high numeric(12,2),
  market numeric(12,2),
  direct_low numeric(12,2),
  active_listings integer,
  sold_count integer,
  yearly_sales_volume integer,
  confidence_score numeric(5,2) not null default 50,
  raw_json jsonb
);

create table if not exists value_scores (
  id uuid primary key default gen_random_uuid(),
  project_tag text not null default 'POKE',
  item_kind text not null check (item_kind in ('card', 'sealed_product')),
  item_ref text not null,
  computed_at timestamptz not null default now(),
  liquidity_score numeric(5,2),
  sold_velocity_score numeric(5,2),
  rarity_score numeric(5,2),
  grade_scarcity_score numeric(5,2),
  character_demand_score numeric(5,2),
  set_age_score numeric(5,2),
  condition_confidence_score numeric(5,2),
  market_spread_score numeric(5,2),
  source_freshness_score numeric(5,2),
  value_signal_score numeric(5,2),
  explanation jsonb
);

-- Upgrade path for databases that already ran the v0.1 schema.
alter table if exists data_sources add column if not exists project_tag text not null default 'POKE';
alter table if exists sealed_products add column if not exists project_tag text not null default 'POKE';
alter table if exists cards add column if not exists project_tag text not null default 'POKE';
alter table if exists market_snapshots add column if not exists project_tag text not null default 'POKE';
alter table if exists value_scores add column if not exists project_tag text not null default 'POKE';

-- Remove old global uniqueness constraints so other apps/tags can share these tables.
alter table if exists data_sources drop constraint if exists data_sources_name_key;
alter table if exists sealed_products drop constraint if exists sealed_products_name_key;
alter table if exists cards drop constraint if exists cards_pokemon_tcg_id_key;

-- Tag-scoped uniqueness and lookup indexes.
create unique index if not exists idx_data_sources_project_name_uq
  on data_sources(project_tag, name);

create unique index if not exists idx_sealed_products_project_name_uq
  on sealed_products(project_tag, name);

create unique index if not exists idx_cards_project_pokemon_tcg_id_uq
  on cards(project_tag, pokemon_tcg_id)
  where pokemon_tcg_id is not null;

create index if not exists idx_market_snapshots_project_item
  on market_snapshots(project_tag, item_kind, item_ref);

create index if not exists idx_market_snapshots_project_observed_at
  on market_snapshots(project_tag, observed_at desc);

create index if not exists idx_value_scores_project_item
  on value_scores(project_tag, item_kind, item_ref, computed_at desc);

-- Convenience views for the POKEHUB slice of a shared database.
create or replace view poke_data_sources as
  select * from data_sources where project_tag = 'POKE';

create or replace view poke_sealed_products as
  select * from sealed_products where project_tag = 'POKE';

create or replace view poke_cards as
  select * from cards where project_tag = 'POKE';

create or replace view poke_market_snapshots as
  select * from market_snapshots where project_tag = 'POKE';

create or replace view poke_value_scores as
  select * from value_scores where project_tag = 'POKE';
