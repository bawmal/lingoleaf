-- supabase.sql — LingoLeaf plants table, indexes, RLS, and seed
-- Run in Supabase SQL Editor or psql connected to your project

-- 0) Extensions (for gen_random_uuid)
create extension if not exists pgcrypto;

-- 1) Table
create table if not exists public.plants (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  email             text,
  phone_e164        text not null,
  city              text,
  country           text,
  lat               double precision,
  lon               double precision,
  species           text not null,
  nickname          text,
  personality       text check (personality in ('sassy','zen','anxious','formal')) not null,
  pot_size          text check (pot_size in ('small','medium','large')) not null,
  pot_material      text check (pot_material in ('plastic','terracotta','ceramic-drainage','ceramic-no-drainage','other')) not null,
  light_exposure    text check (light_exposure in (
    'north','south','east','west',
    'indoor-north','indoor-east','indoor-west','indoor-south','indoor-away',
    'covered-north','covered-east','covered-west','covered-south',
    'exposed-north','exposed-east','exposed-west','exposed-south'
  )) not null,
  base_hours        integer not null,
  winter_multiplier numeric not null,
  adjusted_hours    integer not null,
  calibration_hours integer not null default 0,
  last_watered_ts   bigint not null,
  next_due_ts       bigint not null,
  timezone          text not null default 'America/Toronto'
);

-- 2) Indexes
create index if not exists plants_next_due_idx on public.plants (next_due_ts);
create index if not exists plants_phone_idx on public.plants (phone_e164);

-- 3) Row Level Security
alter table public.plants enable row level security;

-- Recommended: use the SERVICE ROLE key in Netlify (no RLS policies required for service role).
-- If you must use anon key from client-side code, uncomment minimal policies below and
-- configure JWT with a phone claim that matches phone_e164.

/*
create policy "anon_select_own"
on public.plants for select
using ( (auth.jwt() ->> 'phone') is not null and phone_e164 = auth.jwt() ->> 'phone' );

create policy "anon_insert_any"
on public.plants for insert
with check (true);

create policy "anon_update_own"
on public.plants for update
using ( (auth.jwt() ->> 'phone') is not null and phone_e164 = auth.jwt() ->> 'phone' );
*/

-- 4) Seed example
insert into public.plants
  (email, phone_e164, city, country, lat, lon,
   species, nickname, personality,
   pot_size, pot_material, light_exposure,
   base_hours, winter_multiplier, adjusted_hours,
   calibration_hours, last_watered_ts, next_due_ts, timezone)
values
  ('test@lingoleaf.app', '+16475550123', 'Toronto', 'Canada', 43.6532, -79.3832,
   'Monstera Deliciosa', 'Leafy', 'sassy',
   'large', 'terracotta', 'south',
   216, 2.0, 195, 0,
   (extract(epoch from now())*1000)::bigint,
   ((extract(epoch from now())*1000)::bigint) + 195*3600*1000,
   'America/Toronto')
on conflict do nothing;
