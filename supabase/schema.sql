-- POKEHUB Supabase schema v0.1
-- Run in Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists data_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  base_url text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists sealed_products (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  product_type text not null default 'sealed_product',
  msrp numeric(10,2),
  currency text not null default 'USD',
  release_date date,
  set_name text,
  created_at timestamptz not null default now()
);

create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  pokemon_tcg_id text unique,
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

create index if not exists idx_market_snapshots_item on market_snapshots(item_kind, item_ref);
create index if not exists idx_market_snapshots_observed_at on market_snapshots(observed_at desc);
create index if not exists idx_value_scores_item on value_scores(item_kind, item_ref, computed_at desc);
