import { useCallback, useEffect, useMemo, useRef, useState } from 'react';


import type { ColumnId, TaskItem, TaskPriority } from './types';

import {
  getTaskBoard,
  postActivityEvent,
  putTaskBoard,
  TASK_BOARD_CONFLICT_ERROR,
} from '@/lib/api';
import { pickDisplayName } from '@/lib/agent-profile-store';
import type { AgentRow } from '@/types/hub';

const STORAGE_KEY = 'mission-agent-task-board-v1';
/** Evita escritas em disco a cada tecla; flush em `beforeunload`. */
const PERSIST_DEBOUNCE_MS = 450;

/** Com `VITE_TASK_BOARD_SYNC=1`, o quadro sincroniza com `GET`/`PUT /api/aiox/task-board` (ficheiro no servidor). */
const TASK_BOARD_SYNC =
  import.meta.env.VITE_TASK_BOARD_SYNC === '1' || import.meta.env.VITE_TASK_BOARD_SYNC === 'true';

type Persisted = {
  tasks: TaskItem[];
};

function load(): TaskItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as Persisted;
    if (!Array.isArray(p.tasks)) return [];
    return p.tasks.filter(
      (t) =>
        t &&
        typeof t.id === 'string' &&
        typeof t.title === 'string' &&
        ['todo', 'doing', 'review', 'done'].includes(t.columnId)
    ) as TaskItem[];
  } catch {
    return [];
  }
}

function save(tasks: TaskItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks } satisfies Persisted));
  } catch {
    /* ignore quota */
  }
}

const COL_IDS = new Set<ColumnId>(['todo', 'doing', 'review', 'done']);

const PRIORITIES = new Set<TaskPriority>(['low', 'medium', 'high', 'urgent']);

const AGENT_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;

function sanitizeAssigneeId(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const s = raw.trim();
  if (!s || !AGENT_ID_RE.test(s)) return undefined;
  return s;
}

function columnLabelPt(c: ColumnId): string {
  if (c === 'todo') return 'planeada';
  if (c === 'doing') return 'em curso';
  if (c === 'review') return 'revisão';
  return 'concluída';
}

function agentLabel(agents: AgentRow[] | undefined, id: string | undefined): string {
  if (!id) return '';
  const row = agents?.find((a) => a.id === id);
  return pickDisplayName(id, row?.title);
}

function normalizeLoadedTask(t: TaskItem): TaskItem {
  const a = sanitizeAssigneeId(t.assigneeAgentId);
  if (a) return { ...t, assigneeAgentId: a };
  const { assigneeAgentId: _drop, ...rest } = t;
  return rest as TaskItem;
}

export function parseTaskBoardJson(raw: unknown): TaskItem[] | null {
  let arr: unknown[];
  if (Array.isArray(raw)) arr = raw;
  else if (raw && typeof raw === 'object' && Array.isArray((raw as Persisted).tasks)) {
    arr = (raw as Persisted).tasks;
  } else return null;
  const out: TaskItem[] = [];
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === 'string' ? o.id : '';
    const title = typeof o.title === 'string' ? o.title.trim() : '';
    const columnId = o.columnId;
    if (!id || !title || typeof columnId !== 'string' || !COL_IDS.has(columnId as ColumnId))
      continue;
    const order = typeof o.order === 'number' && Number.isFinite(o.order) ? o.order : out.length;
    const createdAt =
      typeof o.createdAt === 'number' && Number.isFinite(o.createdAt) ? o.createdAt : Date.now();
    const note = typeof o.note === 'string' && o.note.trim() ? o.note.trim() : undefined;
    const priority =
      typeof o.priority === 'string' && PRIORITIES.has(o.priority as TaskPriority)
        ? (o.priority as TaskPriority)
        : undefined;
    const blocked = o.blocked === true;
    const assigneeAgentId = sanitizeAssigneeId(o.assigneeAgentId);
    const row: TaskItem = {
      id,
      title,
      columnId: columnId as ColumnId,
      order,
      createdAt,
      note,
      priority,
      blocked,
    };
    if (assigneeAgentId) row.assigneeAgentId = assigneeAgentId;
    out.push(row);
  }
  return out;
}

export function exportTaskBoardBlob(tasks: TaskItem[]) {
  const payload = {
    version: 1 as const,
    exportedAt: new Date().toISOString(),
    tasks,
  };
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
}

