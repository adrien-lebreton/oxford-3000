-- Schéma de la synchronisation (à coller dans Supabase : SQL Editor, Run).
-- Une ligne par utilisateur, la progression complète en JSON.
-- Les règles RLS garantissent que chacun ne lit et n'écrit que sa ligne.

create table public.progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

create policy "select own row" on public.progress
  for select using (auth.uid() = user_id);

create policy "insert own row" on public.progress
  for insert with check (auth.uid() = user_id);

create policy "update own row" on public.progress
  for update using (auth.uid() = user_id);
