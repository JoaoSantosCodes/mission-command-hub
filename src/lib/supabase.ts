/**
 * Supabase client — opcional. Só ativo se VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
 * estiverem definidos no .env. Quando ausentes, o Hub funciona 100% offline/local.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured =
  typeof supabaseUrl === 'string' &&
  supabaseUrl.startsWith('https://') &&
  typeof supabaseAnonKey === 'string' &&
  supabaseAnonKey.length > 10;

/**
 * Cliente Supabase. `null` quando não configurado — use `isSupabaseConfigured` para
 * verificar antes de chamar qualquer método.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

/** Schema SQL para criar as tabelas no painel do Supabase (executa uma vez).
 *
 * ```sql
 * -- task_board: armazena o array de tarefas Kanban por sessão
 * create table if not exists public.task_board (
 *   id text primary key default 'default',
 *   tasks jsonb not null default '[]',
 *   updated_at timestamptz not null default now()
 * );
 * alter table public.task_board enable row level security;
 * create policy "public read" on public.task_board for select using (true);
 * create policy "public write" on public.task_board for all using (true);
 *
 * -- office_layout: armazena posições de móveis e agentes
 * create table if not exists public.office_layout (
 *   id text primary key default 'default',
 *   layout jsonb not null default '{}',
 *   updated_at timestamptz not null default now()
 * );
 * alter table public.office_layout enable row level security;
 * create policy "public read" on public.office_layout for select using (true);
 * create policy "public write" on public.office_layout for all using (true);
 * ```
 */
export const SUPABASE_SCHEMA_HINT = '-- ver comentário em src/lib/supabase.ts';
