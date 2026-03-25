/**
 * Zustand store para o quadro Kanban.
 *
 * - Modo offline (sem Supabase): persiste em localStorage + API local (comportamento anterior).
 * - Modo realtime (Supabase configurado): sincroniza em tempo real com a tabela `task_board`.
 *   Todos os clientes conectados recebem atualizações via canal Supabase Realtime.
 *
 * Setup Supabase (uma vez, no painel do projeto):
 *   Ver o esquema SQL em src/lib/supabase.ts → SUPABASE_SCHEMA_HINT
 */
import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { TaskItem } from '@/components/task-canvas/types';

const LOCAL_STORAGE_KEY = 'mission-agent-task-board-v1';
const SUPABASE_TABLE = 'task_board';
const SUPABASE_ROW_ID = 'default';

// ── helpers ──────────────────────────────────────────────────────────────────

function loadFromLocalStorage(): TaskItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as { tasks?: unknown[] };
    return Array.isArray(p.tasks) ? (p.tasks as TaskItem[]) : [];
  } catch {
    return [];
  }
}

function saveToLocalStorage(tasks: TaskItem[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ tasks }));
  } catch {
    /* ignore */
  }
}

// ── store interface ───────────────────────────────────────────────────────────

export type TaskBoardState = {
  tasks: TaskItem[];
  /** Verdadeiro quando o canal Supabase Realtime está subscrito. */
  realtimeConnected: boolean;
  /** Actualiza o estado local + persiste (localStorage + Supabase se configurado). */
  setTasks: (tasks: TaskItem[]) => void;
  /** Carrega o estado inicial: Supabase → fallback localStorage. */
  bootstrap: () => Promise<void>;
  /** Liga/desliga o canal Realtime (chamado uma vez no arranque).
   * `onRemoteTasks` é invocado quando outro cliente actualiza o quadro. */
  subscribeRealtime: (onRemoteTasks: (tasks: TaskItem[]) => void) => () => void;
};

// ── store ─────────────────────────────────────────────────────────────────────

let syncTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleServerSync(tasks: TaskItem[]) {
  // Fire-and-forget debounced sync to local Express API.
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    fetch('/api/aiox/task-board', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks }),
    }).catch(() => {/* offline */});
  }, 500);
}

export const useTaskBoardStore = create<TaskBoardState>((set, get) => ({
  tasks: loadFromLocalStorage(),
  realtimeConnected: false,

  setTasks(tasks) {
    set({ tasks });
    saveToLocalStorage(tasks);
    scheduleServerSync(tasks);

    if (!isSupabaseConfigured || !supabase) return;
    // Upsert to Supabase (optimistic — don't await in the setter).
    supabase
      .from(SUPABASE_TABLE)
      .upsert({ id: SUPABASE_ROW_ID, tasks, updated_at: new Date().toISOString() })
      .then(({ error }) => {
        if (error) console.warn('[supabase] task_board upsert failed:', error.message);
      });
  },

  async bootstrap() {
    if (!isSupabaseConfigured || !supabase) return; // use localStorage initial state
    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .select('tasks')
      .eq('id', SUPABASE_ROW_ID)
      .maybeSingle();
    if (error) {
      console.warn('[supabase] task_board fetch failed:', error.message);
      return;
    }
    if (data?.tasks && Array.isArray(data.tasks) && data.tasks.length > 0) {
      set({ tasks: data.tasks as TaskItem[] });
      saveToLocalStorage(data.tasks as TaskItem[]);
    }
  },

  subscribeRealtime(onRemoteTasks) {
    if (!isSupabaseConfigured || !supabase) return () => {};
    const sb = supabase;

    const channel = sb
      .channel('task-board-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: SUPABASE_TABLE, filter: `id=eq.${SUPABASE_ROW_ID}` },
        (payload) => {
          // Received remote change — update local state (skip if from this tab via optimistic).
          const remoteTasks = (payload.new as { tasks?: TaskItem[] })?.tasks;
          if (!Array.isArray(remoteTasks)) return;
          const current = get().tasks;
          const currentJson = JSON.stringify(current);
          const remoteJson = JSON.stringify(remoteTasks);
          if (currentJson !== remoteJson) {
            set({ tasks: remoteTasks });
            saveToLocalStorage(remoteTasks);
            onRemoteTasks(remoteTasks);
          }
        }
      )
      .subscribe((status) => {
        set({ realtimeConnected: status === 'SUBSCRIBED' });
      });

    return () => {
      sb.removeChannel(channel);
      set({ realtimeConnected: false });
    };
  },
}));
