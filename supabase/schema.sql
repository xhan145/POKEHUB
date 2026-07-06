-- POKEHUB Supabase schema v0.2
-- Source of truth for a shared Supabase/Postgres database.
-- All POKEHUB-owned rows use project_tag = 'POKE'.

create extension if not exists pgcrypto;

create table if not exists public.data_sources (
  id uuid primary key default gen_random_uuid(),
  project_tag text not null default 'POKE',
  name text not null,
  base_url text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.sealed_products (
  id uuid primary key default gen_random_uuid(),
  project_tag text not null default 'POKE',
  name text not null,
  product_type text not null default 'sealed_product',
  msrp numeric(10,2),
  currency text not null default 'USD',
  release_date date,
  set_name text,
  source text not null default 'manual_seed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cards (
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

create table if not exists public.market_snapshots (
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

create table if not exists public.value_scores (
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

create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  project_tag text not null default 'POKE',
  item_name text not null,
  item_kind text not null check (item_kind in ('card', 'sealed_product')),
  quantity integer not null default 1,
  acquisition_cost numeric(12,2) not null default 0,
  current_estimated_value numeric(12,2) not null default 0,
  status text not null default 'watch' check (status in ('watch', 'hold', 'grade', 'sell', 'avoid')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.data_sources add column if not exists project_tag text not null default 'POKE';
alter table public.sealed_products add column if not exists project_tag text not null default 'POKE';
alter table public.sealed_products add column if not exists source text not null default 'manual_seed';
alter table public.sealed_products add column if not exists updated_at timestamptz not null default now();
alter table public.cards add column if not exists project_tag text not null default 'POKE';
alter table public.market_snapshots add column if not exists project_tag text not null default 'POKE';
alter table public.value_scores add column if not exists project_tag text not null default 'POKE';

alter table public.data_sources drop constraint if exists data_sources_name_key;
alter table public.sealed_products drop constraint if exists sealed_products_name_key;
alter table public.cards drop constraint if exists cards_pokemon_tcg_id_key;

create unique index if not exists data_sources_project_name_key on public.data_sources(project_tag, name);
create unique index if not exists sealed_products_project_name_key on public.sealed_products(project_tag, name);
-- Full (non-partial) unique index: PostgREST cannot infer partial unique indexes for
-- ON CONFLICT upserts, and Postgres already treats NULL pokemon_tcg_id rows as distinct.
drop index if exists cards_project_pokemon_tcg_id_key;
create unique index if not exists cards_project_pokemon_tcg_id_key on public.cards(project_tag, pokemon_tcg_id);

create index if not exists idx_sealed_products_project on public.sealed_products(project_tag, name);
create index if not exists idx_cards_project on public.cards(project_tag, set_id, number);
create index if not exists idx_market_snapshots_item on public.market_snapshots(project_tag, item_kind, item_ref);
create index if not exists idx_market_snapshots_observed_at on public.market_snapshots(project_tag, observed_at desc);
create index if not exists idx_value_scores_item on public.value_scores(project_tag, item_kind, item_ref, computed_at desc);
create index if not exists idx_portfolio_items_project on public.portfolio_items(project_tag, item_kind, status);

create or replace view public.poke_sealed_products
with (security_invoker = true) as
select * from public.sealed_products where project_tag = 'POKE';

create or replace view public.poke_cards
with (security_invoker = true) as
select * from public.cards where project_tag = 'POKE';

create or replace view public.poke_market_snapshots
with (security_invoker = true) as
select * from public.market_snapshots where project_tag = 'POKE';

create or replace view public.poke_value_scores
with (security_invoker = true) as
select * from public.value_scores where project_tag = 'POKE';

create or replace view public.poke_portfolio_items
with (security_invoker = true) as
select * from public.portfolio_items where project_tag = 'POKE';

alter table public.data_sources enable row level security;
alter table public.sealed_products enable row level security;
alter table public.cards enable row level security;
alter table public.market_snapshots enable row level security;
alter table public.value_scores enable row level security;
alter table public.portfolio_items enable row level security;

drop policy if exists "POKE rows are readable" on public.data_sources;
drop policy if exists "POKE rows are readable" on public.sealed_products;
drop policy if exists "POKE rows are readable" on public.cards;
drop policy if exists "POKE rows are readable" on public.market_snapshots;
drop policy if exists "POKE rows are readable" on public.value_scores;
drop policy if exists "POKE rows are readable" on public.portfolio_items;

create policy "POKE rows are readable" on public.data_sources for select to anon, authenticated using (project_tag = 'POKE');
create policy "POKE rows are readable" on public.sealed_products for select to anon, authenticated using (project_tag = 'POKE');
create policy "POKE rows are readable" on public.cards for select to anon, authenticated using (project_tag = 'POKE');
create policy "POKE rows are readable" on public.market_snapshots for select to anon, authenticated using (project_tag = 'POKE');
create policy "POKE rows are readable" on public.value_scores for select to anon, authenticated using (project_tag = 'POKE');
create policy "POKE rows are readable" on public.portfolio_items for select to anon, authenticated using (project_tag = 'POKE');

grant select on public.poke_sealed_products to anon, authenticated;
grant select on public.poke_cards to anon, authenticated;
grant select on public.poke_market_snapshots to anon, authenticated;
grant select on public.poke_value_scores to anon, authenticated;
grant select on public.poke_portfolio_items to anon, authenticated;

grant select on public.data_sources, public.sealed_products, public.cards, public.market_snapshots, public.value_scores, public.portfolio_items to anon, authenticated;
grant select, insert, update, delete on public.data_sources, public.sealed_products, public.cards, public.market_snapshots, public.value_scores, public.portfolio_items to service_role;

create table if not exists public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  project_tag text not null default 'POKE',
  source_id text not null,
  status text not null check (status in ('success', 'error', 'partial')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  inserted integer not null default 0,
  updated integer not null default 0,
  skipped integer not null default 0,
  error_message text
);

create index if not exists idx_ingestion_runs_source on public.ingestion_runs(project_tag, source_id, started_at desc);

create or replace view public.poke_ingestion_runs
with (security_invoker = true) as
select * from public.ingestion_runs where project_tag = 'POKE';

alter table public.ingestion_runs enable row level security;
drop policy if exists "POKE rows are readable" on public.ingestion_runs;
create policy "POKE rows are readable" on public.ingestion_runs for select to anon, authenticated using (project_tag = 'POKE');
grant select on public.poke_ingestion_runs to anon, authenticated;
grant select on public.ingestion_runs to anon, authenticated;
grant select, insert, update, delete on public.ingestion_runs to service_role;