/** Exporta o quadro como CSV (id, title, column, priority, blocked, assignee, note, createdAt). */
export function exportTaskBoardCsvBlob(tasks: TaskItem[]): Blob {
  const escape = (v: unknown): string => {
    const s = v === null || v === undefined ? '' : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const header = 'id,title,column,priority,blocked,assignee,note,createdAt';
  const rows = tasks.map((t) =>
    [
      escape(t.id),
      escape(t.title),
      escape(t.columnId),
      escape(t.priority ?? ''),
      escape(t.blocked ? 'sim' : 'não'),
      escape(t.assigneeAgentId ?? ''),
      escape(t.note ?? ''),
      escape(new Date(t.createdAt).toISOString()),
    ].join(',')
  );
  return new Blob([[header, ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8' });
}

function newId() {
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Grava primeiro em `POST /api/aiox/activity/event` (todas as linhas, em sequência)
 * e só no fim dispara `mission-team-activity` para o hub fazer refresh com dados já persistidos.
 * Evita corrida refresh→overview sem a nova linha e reduz sensação de “loop” de pedidos.
 */
async function persistTaskCanvasActivities(entries: { agent: string; action: string }[]) {
  const clean = entries
    .map((e) => ({
      agent: e.agent.trim().slice(0, 64) || '@task-canvas',
      action: e.action.trim().slice(0, 240),
    }))
    .filter((e) => e.action.length > 0);
  if (!clean.length) return;
  for (const e of clean) {
    try {
      await postActivityEvent({
        agent: e.agent,
        action: e.action,
        type: 'output',
        kind: 'bridge',
      });
    } catch {
      /* API ou rede indisponível — continua para tentar registar o resto */
    }
  }
  window.dispatchEvent(
    new CustomEvent('mission-team-activity', {
      detail: { source: 'task-canvas', action: clean[clean.length - 1]?.action ?? '' },
    })
  );
}

const HISTORY_LIMIT = 50;

export function useTaskBoard(agentsForLabels: AgentRow[] = []) {
  const [tasks, setTasks] = useState<TaskItem[]>(() => load().map(normalizeLoadedTask));
  const [syncHydrated, setSyncHydrated] = useState(!TASK_BOARD_SYNC);
  const tasksRef = useRef(tasks);
  const serverRevRef = useRef<string | null>(null);
  const agentsRef = useRef(agentsForLabels);
  agentsRef.current = agentsForLabels;
  tasksRef.current = tasks;

  // Undo/redo history
  const pastRef = useRef<TaskItem[][]>([]);
  const futureRef = useRef<TaskItem[][]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const pushHistory = useCallback(() => {
    pastRef.current = [...pastRef.current, [...tasksRef.current]].slice(-HISTORY_LIMIT);
    futureRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const undo = useCallback(() => {
    if (!pastRef.current.length) return;
    const prev = pastRef.current[pastRef.current.length - 1]!;
    futureRef.current = [[...tasksRef.current], ...futureRef.current];
    pastRef.current = pastRef.current.slice(0, -1);
    setTasks(prev);
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(true);
  }, []);

  const redo = useCallback(() => {
    if (!futureRef.current.length) return;
    const next = futureRef.current[0]!;
    pastRef.current = [...pastRef.current, [...tasksRef.current]].slice(-HISTORY_LIMIT);
    futureRef.current = futureRef.current.slice(1);
    setTasks(next);
    setCanUndo(true);
    setCanRedo(futureRef.current.length > 0);
  }, []);

  useEffect(() => {
    try {
      (window as unknown as { __missionCanvasTasks?: TaskItem[] }).__missionCanvasTasks = tasks;
      window.dispatchEvent(new CustomEvent('mission-canvas-tasks', { detail: { tasks } }));
    } catch {
      /* ignore */
    }
  }, [tasks]);

  /** Sincronização inicial com o servidor (opt-in). Servidor vence quando tem tarefas; senão envia-se o quadro local. */
  useEffect(() => {
    if (!TASK_BOARD_SYNC) return;
    let cancelled = false;
    void (async () => {
      try {
        const r = await getTaskBoard();
        if (cancelled) return;
        const local = load();
        serverRevRef.current = r.revision;
        if (r.tasks.length === 0 && local.length > 0) {
          const put = await putTaskBoard(local, r.revision);
          serverRevRef.current = put.revision;
          setTasks(local.map(normalizeLoadedTask));
        } else if (r.tasks.length > 0) {
          const merged = r.tasks.map(normalizeLoadedTask);
          setTasks(merged);
          save(merged);
          serverRevRef.current = r.revision;
        }
      } catch {
        /* offline: mantém estado inicial */
      } finally {
        if (!cancelled) setSyncHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => save(tasks), PERSIST_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [tasks]);

  useEffect(() => {
    if (!TASK_BOARD_SYNC || !syncHydrated) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        const rev = serverRevRef.current;
        if (rev === null || cancelled) return;
        try {
          const { revision } = await putTaskBoard(tasksRef.current, rev);
          if (cancelled) return;
          serverRevRef.current = revision;
        } catch (e) {
          if (e instanceof Error && e.message === TASK_BOARD_CONFLICT_ERROR) {
            try {
              const next = await getTaskBoard();
              if (cancelled) return;
              serverRevRef.current = next.revision;
              const merged = next.tasks.map(normalizeLoadedTask);
              setTasks(merged);
              save(merged);
            } catch {
              /* ignore */
            }
          }
        }
      })();
    }, PERSIST_DEBOUNCE_MS + 120);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [tasks, syncHydrated]);

  useEffect(() => {
    const flush = () => save(tasksRef.current);
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, []);

  const addTask = useCallback((columnId: ColumnId, title: string) => {
    const t = title.trim();
    if (!t) return;
    setTasks((prev) => {
      const inCol = prev.filter((x) => x.columnId === columnId);
      const order = inCol.length ? Math.max(...inCol.map((x) => x.order)) + 1 : 0;
      const item: TaskItem = {
        id: newId(),
        title: t,
        columnId,
        order,
        createdAt: Date.now(),
      };
      return [...prev, item];
    });
  }, []);

  const updateTask = useCallback(
    (
      id: string,
      patch: Partial<Pick<TaskItem, 'title' | 'note' | 'priority' | 'blocked'>> & {
        assigneeAgentId?: string | null;
      }
    ) => {
      let prior: TaskItem | undefined;
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          prior = t;
          const title = patch.title !== undefined ? patch.title.trim() : t.title;
          if (!title) return t;
          const next: TaskItem = {
            ...t,
            title,
            note: patch.note !== undefined ? patch.note : t.note,
            priority: patch.priority !== undefined ? patch.priority : t.priority,
            blocked: patch.blocked !== undefined ? patch.blocked : t.blocked,
          };
          if (patch.assigneeAgentId !== undefined) {
            const raw = patch.assigneeAgentId;
            const sanitized =
              raw === null || raw === ''
                ? undefined
                : typeof raw === 'string'
                  ? sanitizeAssigneeId(raw)
                  : undefined;
            if (sanitized) next.assigneeAgentId = sanitized;
            else delete next.assigneeAgentId;
          }
          return next;
        })
      );
      if (patch.assigneeAgentId !== undefined && prior) {
        const sanitized =
          patch.assigneeAgentId === null || patch.assigneeAgentId === ''
            ? undefined
            : sanitizeAssigneeId(patch.assigneeAgentId);
        if (sanitized !== prior.assigneeAgentId) {
          const titleSlice = prior.title.slice(0, 72);
          const who = sanitized ? agentLabel(agentsRef.current, sanitized) : 'sem agente';
          const summary = `Quadro: atribuição «${titleSlice}» → ${who}`;
          queueMicrotask(() => {
            void persistTaskCanvasActivities([{ agent: '@task-canvas', action: summary }]);
          });
        }
      }
    },
    []
  );

  const removeTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const moveTask = useCallback((id: string, toColumn: ColumnId, toIndex?: number) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === id);
      if (!task) return prev;
      const fromColumn = task.columnId;
      const others = prev.filter((t) => t.id !== id);
      const colTasks = others
        .filter((t) => t.columnId === toColumn)
        .sort((a, b) => a.order - b.order);
      let insertAt = toIndex ?? colTasks.length;
      insertAt = Math.max(0, Math.min(insertAt, colTasks.length));
      const reordered = [...colTasks.slice(0, insertAt), task, ...colTasks.slice(insertAt)].map(
        (t, i) => ({
          ...t,
          columnId: toColumn,
          order: i,
        })
      );
      const rest = others.filter((t) => t.columnId !== toColumn);
      if (fromColumn !== toColumn) {
        window.dispatchEvent(
          new CustomEvent('mission-task-token-spent', {
            detail: {
              from: fromColumn,
              to: toColumn,
              amount: toColumn === 'done' ? 4 : toColumn === 'doing' ? 2 : 1,
              taskId: id,
            },
          })
        );
      }
      return [...rest, ...reordered];
    });
  }, []);

  const tasksByColumn = useMemo(() => {
    const m: Record<ColumnId, TaskItem[]> = {
      todo: [],
      doing: [],
      review: [],
      done: [],
    };
    for (const t of tasks) {
      m[t.columnId].push(t);
    }
    (Object.keys(m) as ColumnId[]).forEach((k) => {
      m[k].sort((a, b) => a.order - b.order);
    });
    return m;
  }, [tasks]);

  const clearDone = useCallback(() => {
    setTasks((prev) => prev.filter((t) => t.columnId !== 'done'));
  }, []);

  const replaceTasks = useCallback((next: TaskItem[]) => {
    pushHistory();
    setTasks(next.map(normalizeLoadedTask));
  }, [pushHistory]);

  const clearAll = useCallback(() => {
    setTasks([]);
  }, []);

  const addTaskWithActivity = useCallback(
    (columnId: ColumnId, title: string) => {
      const t = title.trim();
      if (!t) return;
      pushHistory();
      addTask(columnId, title);
      void persistTaskCanvasActivities([
        {
          agent: '@task-canvas',
          action: `Quadro: nova tarefa (${columnLabelPt(columnId)}) — ${t.slice(0, 80)}`,
        },
      ]);
    },
    [addTask, pushHistory]
  );

  const moveTaskWithActivity = useCallback(
    (id: string, toColumn: ColumnId, toIndex?: number) => {
      const cur = tasksRef.current.find((t) => t.id === id);
      const from = cur?.columnId;
      pushHistory();
      moveTask(id, toColumn, toIndex);
      if (from && from !== toColumn && cur) {
        const who = cur.assigneeAgentId
          ? ` · ${agentLabel(agentsRef.current, cur.assigneeAgentId)}`
          : '';
        const summary = `Quadro: «${cur.title.slice(0, 60)}»${who} · ${columnLabelPt(from)} → ${columnLabelPt(toColumn)}`;
        void persistTaskCanvasActivities([{ agent: '@task-canvas', action: summary }]);
      }
    },
    [moveTask, pushHistory]
  );

  const removeTaskWithActivity = useCallback(
    (id: string) => {
      const cur = tasksRef.current.find((t) => t.id === id);
      pushHistory();
      removeTask(id);
      void persistTaskCanvasActivities([
        {
          agent: '@task-canvas',
          action: cur
            ? `Quadro: removeu «${cur.title.slice(0, 72)}»`
            : `Quadro: removeu tarefa ${id}`,
        },
      ]);
    },
    [removeTask, pushHistory]
  );

  const distributeTodoAssignees = useCallback(() => {
    const ids = agentsRef.current.map((a) => a.id).filter(Boolean);
    if (!ids.length) return;
    let i = 0;
    let assigned = 0;
    const next = tasksRef.current.map((t) => {
      if (t.columnId !== 'todo' || t.assigneeAgentId) return t;
      assigned++;
      return { ...t, assigneeAgentId: ids[i++ % ids.length] };
    });
    if (assigned === 0) return;
    pushHistory();
    setTasks(next);
    void persistTaskCanvasActivities([
      {
        agent: '@task-canvas',
        action: `Quadro: distribuiu ${assigned} tarefa(s) na fila por ${ids.length} agente(s).`,
      },
    ]);
  }, [pushHistory]);

  const clearDoneWithActivity = useCallback(() => {
    const doneCount = tasksRef.current.filter((t) => t.columnId === 'done').length;
    if (doneCount > 0) pushHistory();
    clearDone();
    if (doneCount > 0) {
      void persistTaskCanvasActivities([
        { agent: '@task-canvas', action: `Limpeza de concluídas: ${doneCount} tarefa(s)` },
      ]);
    }
  }, [clearDone, pushHistory]);

  const clearAllWithActivity = useCallback(() => {
    const count = tasksRef.current.length;
    if (count > 0) pushHistory();
    clearAll();
    if (count > 0) {
      void persistTaskCanvasActivities([
        {
          agent: '@task-canvas',
          action: `Limpeza total do quadro: ${count} tarefa(s) removida(s)`,
        },
      ]);
    }
  }, [clearAll, pushHistory]);

  return {
    tasks,
    tasksByColumn,
    addTask: addTaskWithActivity,
    updateTask,
    removeTask: removeTaskWithActivity,
    moveTask: moveTaskWithActivity,
    clearDone: clearDoneWithActivity,
    replaceTasks,
    clearAll: clearAllWithActivity,
    /** Reparte tarefas em `todo` sem `assigneeAgentId` pelos agentes (round-robin). */
    distributeTodoAssignees,
    /** Desfaz a última acção estrutural (add/remove/move/clear). */
    undo,
    /** Refaz a última acção desfeita. */
    redo,
    canUndo,
    canRedo,
    /** `true` quando `VITE_TASK_BOARD_SYNC` está activo e a carga inicial do servidor terminou. */
    taskBoardSync: TASK_BOARD_SYNC,
    taskBoardSyncHydrated: syncHydrated,
  };
}
