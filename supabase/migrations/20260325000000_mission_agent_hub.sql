-- =============================================================================
-- Migration: Architecture Agents Hub — tabelas de colaboração em tempo real
-- Projeto: gnhewmyhbqxpecfaivmu
-- =============================================================================

-- ── task_board ────────────────────────────────────────────────────────────────
-- Armazena o array de tarefas Kanban (substituindo task-board.json local).
-- Cada linha representa uma "sala" / equipa. Por defeito só existe a linha 'default'.

create table if not exists public.task_board (
  id          text        primary key default 'default',
  tasks       jsonb       not null    default '[]'::jsonb,
  updated_at  timestamptz not null    default now()
);

comment on table public.task_board is
  'Quadro Kanban do Architecture Agents Hub — sincronizado em tempo real via Supabase Realtime.';

comment on column public.task_board.tasks is
  'Array de TaskItem: { id, title, columnId, order, createdAt, priority?, blocked?, assigneeAgentId? }';

-- Trigger para manter updated_at automático
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists task_board_updated_at on public.task_board;
create trigger task_board_updated_at
  before update on public.task_board
  for each row execute function public.set_updated_at();

-- RLS: acesso público para MVP (restringir por auth quando implementar login)
alter table public.task_board enable row level security;
drop policy if exists "task_board_public_select" on public.task_board;
drop policy if exists "task_board_public_all"    on public.task_board;
create policy "task_board_public_select" on public.task_board for select using (true);
create policy "task_board_public_all"    on public.task_board for all    using (true);

-- Replica Identity para capturar o valor novo nos eventos Realtime
alter table public.task_board replica identity full;

-- Linha padrão (sala única para uso imediato)
insert into public.task_board (id, tasks)
values ('default', '[]'::jsonb)
on conflict (id) do nothing;


-- ── office_layout ─────────────────────────────────────────────────────────────
-- Armazena o layout do escritório isométrico (posições de móveis e agentes).
-- Sincronizado via Supabase Broadcast durante arrastar, e upsert ao soltar.

create table if not exists public.office_layout (
  id          text        primary key default 'default',
  layout      jsonb       not null    default '{}'::jsonb,
  updated_at  timestamptz not null    default now()
);

comment on table public.office_layout is
  'Layout do escritório isométrico (posições de móveis + agentes) — Architecture Agents Hub.';

comment on column public.office_layout.layout is
  '{ version: 5, positions: Record<agentId, {x,y}>, furniture: Record<key, {xPct,yPct,...}> }';

drop trigger if exists office_layout_updated_at on public.office_layout;
create trigger office_layout_updated_at
  before update on public.office_layout
  for each row execute function public.set_updated_at();

alter table public.office_layout enable row level security;
drop policy if exists "office_layout_public_select" on public.office_layout;
drop policy if exists "office_layout_public_all"    on public.office_layout;
create policy "office_layout_public_select" on public.office_layout for select using (true);
create policy "office_layout_public_all"    on public.office_layout for all    using (true);

alter table public.office_layout replica identity full;

insert into public.office_layout (id, layout)
values ('default', '{}'::jsonb)
on conflict (id) do nothing;


-- ── Realtime Publications ─────────────────────────────────────────────────────
-- Adiciona as tabelas ao canal supabase_realtime para `postgres_changes`.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'task_board'
  ) then
    alter publication supabase_realtime add table public.task_board;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'office_layout'
  ) then
    alter publication supabase_realtime add table public.office_layout;
  end if;
end;
$$;
