-- ============================================================================
--  Tabela e RAPORTIMEVE (ATM nuk punon, etj.) per Supabase / PostgreSQL
--  Ekzekuto ne Supabase: SQL Editor -> New query -> Run
-- ============================================================================

create table if not exists public.reports (
  id          bigint generated always as identity primary key,
  fclass      text not null check (fclass in ('bank','atm')),
  banka       text,
  problem     text not null check (problem in
                ('nuk_punon','jashte_sherbimit','vendndodhje_gabim','mbyllur','tjeter')),
  koment      text,
  name        text,
  lon         double precision,
  lat         double precision,
  status      text not null default 'pending' check (status in ('pending','reviewed','closed')),
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- RLS: kushdo mund te RAPORTOJE (insert si pending), por leximi/moderimi
--      vetem per perdorues te autentikuar (prodhuesi/banka).
-- ------------------------------------------------------------------
alter table public.reports enable row level security;

-- Shtim publik, gjithmone si pending
create policy "raportim publik" on public.reports
  for insert with check (status = 'pending');

-- Lexim vetem per te autentikuar (moderatori/banka)
create policy "lexim raporti vetem i autentikuar" on public.reports
  for select using (auth.role() = 'authenticated');

-- Update/Delete vetem per te autentikuar
create policy "moderim raporti" on public.reports
  for update using (auth.role() = 'authenticated');
create policy "fshirje raporti" on public.reports
  for delete using (auth.role() = 'authenticated');

create index if not exists idx_reports_status on public.reports(status);
