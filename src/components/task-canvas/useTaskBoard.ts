import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnId, TaskItem } from "./types";

const STORAGE_KEY = "mission-agent-task-board-v1";

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

function newId() {
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useTaskBoard() {
  const [tasks, setTasks] = useState<TaskItem[]>(load);

  useEffect(() => {
    save(tasks);
  }, [tasks]);

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

  const updateTask = useCallback((id: string, patch: Partial<Pick<TaskItem, "title" | "note">>) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const title = patch.title !== undefined ? patch.title.trim() : t.title;
        if (!title) return t;
        return {
          ...t,
          title,
          note: patch.note !== undefined ? patch.note : t.note,
        };
      })
    );
  }, []);

  const removeTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const moveTask = useCallback((id: string, toColumn: ColumnId, toIndex?: number) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === id);
      if (!task) return prev;
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

  return {
    tasks,
    tasksByColumn,
    addTask,
    updateTask,
    removeTask,
    moveTask,
    clearDone,
  };
}
