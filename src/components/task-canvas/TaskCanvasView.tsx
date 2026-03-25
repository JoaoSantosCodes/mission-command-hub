import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import {
  Download,
  FileImage,
  LayoutList,
  RotateCcw,
  Search,
  Upload,
  Users,
  Undo2,
  Redo2,
} from 'lucide-react';

import { BOARD_PRESETS, PRESET_ORDER } from './presets';
import type { BoardPresetId, CanvasSortMode, ColumnId, TaskItem } from './types';
import { TaskColumn } from './TaskColumn';
import {
  exportTaskBoardBlob,
  exportTaskBoardCsvBlob,
  parseTaskBoardJson,
  useTaskBoard,
} from './useTaskBoard';

import type { AgentRow } from '@/types/hub';
import {
  getTaskRuns,
  postActivityEvent,
  postTaskBacklogCheck,
  postFigmaContext,
  postTaskBoardAgentStep,
  type TaskBacklogCheckResponse,
  type FigmaContextResponse,
  type TaskRunEntry,
} from '@/lib/api';
import { pickDisplayName } from '@/lib/agent-profile-store';

const SORT_STORAGE_KEY = 'mission-agent-task-canvas-sort';
const EXEC_MODE_STORAGE_KEY = 'mission-agent-task-canvas-exec-mode';
const EXEC_PRIORITY_PROFILE_STORAGE_KEY = 'mission-agent-task-canvas-exec-priority-profile';
const EXEC_PRIORITY_CUSTOM_ORDER_STORAGE_KEY =
  'mission-agent-task-canvas-exec-priority-custom-order';
const BACKLOG_CHECK_THRESHOLD_STORAGE_KEY = 'mission-agent-task-canvas-backlog-check-threshold';

const PRIORITY_RANK: Record<NonNullable<TaskItem['priority']>, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function extractFigmaUrl(text?: string): string | null {
  const s = String(text ?? '');
  const m = s.match(/https?:\/\/(?:www\.)?figma\.com\/[^\s)]+/i);
  return m?.[0] ?? null;
}

function isSortMode(s: string): s is CanvasSortMode {
  return s === 'manual' || s === 'createdDesc' || s === 'priorityAsc';
}

type CanvasExecMode = 'manual' | 'autoTodo' | 'autoTodoDoing' | 'autoAll';
function isExecMode(s: string): s is CanvasExecMode {
  return s === 'manual' || s === 'autoTodo' || s === 'autoTodoDoing' || s === 'autoAll';
}

type AgentKeywordProfile = { prefer: string[]; avoid?: string[] };
const AGENT_PROFILE_BY_COLUMN: Record<ColumnId, AgentKeywordProfile> = {
  todo: {
    prefer: ['analyst', 'product', 'planner', 'pm', 'master'],
    avoid: ['qa', 'review'],
  },
  doing: {
    prefer: ['dev', 'developer', 'frontend', 'backend', 'architect', 'engineer'],
    avoid: ['qa', 'review'],
  },
  review: {
    prefer: ['qa', 'review', 'tester', 'test', 'auditor'],
  },
  done: {
    prefer: ['master', 'manager', 'lead', 'ops', 'delivery'],
  },
};
const EXEC_PRIORITY_BY_MODE: Record<Exclude<CanvasExecMode, 'manual'>, ColumnId[]> = {
  autoTodo: ['todo'],
  autoTodoDoing: ['doing', 'todo'],
  autoAll: ['doing', 'review', 'todo', 'done'],
};
type ExecPriorityProfile = 'flowFirst' | 'backlogFirst' | 'reviewFirst' | 'custom';
const EXEC_PRIORITY_PROFILES: Record<ExecPriorityProfile, { label: string; order: ColumnId[] }> = {
  flowFirst: {
    label: 'Fluxo (Em Curso -> Revisao -> Backlog -> Feito)',
    order: ['doing', 'review', 'todo', 'done'],
  },
  backlogFirst: {
    label: 'Backlog primeiro (Backlog -> Em Curso -> Revisao -> Feito)',
    order: ['todo', 'doing', 'review', 'done'],
  },
  reviewFirst: {
    label: 'Revisao primeiro (Revisao -> Em Curso -> Backlog -> Feito)',
    order: ['review', 'doing', 'todo', 'done'],
  },
  custom: {
    label: 'Personalizada',
    order: ['doing', 'review', 'todo', 'done'],
  },
};
function isExecPriorityProfile(s: string): s is ExecPriorityProfile {
  return s === 'flowFirst' || s === 'backlogFirst' || s === 'reviewFirst' || s === 'custom';
}
const COLUMN_LABEL_BY_ID: Record<ColumnId, string> = {
  todo: 'Backlog',
  doing: 'Em Curso',
  review: 'Revisao',
  done: 'Feito',
};
function parseCustomOrder(raw: string | null): ColumnId[] | null {
  if (!raw) return null;
  const parts = raw
    .split(',')
    .map((x) => x.trim())
    .filter((x): x is ColumnId => x === 'todo' || x === 'doing' || x === 'review' || x === 'done');
  const uniq = Array.from(new Set(parts));
  if (uniq.length !== 4) return null;
  return uniq;
}

