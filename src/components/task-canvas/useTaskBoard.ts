import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getTaskBoard, putTaskBoard, TASK_BOARD_CONFLICT_ERROR } from "@/lib/api";
import type { ColumnId, TaskItem, TaskPriority } from "./types";

const STORAGE_KEY = "mission-agent-task-board-v1";
/** Evita escritas em disco a cada tecla; flush em `beforeunload`. */
const PERSIST_DEBOUNCE_MS = 450;

/** Com `VITE_TASK_BOARD_SYNC=1`, o quadro sincroniza com `GET`/`PUT /api/aiox/task-board` (ficheiro no servidor). */
const TASK_BOARD_SYNC =
  import.meta.env.VITE_TASK_BOARD_SYNC === "1" || import.meta.env.VITE_TASK_BOARD_SYNC === "true";

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
        typeof t.id === "string" &&
        typeof t.title === "string" &&
        ["todo", "doing", "review", "done"].includes(t.columnId)
    );
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

const COL_IDS = new Set<ColumnId>(["todo", "doing", "review", "done"]);

const PRIORITIES = new Set<TaskPriority>(["low", "medium", "high", "urgent"]);

export function parseTaskBoardJson(raw: unknown): TaskItem[] | null {
  let arr: unknown[];
  if (Array.isArray(raw)) arr = raw;
  else if (raw && typeof raw === "object" && Array.isArray((raw as Persisted).tasks)) {
    arr = (raw as Persisted).tasks;
  } else return null;
  const out: TaskItem[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    const title = typeof o.title === "string" ? o.title.trim() : "";
    const columnId = o.columnId;
    if (!id || !title || typeof columnId !== "string" || !COL_IDS.has(columnId as ColumnId)) continue;
    const order = typeof o.order === "number" && Number.isFinite(o.order) ? o.order : out.length;
    const createdAt =
      typeof o.createdAt === "number" && Number.isFinite(o.createdAt) ? o.createdAt : Date.now();
    const note = typeof o.note === "string" && o.note.trim() ? o.note.trim() : undefined;
    const priority =
      typeof o.priority === "string" && PRIORITIES.has(o.priority as TaskPriority)
        ? (o.priority as TaskPriority)
        : undefined;
    const blocked = o.blocked === true;
    out.push({ id, title, columnId: columnId as ColumnId, order, createdAt, note, priority, blocked });
  }
  return out;
}

export function exportTaskBoardBlob(tasks: TaskItem[]) {
  const payload = {
    version: 1 as const,
    exportedAt: new Date().toISOString(),
    tasks,
  };
  return new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
}

function newId() {
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useTaskBoard() {
  const [tasks, setTasks] = useState<TaskItem[]>(load);
  const [syncHydrated, setSyncHydrated] = useState(!TASK_BOARD_SYNC);
  const tasksRef = useRef(tasks);
  const serverRevRef = useRef<string | null>(null);
  tasksRef.current = tasks;

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
          setTasks(local);
        } else if (r.tasks.length > 0) {
          setTasks(r.tasks);
          save(r.tasks);
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
              setTasks(next.tasks);
              save(next.tasks);
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
    window.addEventListener("beforeunload", flush);
    return () => window.removeEventListener("beforeunload", flush);
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
    (id: string, patch: Partial<Pick<TaskItem, "title" | "note" | "priority" | "blocked">>) => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          const title = patch.title !== undefined ? patch.title.trim() : t.title;
          if (!title) return t;
          return {
            ...t,
            title,
            note: patch.note !== undefined ? patch.note : t.note,
            priority: patch.priority !== undefined ? patch.priority : t.priority,
            blocked: patch.blocked !== undefined ? patch.blocked : t.blocked,
          };
        })
      );
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
      const reordered = [...colTasks.slice(0, insertAt), task, ...colTasks.slice(insertAt)].map((t, i) => ({
        ...t,
        columnId: toColumn,
        order: i,
      }));
      const rest = others.filter((t) => t.columnId !== toColumn);
      if (fromColumn !== toColumn) {
        window.dispatchEvent(
          new CustomEvent("mission-task-token-spent", {
            detail: {
              from: fromColumn,
              to: toColumn,
              amount: toColumn === "done" ? 4 : toColumn === "doing" ? 2 : 1,
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
    setTasks((prev) => prev.filter((t) => t.columnId !== "done"));
  }, []);

  const replaceTasks = useCallback((next: TaskItem[]) => {
    setTasks(next);
  }, []);

  const clearAll = useCallback(() => {
    setTasks([]);
  }, []);

  return {
    tasks,
    tasksByColumn,
    addTask,
    updateTask,
    removeTask,
    moveTask,
    clearDone,
    replaceTasks,
    clearAll,
    /** `true` quando `VITE_TASK_BOARD_SYNC` está activo e a carga inicial do servidor terminou. */
    taskBoardSync: TASK_BOARD_SYNC,
    taskBoardSyncHydrated: syncHydrated,
  };
}
