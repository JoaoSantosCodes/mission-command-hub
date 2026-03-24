import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, LayoutList, RotateCcw, Search, Upload, Users } from "lucide-react";
import { pickDisplayName } from "@/lib/agent-profile-store";
import {
  getTaskRuns,
  postActivityEvent,
  postFigmaContext,
  postTaskBoardAgentStep,
  type FigmaContextResponse,
  type TaskRunEntry,
} from "@/lib/api";
import type { AgentRow } from "@/types/hub";
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

function extractFigmaUrl(text?: string): string | null {
  const s = String(text ?? "");
  const m = s.match(/https?:\/\/(?:www\.)?figma\.com\/[^\s)]+/i);
  return m?.[0] ?? null;
}

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

type TaskCanvasViewProps = {
  /** Lista de agentes do hub — atribuição, feed e escritório (Central). */
  agents: AgentRow[];
};

/**
 * Vista Kanban modular: presets alteram rótulos; estado persiste em localStorage.
 */
export function TaskCanvasView({ agents }: TaskCanvasViewProps) {
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
  const [agentStepLoadingId, setAgentStepLoadingId] = useState<string | null>(null);
  const [agentStepError, setAgentStepError] = useState<string | null>(null);
  const [runsByTaskId, setRunsByTaskId] = useState<Record<string, TaskRunEntry | undefined>>({});
  const [figmaContextByTaskId, setFigmaContextByTaskId] = useState<Record<string, FigmaContextResponse | undefined>>({});
  const [figmaLoadingTaskId, setFigmaLoadingTaskId] = useState<string | null>(null);
  const [runBackend, setRunBackend] = useState<string>("file");
  const [policyDefaults, setPolicyDefaults] = useState<string[]>([]);
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
    taskBoardSync,
    taskBoardSyncHydrated,
    distributeTodoAssignees,
  } = useTaskBoard(agents);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAgentStep = useCallback(
    async (task: TaskItem) => {
      const figmaUrl = extractFigmaUrl(task.note);
      if (figmaUrl && !figmaContextByTaskId[task.id]) {
        setAgentStepError("Esta tarefa tem link Figma. Clica em «Figma» no cartão para ler o contexto antes do retorno.");
        return;
      }
      setAgentStepError(null);
      setAgentStepLoadingId(task.id);
      try {
        const assigneeLabel = task.assigneeAgentId
          ? pickDisplayName(
              task.assigneeAgentId,
              agents.find((a) => a.id === task.assigneeAgentId)?.title
            )
          : undefined;
        const r = await postTaskBoardAgentStep({
          task: {
            id: task.id,
            title: task.title,
            columnId: task.columnId,
            note: task.note,
            blocked: task.blocked,
            assigneeAgentId: task.assigneeAgentId,
          },
          assigneeLabel,
        });
        const stamp = new Date().toLocaleString("pt-PT");
        const block = `\n\n---\n[${stamp} · retorno do agente]\n${r.retorno}`;
        const baseNote = (task.note ?? "").trimEnd();
        const newNote = (baseNote + block).trim();
        const patch: Partial<Pick<TaskItem, "note" | "blocked">> = { note: newNote };
        if (typeof r.bloqueada === "boolean") patch.blocked = r.bloqueada;
        updateTask(task.id, patch);
        if (r.sugestao_coluna !== "manter" && r.sugestao_coluna !== task.columnId) {
          moveTask(task.id, r.sugestao_coluna);
        }
        const ag = task.assigneeAgentId?.trim();
        const agentTag = ag ? (ag.startsWith("@") ? ag : `@${ag}`) : "@task-canvas";
        const shortTitle =
          task.title.length > 48 ? `${task.title.slice(0, 48)}…` : task.title;
        const action = `Quadro: retorno «${shortTitle}» → coluna ${r.sugestao_coluna}`;
        try {
          await postActivityEvent({
            agent: agentTag,
            action: action.slice(0, 240),
            type: "output",
            kind: "agent",
          });
        } catch {
          /* feed opcional */
        }
        window.dispatchEvent(
          new CustomEvent("mission-team-activity", {
            detail: { source: "task-canvas-agent", action },
          })
        );
      } catch (e) {
        setAgentStepError(e instanceof Error ? e.message : String(e));
      } finally {
        setAgentStepLoadingId(null);
      }
    },
    [agents, figmaContextByTaskId, moveTask, updateTask]
  );

  const handleReadFigmaContext = useCallback(async (task: TaskItem) => {
    const figmaUrl = extractFigmaUrl(task.note);
    if (!figmaUrl) {
      setAgentStepError("Não foi encontrado link do Figma na nota desta tarefa.");
      return;
    }
    setAgentStepError(null);
    setFigmaLoadingTaskId(task.id);
    try {
      const ctx = await postFigmaContext({ figmaUrl });
      setFigmaContextByTaskId((prev) => ({ ...prev, [task.id]: ctx }));
      const shortTitle = task.title.length > 48 ? `${task.title.slice(0, 48)}…` : task.title;
      const action = `Quadro: contexto Figma lido «${shortTitle}» (${ctx.designSummary.nodeCount} nós)`;
      try {
        await postActivityEvent({
          agent: "@task-canvas",
          action: action.slice(0, 240),
          type: "output",
          kind: "figma",
        });
      } catch {
        /* feed opcional */
      }
    } catch (e) {
      setAgentStepError(e instanceof Error ? e.message : String(e));
    } finally {
      setFigmaLoadingTaskId(null);
    }
  }, []);

  const displayByColumn = useMemo(
    () => applySearchAndSort(tasksByColumn, search, sortMode),
    [tasksByColumn, search, sortMode]
  );

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;
    async function poll() {
      try {
        const data = await getTaskRuns();
        if (cancelled) return;
        const map: Record<string, TaskRunEntry | undefined> = {};
        for (const r of data.runs) map[r.taskId] = r;
        setRunsByTaskId(map);
        setRunBackend(data.backend || "file");
        setPolicyDefaults(Array.isArray(data.policy?.defaults) ? data.policy.defaults : []);
        const next = Math.min(Math.max(data.pollMs || 5000, 1500), 20_000);
        timer = window.setTimeout(poll, next);
      } catch {
        if (cancelled) return;
        timer = window.setTimeout(poll, 6000);
      }
    }
    void poll();
    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
    };
  }, []);

  /** Índices de drop batem com a lista visível; só é seguro com ordem manual e sem filtro. */
  const reorderEnabled = sortMode === "manual" && !search.trim();

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
            {taskBoardSync && taskBoardSyncHydrated ? (
              <p className="mt-1 max-w-2xl text-[10px] text-muted-foreground/90">
                Sincronização com o servidor activa (`VITE_TASK_BOARD_SYNC`) — quadro em ficheiro na API.
              </p>
            ) : null}
            <p className="mt-1 max-w-2xl text-[10px] text-muted-foreground/90">
              Tarefas com agente aparecem no feed e no quadro do escritório (vista Central). Atribui no cartão ou usa «Distribuir fila».
            </p>
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
              disabled={!agents.length}
              onClick={() => {
                if (!agents.length) return;
                if (
                  !window.confirm(
                    "Distribuir tarefas na fila (coluna inicial) sem agente atribuído, em round-robin pelos agentes listados?"
                  )
                ) {
                  return;
                }
                distributeTodoAssignees();
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-2 text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40"
              title="Atribui agentes às tarefas em fila sem dono"
            >
              <Users className="h-3.5 w-3.5" aria-hidden />
              Distribuir fila
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
                title="Com «Manual», aparecem zonas entre cartões para reordenar na coluna. Com filtro ou outra ordenação, o arrastar entre colunas continua a funcionar."
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
          <div className="mt-2 w-full basis-full">
            {agentStepError ? (
              <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {agentStepError}
              </p>
            ) : null}
            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
              Em cada cartão, <strong className="font-medium text-foreground">Retorno</strong> pede ao LLM (mesma
              configuração que o painel Dúvidas) um parecer JSON: texto na nota, sugestão de coluna e bloqueio. Requer{" "}
              <code className="rounded bg-muted px-1">MISSION_DOUBTS_LLM=1</code> e chave LLM.
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground/90">
              Auto-run: backend <code className="rounded bg-muted px-1">{runBackend}</code>; policy default{" "}
              <code className="rounded bg-muted px-1">
                {policyDefaults.length ? policyDefaults.join(",") : "none"}
              </code>
              .
            </p>
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
              agents={agents}
              runsByTaskId={runsByTaskId}
              agentStepLoadingId={agentStepLoadingId}
              figmaLoadingTaskId={figmaLoadingTaskId}
              onAgentStep={handleAgentStep}
              onReadFigmaContext={handleReadFigmaContext}
              figmaContextByTaskId={figmaContextByTaskId}
              reorderEnabled={reorderEnabled}
              onAdd={addTask}
              onUpdate={updateTask}
              onRemove={removeTask}
              onMove={(id, to, toIndex) => moveTask(id, to, toIndex)}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
