-- ============================================================================
--  Tabela e kontributeve VGI (Faza 3) per Supabase / PostgreSQL + PostGIS
--  Ekzekuto kete ne Supabase: SQL Editor -> New query -> Run
-- ============================================================================

-- Aktivizo PostGIS (Supabase: nje here)
create extension if not exists postgis;

create table if not exists public.contributions (
  id          bigint generated always as identity primary key,
  fclass      text not null check (fclass in ('bank','atm')),
  name        text not null default '(pa emer)',
  banka       text,
  lon         double precision not null,
  lat         double precision not null,
  geom        geometry(Point, 4326),
  status      text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at  timestamptz not null default now()
);

-- Mbush automatikisht gjeometrine nga lon/lat
create or replace function public.set_geom() returns trigger as $$
begin
  new.geom := st_setsrid(st_makepoint(new.lon, new.lat), 4326);
  return new;
end; $$ language plpgsql;

drop trigger if exists trg_set_geom on public.contributions;
create trigger trg_set_geom before insert or update on public.contributions
  for each row execute function public.set_geom();

-- ------------------------------------------------------------------
-- RLS: editim i KUFIZUAR (pika 6a)
--   - kushdo mund te INSERT (kontribut), por vetem si 'pending'
--   - kushdo mund te SELECT vetem rreshtat 'approved' (+ pending per harten)
--   - vetem prodhuesi (rolet e autentikuar/admin) aprovon/fshin
-- ------------------------------------------------------------------
alter table public.contributions enable row level security;

-- Lexim publik (pending + approved) per shfaqje ne harte
create policy "lexim publik" on public.contributions
  for select using (status in ('pending','approved'));

-- Shtim publik, gjithmone si pending (editim i kufizuar)
create policy "shtim publik si pending" on public.contributions
  for insert with check (status = 'pending');

-- Update/Delete: vetem perdorues te autentikuar (moderatori/prodhuesi)
create policy "moderim vetem i autentikuar" on public.contributions
  for update using (auth.role() = 'authenticated');
create policy "fshirje vetem i autentikuar" on public.contributions
  for delete using (auth.role() = 'authenticated');

-- (OPSIONALE) Lejo fshirjen PUBLIKE vetem te rreshtave 'pending', qe perdoruesi
-- te mund te fshije pikat qe shtoi vete (butoni "Fshi" ne hartë). Ekzekuto nese e do.
create policy "fshirje publike e pending" on public.contributions
  for delete using (status = 'pending');

create index if not exists idx_contrib_status on public.contributions(status);
create index if not exists idx_contrib_geom on public.contributions using gist(geom);
