import { type ChangeEvent, useMemo, useRef, useState } from "react";
import { Download, LayoutList, RotateCcw, Search, Upload } from "lucide-react";
import { BOARD_PRESETS, PRESET_ORDER } from "./presets";
import type { BoardPresetId, CanvasSortMode, ColumnId, TaskItem } from "./types";
import { TaskColumn } from "./TaskColumn";
import { exportTaskBoardBlob, parseTaskBoardJson, useTaskBoard } from "./useTaskBoard";

const SORT_STORAGE_KEY = "mission-agent-task-canvas-sort";

const PRIORITY_RANK: Record<NonNullable<TaskItem["priority"]>, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function isSortMode(s: string): s is CanvasSortMode {
  return s === "manual" || s === "createdDesc" || s === "priorityAsc";
}

function applySearchAndSort(
  byColumn: Record<ColumnId, TaskItem[]>,
  search: string,
  sortMode: CanvasSortMode
): Record<ColumnId, TaskItem[]> {
  const q = search.trim().toLowerCase();
  const match = (t: TaskItem) =>
    !q ||
    t.title.toLowerCase().includes(q) ||
    (t.note && t.note.toLowerCase().includes(q));

  const sortList = (list: TaskItem[]): TaskItem[] => {
    const filtered = list.filter(match);
    if (sortMode === "manual") return filtered;
    const copy = [...filtered];
    if (sortMode === "createdDesc") {
      copy.sort((a, b) => b.createdAt - a.createdAt || a.order - b.order);
    } else {
      copy.sort((a, b) => {
        const pa = a.priority !== undefined ? PRIORITY_RANK[a.priority] : 4;
        const pb = b.priority !== undefined ? PRIORITY_RANK[b.priority] : 4;
        if (pa !== pb) return pa - pb;
        return a.order - b.order;
      });
    }
    return copy;
  };

  return {
    todo: sortList(byColumn.todo),
    doing: sortList(byColumn.doing),
    review: sortList(byColumn.review),
    done: sortList(byColumn.done),
  };
}

/**
 * Vista Kanban modular: presets alteram rótulos; estado persiste em localStorage.
 */
export function TaskCanvasView() {
  const [presetId, setPresetId] = useState<BoardPresetId>(() => {
    try {
      const s = localStorage.getItem("mission-agent-task-preset");
      if (s && s in BOARD_PRESETS) return s as BoardPresetId;
    } catch {
      /* ignore */
    }
    return "standard";
  });

  const preset = BOARD_PRESETS[presetId];

  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<CanvasSortMode>(() => {
    try {
      const s = localStorage.getItem(SORT_STORAGE_KEY);
      if (s && isSortMode(s)) return s;
    } catch {
      /* ignore */
    }
    return "manual";
  });

  const persistSort = (mode: CanvasSortMode) => {
    setSortMode(mode);
    try {
      localStorage.setItem(SORT_STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  };

  const {
    tasks,
    tasksByColumn,
    addTask,
    updateTask,
    removeTask,
    moveTask,
    clearDone,
    replaceTasks,
    clearAll,
  } = useTaskBoard();
  const fileRef = useRef<HTMLInputElement>(null);

  const displayByColumn = useMemo(
    () => applySearchAndSort(tasksByColumn, search, sortMode),
    [tasksByColumn, search, sortMode]
  );

  const persistPreset = (id: BoardPresetId) => {
    setPresetId(id);
    try {
      localStorage.setItem("mission-agent-task-preset", id);
    } catch {
      /* ignore */
    }
  };

  const exportJson = () => {
    const blob = exportTaskBoardBlob(tasks);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `mission-agent-tasks-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const onImportFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result ?? "")) as unknown;
        const next = parseTaskBoardJson(parsed);
        if (!next) {
          window.alert('JSON inválido: espera-se { "tasks": [...] } ou um array de tarefas.');
          return;
        }
        if (
          !window.confirm(
            `Substituir o quadro actual por ${next.length} tarefa(s) importada(s)? (O preset visual não muda.)`
          )
        ) {
          return;
        }
        replaceTasks(next);
      } catch {
        window.alert("Não foi possível ler o JSON.");
      }
    };
    reader.readAsText(file, "utf-8");
  };

  return (
    <main
      id="conteudo-principal"
      tabIndex={-1}
      className="flex min-h-0 min-w-0 flex-1 flex-col bg-background outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="shrink-0 border-b border-border bg-card/40 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <LayoutList className="h-3.5 w-3.5" aria-hidden />
              Canvas modular
            </p>
            <h1 className="mt-1 text-lg font-semibold tracking-tight text-foreground">Tarefas</h1>
            <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{preset.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              tabIndex={-1}
              onChange={onImportFile}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-2 text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title="Carregar quadro a partir de JSON"
            >
              <Upload className="h-3.5 w-3.5" aria-hidden />
              Importar
            </button>
            <button
              type="button"
              onClick={exportJson}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-2 text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title="Descarregar quadro em JSON"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              Exportar
            </button>
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    "Eliminar todas as tarefas de todas as colunas? Esta acção não pode ser desfeita (exporta antes se precisares de cópia)."
                  )
                ) {
                  clearAll();
                }
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-2 text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
              title="Remover todas as tarefas"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Limpar tudo
            </button>
            <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:max-w-xs">
              <span className="inline-flex items-center gap-1.5">
                <Search className="h-3 w-3" aria-hidden />
                Filtrar
              </span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Título ou nota…"
                className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-normal normal-case text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
                aria-label="Filtrar tarefas por texto"
              />
            </label>
            <label className="flex flex-col gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Ordenar
              <select
                value={sortMode}
                onChange={(e) => persistSort(e.target.value as CanvasSortMode)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-normal normal-case text-foreground outline-none focus:border-primary"
                aria-label="Ordenação das tarefas em cada coluna"
              >
                <option value="manual">Manual (ordem do quadro)</option>
                <option value="createdDesc">Data (mais recentes)</option>
                <option value="priorityAsc">Prioridade (urgente → baixa)</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Módulo
              <select
                value={presetId}
                onChange={(e) => persistPreset(e.target.value as BoardPresetId)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-normal normal-case text-foreground outline-none focus:border-primary"
              >
                {PRESET_ORDER.map((id) => (
                  <option key={id} value={id}>
                    {BOARD_PRESETS[id].label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                if (confirm("Limpar todas as tarefas na coluna «Feito»?")) clearDone();
              }}
              className="self-end rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Limpar feitas
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden p-4 sm:p-6">
        <div className="flex h-full min-w-min gap-4 pb-2">
          {preset.columns.map((col) => (
            <TaskColumn
              key={col.id}
              def={col}
              tasks={displayByColumn[col.id]}
              onAdd={addTask}
              onUpdate={updateTask}
              onRemove={removeTask}
              onMove={(id, to) => moveTask(id, to)}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
