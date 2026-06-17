-- Cordon — Supabase schema (PRD §11). Apply in the Supabase SQL editor.
-- Writes happen via the SECRET key (bypasses RLS); the publishable key reads under RLS.

create table if not exists policies (
  id uuid primary key default gen_random_uuid(),
  institution_addr text not null,
  onchain_addr text not null,
  min_tier int not null,
  freshness_window bigint not null,
  require_clean_blacklist boolean not null,
  allowed_groups text[] not null default '{}',
  operating_addr text,
  quarantine_addr text,
  created_at timestamptz not null default now()
);

create table if not exists deposits (
  id uuid primary key default gen_random_uuid(),
  deposit_id text unique not null,
  sender_addr text not null,
  amount text not null,
  atoken text not null,
  verdict text not null check (verdict in ('cleared', 'quarantined')),
  reason int not null,
  reason_label text,
  sender_kyc_hash text,
  sender_tier int,
  sender_group text,
  attestation_hash text,
  inbound_tx text,
  routing_tx text,
  verdict_tx text not null,
  explorer_url text,
  screened_at timestamptz not null
);

create index if not exists deposits_screened_at_idx on deposits (screened_at desc);
create index if not exists deposits_verdict_idx on deposits (verdict);

create table if not exists apass_cache (
  chain text not null,
  address text not null,
  tier text,
  group_id text,
  status int,
  expiration bigint,
  kyc_hash text,
  fetched_at timestamptz not null default now(),
  primary key (chain, address)
);

alter table policies enable row level security;
alter table deposits enable row level security;
alter table apass_cache enable row level security;

-- Demo read access: audit data is non-PII (KYC hashes only). Tighten per-institution for production.
drop policy if exists "public read deposits" on deposits;
create policy "public read deposits" on deposits for select to anon, authenticated using (true);

drop policy if exists "public read policies" on policies;
create policy "public read policies" on policies for select to anon, authenticated using (true);