function pickBestAgentForColumn(agents: AgentRow[], columnId: ColumnId): string | undefined {
  if (!agents.length) return undefined;
  const profile = AGENT_PROFILE_BY_COLUMN[columnId];
  let best: { id: string; score: number } | null = null;
  for (const a of agents) {
    const id = (a.id ?? '').toLowerCase();
    const title = (a.title ?? '').toLowerCase();
    const hay = `${id} ${title}`;
    let score = 0;
    for (const kw of profile.prefer) {
      if (hay.includes(kw)) score += 3;
    }
    for (const kw of profile.avoid ?? []) {
      if (hay.includes(kw)) score -= 2;
    }
    if (!best || score > best.score) best = { id: a.id, score };
  }
  return best?.id;
}

function applySearchAndSort(
  byColumn: Record<ColumnId, TaskItem[]>,
  search: string,
  sortMode: CanvasSortMode
): Record<ColumnId, TaskItem[]> {
  const q = search.trim().toLowerCase();
  const match = (t: TaskItem) =>
    !q || t.title.toLowerCase().includes(q) || (t.note && t.note.toLowerCase().includes(q));

  const sortList = (list: TaskItem[]): TaskItem[] => {
    const filtered = list.filter(match);
    if (sortMode === 'manual') return filtered;
    const copy = [...filtered];
    if (sortMode === 'createdDesc') {
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
  helpVisible: boolean;
  onHelpVisibleChange: (next: boolean) => void;
};

/**
 * Vista Kanban modular: presets alteram rótulos; estado persiste em localStorage.
 */
export function TaskCanvasView({ agents, helpVisible, onHelpVisibleChange }: TaskCanvasViewProps) {
  const [presetId, setPresetId] = useState<BoardPresetId>(() => {
    try {
      const s = localStorage.getItem('mission-agent-task-preset');
      if (s && s in BOARD_PRESETS) return s as BoardPresetId;
    } catch {
      /* ignore */
    }
    return 'standard';
  });

  const preset = BOARD_PRESETS[presetId];

  const [search, setSearch] = useState('');
  const [agentStepLoadingId, setAgentStepLoadingId] = useState<string | null>(null);
  const [agentStepError, setAgentStepError] = useState<string | null>(null);
  const [runsByTaskId, setRunsByTaskId] = useState<Record<string, TaskRunEntry | undefined>>({});
  const [figmaContextByTaskId, setFigmaContextByTaskId] = useState<
    Record<string, FigmaContextResponse | undefined>
  >({});
  const [figmaLoadingTaskId, setFigmaLoadingTaskId] = useState<string | null>(null);
  const [backlogCheckByTaskId, setBacklogCheckByTaskId] = useState<
    Record<string, TaskBacklogCheckResponse | undefined>
  >({});
  const [backlogCheckLoadingTaskId, setBacklogCheckLoadingTaskId] = useState<string | null>(null);
  const [runBackend, setRunBackend] = useState<string>('file');
  const [policyDefaults, setPolicyDefaults] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<CanvasSortMode>(() => {
    try {
      const s = localStorage.getItem(SORT_STORAGE_KEY);
      if (s && isSortMode(s)) return s;
    } catch {
      /* ignore */
    }
    return 'manual';
  });
  const [execMode, setExecMode] = useState<CanvasExecMode>(() => {
    try {
      const s = localStorage.getItem(EXEC_MODE_STORAGE_KEY);
      if (s && isExecMode(s)) return s;
    } catch {
      /* ignore */
    }
    return 'manual';
  });
  const [execPriorityProfile, setExecPriorityProfile] = useState<ExecPriorityProfile>(() => {
    try {
      const s = localStorage.getItem(EXEC_PRIORITY_PROFILE_STORAGE_KEY);
      if (s && isExecPriorityProfile(s)) return s;
    } catch {
      /* ignore */
    }
    return 'flowFirst';
  });
  const [execPriorityCustomOrder, setExecPriorityCustomOrder] = useState<ColumnId[]>(() => {
    try {
      return (
        parseCustomOrder(localStorage.getItem(EXEC_PRIORITY_CUSTOM_ORDER_STORAGE_KEY)) ?? [
          'doing',
          'review',
          'todo',
          'done',
        ]
      );
    } catch {
      return ['doing', 'review', 'todo', 'done'];
    }
  });
  const [backlogCheckThreshold, setBacklogCheckThreshold] = useState<number>(() => {
    try {
      const raw = Number(localStorage.getItem(BACKLOG_CHECK_THRESHOLD_STORAGE_KEY) || '70');
      return Number.isFinite(raw) ? Math.max(0, Math.min(100, Math.round(raw))) : 70;
    } catch {
      return 70;
    }
  });

  const persistSort = (mode: CanvasSortMode) => {
    setSortMode(mode);
    try {
      localStorage.setItem(SORT_STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  };
  const persistExecMode = (mode: CanvasExecMode) => {
    setExecMode(mode);
    try {
      localStorage.setItem(EXEC_MODE_STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  };
  const persistExecPriorityProfile = (profile: ExecPriorityProfile) => {
    setExecPriorityProfile(profile);
    try {
      localStorage.setItem(EXEC_PRIORITY_PROFILE_STORAGE_KEY, profile);
    } catch {
      /* ignore */
    }
  };
  const persistExecPriorityCustomOrder = (order: ColumnId[]) => {
    setExecPriorityCustomOrder(order);
    try {
      localStorage.setItem(EXEC_PRIORITY_CUSTOM_ORDER_STORAGE_KEY, order.join(','));
    } catch {
      /* ignore */
    }
  };
  const movePriorityColumn = (id: ColumnId, dir: -1 | 1) => {
    const idx = execPriorityCustomOrder.indexOf(id);
    if (idx < 0) return;
    const next = idx + dir;
    if (next < 0 || next >= execPriorityCustomOrder.length) return;
    const copy = [...execPriorityCustomOrder];
    const [item] = copy.splice(idx, 1);
    copy.splice(next, 0, item);
    persistExecPriorityCustomOrder(copy);
  };
  const persistBacklogCheckThreshold = (next: number) => {
    const v = Math.max(0, Math.min(100, Math.round(next)));
    setBacklogCheckThreshold(v);
    try {
      localStorage.setItem(BACKLOG_CHECK_THRESHOLD_STORAGE_KEY, String(v));
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
    undo,
    redo,
    canUndo,
    canRedo,
  } = useTaskBoard(agents);
  const fileRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const autoExecSigByTaskIdRef = useRef<Record<string, string>>({});

  const handleAgentStep = useCallback(
    async (task: TaskItem, assigneeOverrideId?: string) => {
      const effectiveTask =
        assigneeOverrideId && assigneeOverrideId !== task.assigneeAgentId
          ? { ...task, assigneeAgentId: assigneeOverrideId }
          : task;
      const figmaUrl = extractFigmaUrl(task.note);
      if (figmaUrl && !figmaContextByTaskId[task.id]) {
        setAgentStepError(
          'Esta tarefa tem link Figma. Clica em «Figma» no cartão para ler o contexto antes do retorno.'
        );
        return;
      }
      setAgentStepError(null);
      setAgentStepLoadingId(task.id);
      try {
        const assigneeLabel = effectiveTask.assigneeAgentId
          ? pickDisplayName(
              effectiveTask.assigneeAgentId,
              agents.find((a) => a.id === effectiveTask.assigneeAgentId)?.title
            )
          : undefined;
        const r = await postTaskBoardAgentStep({
          task: {
            id: effectiveTask.id,
            title: effectiveTask.title,
            columnId: effectiveTask.columnId,
            note: effectiveTask.note,
            blocked: effectiveTask.blocked,
            assigneeAgentId: effectiveTask.assigneeAgentId,
          },
          assigneeLabel,
        });
        const stamp = new Date().toLocaleString('pt-PT');
        const block = `\n\n---\n[${stamp} · retorno do agente]\n${r.retorno}`;
        const baseNote = (effectiveTask.note ?? '').trimEnd();
        const newNote = (baseNote + block).trim();
        const patch: Partial<Pick<TaskItem, 'note' | 'blocked' | 'assigneeAgentId'>> = {
          note: newNote,
        };
        if (typeof r.bloqueada === 'boolean') patch.blocked = r.bloqueada;
        if (assigneeOverrideId && assigneeOverrideId !== task.assigneeAgentId) {
          patch.assigneeAgentId = assigneeOverrideId;
        }
        updateTask(effectiveTask.id, patch);
        if (r.sugestao_coluna !== 'manter' && r.sugestao_coluna !== effectiveTask.columnId) {
          moveTask(effectiveTask.id, r.sugestao_coluna);
        }
        const ag = effectiveTask.assigneeAgentId?.trim();
        const agentTag = ag ? (ag.startsWith('@') ? ag : `@${ag}`) : '@task-canvas';
        const shortTitle =
          effectiveTask.title.length > 48
            ? `${effectiveTask.title.slice(0, 48)}…`
            : effectiveTask.title;
        const action = `Quadro: retorno «${shortTitle}» → coluna ${r.sugestao_coluna}`;
        try {
          await postActivityEvent({
            agent: agentTag,
            action: action.slice(0, 240),
            type: 'output',
            kind: 'agent',
          });
        } catch {
          /* feed opcional */
        }
        window.dispatchEvent(
          new CustomEvent('mission-team-activity', {
            detail: { source: 'task-canvas-agent', action },
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
      setAgentStepError('Não foi encontrado link do Figma na nota desta tarefa.');
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
          agent: '@task-canvas',
          action: action.slice(0, 240),
          type: 'output',
          kind: 'figma',
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

  const handleBacklogCheck = useCallback(
    async (task: TaskItem) => {
      setAgentStepError(null);
      setBacklogCheckLoadingTaskId(task.id);
      try {
        const assigneeLabel = task.assigneeAgentId
          ? pickDisplayName(
              task.assigneeAgentId,
              agents.find((a) => a.id === task.assigneeAgentId)?.title
            )
          : undefined;
        const check = await postTaskBacklogCheck({
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
        setBacklogCheckByTaskId((prev) => ({ ...prev, [task.id]: check }));
      } catch (e) {
        setAgentStepError(e instanceof Error ? e.message : String(e));
      } finally {
        setBacklogCheckLoadingTaskId(null);
      }
    },
    [agents]
  );

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
        setRunBackend(data.backend || 'file');
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

  useEffect(() => {
    if (execMode === 'manual') return;
    if (agentStepLoadingId) return;
    const priority =
      execMode === 'autoAll'
        ? execPriorityProfile === 'custom'
          ? execPriorityCustomOrder
          : EXEC_PRIORITY_PROFILES[execPriorityProfile].order
        : EXEC_PRIORITY_BY_MODE[execMode];
    let candidate: TaskItem | undefined;
    for (const col of priority) {
      candidate = tasks.find((t) => {
        if (t.blocked === true) return false;
        if (t.columnId !== col) return false;
        if ((t.note ?? '').includes('retorno do agente')) return false;
        const run = runsByTaskId[t.id];
        if (run?.status === 'running') return false;
        const figmaUrl = extractFigmaUrl(t.note);
        if (figmaUrl && !figmaContextByTaskId[t.id]) return false;
        const sig = [t.title, t.columnId, t.assigneeAgentId ?? '', String(Boolean(t.blocked))].join(
          '|'
        );
        return autoExecSigByTaskIdRef.current[t.id] !== sig;
      });
      if (candidate) break;
    }
    if (!candidate) return;
    if (candidate.columnId === 'todo') {
      const checked = backlogCheckByTaskId[candidate.id];
      if (!checked) {
        void handleBacklogCheck(candidate);
        return;
      }
      if (!checked.ready || checked.score < backlogCheckThreshold) {
        return;
      }
    }
    const sig = [
      candidate.title,
      candidate.columnId,
      candidate.assigneeAgentId ?? '',
      String(Boolean(candidate.blocked)),
    ].join('|');
    autoExecSigByTaskIdRef.current[candidate.id] = sig;
    const bestAgentId = pickBestAgentForColumn(agents, candidate.columnId);
    void handleAgentStep(candidate, bestAgentId);
  }, [
    agentStepLoadingId,
    agents,
    backlogCheckByTaskId,
    backlogCheckThreshold,
    execMode,
    execPriorityCustomOrder,
    execPriorityProfile,
    figmaContextByTaskId,
    handleAgentStep,
    handleBacklogCheck,
    runsByTaskId,
    tasks,
  ]);

  /** Índices de drop batem com a lista visível; só é seguro com ordem manual e sem filtro. */
  const reorderEnabled = sortMode === 'manual' && !search.trim();

  const persistPreset = (id: BoardPresetId) => {
    setPresetId(id);
    try {
      localStorage.setItem('mission-agent-task-preset', id);
    } catch {
      /* ignore */
    }
  };

  const exportJson = () => {
    const blob = exportTaskBoardBlob(tasks);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mission-agent-tasks-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportCsv = () => {
    const blob = exportTaskBoardCsvBlob(tasks);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mission-agent-tasks-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportPng = useCallback(async () => {
    if (!boardRef.current) return;
    try {
      const dataUrl = await toPng(boardRef.current, { cacheBust: true, pixelRatio: 1.5 });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `mission-agent-tasks-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
      a.click();
    } catch {
      /* ignore capture errors */
    }
  }, []);

  /** Atalhos globais do canvas — só activos quando a vista está montada. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const inInput =
        el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.tagName === 'SELECT' ||
          el.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        if (inInput) return;
        e.preventDefault();
        undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        if (inInput) return;
        e.preventDefault();
        redo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        if (inInput) return;
        e.preventDefault();
        document.querySelector<HTMLInputElement>('[aria-label^="Adicionar tarefa em"]')?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const onImportFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result ?? '')) as unknown;
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
        window.alert('Não foi possível ler o JSON.');
      }
    };
    reader.readAsText(file, 'utf-8');
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
                Sincronização com o servidor activa (`VITE_TASK_BOARD_SYNC`) — quadro em ficheiro na
                API.
              </p>
            ) : null}
            <p className="mt-1 max-w-2xl text-[10px] text-muted-foreground/90">
              Tarefas com agente aparecem no feed e no quadro do escritório (vista Central). Atribui
              no cartão ou usa «Distribuir fila».
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
              onClick={exportCsv}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-2 text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title="Exportar quadro como CSV"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              CSV
            </button>
            <button
              type="button"
              onClick={() => void exportPng()}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-2 text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title="Exportar quadro como imagem PNG"
            >
              <FileImage className="h-3.5 w-3.5" aria-hidden />
              PNG
            </button>
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-2 text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40"
              title="Desfazer última acção (Ctrl+Z)"
            >
              <Undo2 className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-2 text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40"
              title="Refazer (Ctrl+Y)"
            >
              <Redo2 className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button
              type="button"
              disabled={!agents.length}
              onClick={() => {
                if (!agents.length) return;
                if (
                  !window.confirm(
                    'Distribuir tarefas na fila (coluna inicial) sem agente atribuído, em round-robin pelos agentes listados?'
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
                    'Eliminar todas as tarefas de todas as colunas? Esta acção não pode ser desfeita (exporta antes se precisares de cópia).'
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
                ref={searchRef}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Título ou nota… (Ctrl+F)"
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
              Execução
              <select
                value={execMode}
                onChange={(e) => persistExecMode(e.target.value as CanvasExecMode)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-normal normal-case text-foreground outline-none focus:border-primary"
                aria-label="Modo de execução automática no canvas"
              >
                <option value="manual">Manual (botão Retorno)</option>
                <option value="autoTodo">Automático na coluna fila</option>
                <option value="autoTodoDoing">Automático em fila + em curso</option>
                <option value="autoAll">Automático em todo o canvas</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Prioridade auto
              <select
                value={execPriorityProfile}
                onChange={(e) => persistExecPriorityProfile(e.target.value as ExecPriorityProfile)}
                disabled={execMode !== 'autoAll'}
                className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-normal normal-case text-foreground outline-none focus:border-primary disabled:opacity-50"
                aria-label="Prioridade de colunas no auto-run do canvas"
                title="Aplica apenas no modo Automático em todo o canvas."
              >
                <option value="flowFirst">{EXEC_PRIORITY_PROFILES.flowFirst.label}</option>
                <option value="backlogFirst">{EXEC_PRIORITY_PROFILES.backlogFirst.label}</option>
                <option value="reviewFirst">{EXEC_PRIORITY_PROFILES.reviewFirst.label}</option>
                <option value="custom">{EXEC_PRIORITY_PROFILES.custom.label}</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Score backlog min.
              <select
                value={String(backlogCheckThreshold)}
                onChange={(e) => persistBacklogCheckThreshold(Number(e.target.value))}
                className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-normal normal-case text-foreground outline-none focus:border-primary"
                aria-label="Score mínimo do corretor para auto-run no backlog"
                title="No backlog, o auto-run só continua com score acima do mínimo."
              >
                <option value="50">50</option>
                <option value="60">60</option>
                <option value="70">70</option>
                <option value="80">80</option>
                <option value="90">90</option>
              </select>
            </label>
            {execMode === 'autoAll' && execPriorityProfile === 'custom' ? (
              <div className="flex min-w-[280px] flex-col gap-1 rounded-lg border border-border bg-background px-2 py-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Ordem personalizada
                </p>
                <div className="flex flex-wrap gap-1">
                  {execPriorityCustomOrder.map((col, idx) => (
                    <div
                      key={col}
                      className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-1 text-[10px]"
                    >
                      <span>{COLUMN_LABEL_BY_ID[col]}</span>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => movePriorityColumn(col, -1)}
                        className="rounded px-1 text-muted-foreground hover:bg-secondary disabled:opacity-30"
                        aria-label={`Subir ${COLUMN_LABEL_BY_ID[col]}`}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={idx === execPriorityCustomOrder.length - 1}
                        onClick={() => movePriorityColumn(col, 1)}
                        className="rounded px-1 text-muted-foreground hover:bg-secondary disabled:opacity-30"
                        aria-label={`Descer ${COLUMN_LABEL_BY_ID[col]}`}
                      >
                        ↓
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
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
                if (confirm('Limpar todas as tarefas na coluna «Feito»?')) clearDone();
              }}
              className="self-end rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Limpar feitas
            </button>
            <button
              type="button"
              onClick={() => onHelpVisibleChange(!helpVisible)}
              className="self-end rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title="Mostrar/ocultar textos de ajuda do canvas"
            >
              {helpVisible ? 'Ocultar dicas' : 'Mostrar dicas'}
            </button>
          </div>
          <div className="mt-2 w-full basis-full">
            {agentStepError ? (
              <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {agentStepError}
              </p>
            ) : null}
            {helpVisible ? (
              <>
                <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                  Em cada cartão, <strong className="font-medium text-foreground">Retorno</strong>{' '}
                  pede ao LLM (mesma configuração que o painel Dúvidas) um parecer JSON: texto na
                  nota, sugestão de coluna e bloqueio. Requer{' '}
                  <code className="rounded bg-muted px-1">MISSION_DOUBTS_LLM=1</code> e chave LLM.
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground/90">
                  Auto-run: backend <code className="rounded bg-muted px-1">{runBackend}</code>;
                  policy default{' '}
                  <code className="rounded bg-muted px-1">
                    {policyDefaults.length ? policyDefaults.join(',') : 'none'}
                  </code>
                  .
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground/90">
                  Modo do canvas:{' '}
                  <code className="rounded bg-muted px-1">
                    {execMode === 'manual'
                      ? 'manual'
                      : execMode === 'autoTodo'
                        ? 'auto(todo)'
                        : execMode === 'autoTodoDoing'
                          ? 'auto(todo+doing)'
                          : 'auto(todo+doing+review+done)'}
                  </code>
                  .
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground/90">
                  Corretor backlog (auto):{' '}
                  <code className="rounded bg-muted px-1">score &gt;= {backlogCheckThreshold}</code>
                  .
                </p>
                {execMode === 'autoAll' ? (
                  <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground/90">
                    Prioridade activa:{' '}
                    <code className="rounded bg-muted px-1">
                      {execPriorityProfile === 'custom'
                        ? execPriorityCustomOrder.map((c) => COLUMN_LABEL_BY_ID[c]).join(' -> ')
                        : EXEC_PRIORITY_PROFILES[execPriorityProfile].label}
                    </code>
                    .
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden p-4 sm:p-6">
        <div ref={boardRef} className="flex h-full min-w-min gap-4 pb-2">
          {preset.columns.map((col) => (
            <TaskColumn
              key={col.id}
              def={col}
              tasks={displayByColumn[col.id]}
              agents={agents}
              runsByTaskId={runsByTaskId}
              agentStepLoadingId={agentStepLoadingId}
              figmaLoadingTaskId={figmaLoadingTaskId}
              backlogCheckLoadingTaskId={backlogCheckLoadingTaskId}
              onAgentStep={handleAgentStep}
              onBacklogCheck={handleBacklogCheck}
              onReadFigmaContext={handleReadFigmaContext}
              figmaContextByTaskId={figmaContextByTaskId}
              backlogCheckByTaskId={backlogCheckByTaskId}
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
