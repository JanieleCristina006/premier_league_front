alter table public.participants
add column if not exists pontos_rodada_anterior integer not null default 0;

alter table public.participants
add column if not exists cravadas_rodada_anterior integer not null default 0;

create table if not exists public.total_pontos (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  round integer not null,
  season integer not null,
  pontos integer not null default 0,
  cravadas integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (participant_id, round, season)
);

alter table public.total_pontos enable row level security;

drop policy if exists "total_pontos_select" on public.total_pontos;
create policy "total_pontos_select"
on public.total_pontos
for select
using (true);

drop policy if exists "total_pontos_insert_auth" on public.total_pontos;
create policy "total_pontos_insert_auth"
on public.total_pontos
for insert
to authenticated
with check (true);

drop policy if exists "total_pontos_update_auth" on public.total_pontos;
create policy "total_pontos_update_auth"
on public.total_pontos
for update
to authenticated
using (true)
with check (true);

create or replace function public.set_total_pontos_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_total_pontos_updated_at on public.total_pontos;
create trigger set_total_pontos_updated_at
before update on public.total_pontos
for each row
execute function public.set_total_pontos_updated_at();
