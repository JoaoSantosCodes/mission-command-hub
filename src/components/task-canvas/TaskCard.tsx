import { useEffect, useRef, useState } from 'react';
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Loader2,
  Sparkles,
  Trash2,
} from 'lucide-react';

import type { ColumnId, TaskItem } from './types';

import { pickDisplayName } from '@/lib/agent-profile-store';
import type { FigmaContextResponse, TaskBacklogCheckResponse } from '@/lib/api';
import type { AgentRow } from '@/types/hub';

const COL_ORDER: ColumnId[] = ['todo', 'doing', 'review', 'done'];

type TaskCardProps = {
  task: TaskItem;
  agents: AgentRow[];
  runStatus?: 'running' | 'succeeded' | 'failed';
  runMessage?: string;
  /** Pedido LLM em curso para este cartão. */
  agentStepLoading?: boolean;
  /** Pedido de leitura de contexto Figma em curso para este cartão. */
  figmaContextLoading?: boolean;
  /** Contexto Figma já lido para esta tarefa. */
  figmaContextLoaded?: boolean;
  /** Resumo do contexto Figma lido para exibição no cartão. */
  figmaContextSummary?: FigmaContextResponse['designSummary'];
  figmaMeta?: FigmaContextResponse['meta'];
  /** Pedir retorno estruturado do agente (nota + coluna + bloqueio). */
  onAgentStep?: (task: TaskItem) => void;
  /** Validar completude da tarefa (estilo planner). */
  onBacklogCheck?: (task: TaskItem) => void;
  backlogCheckLoading?: boolean;
  backlogCheckResult?: TaskBacklogCheckResponse;
  /** Ler contexto Figma antes do retorno (quando existir link na nota). */
  onReadFigmaContext?: (task: TaskItem) => void;
  onUpdate: (
    id: string,
    patch: Partial<Pick<TaskItem, 'title' | 'note' | 'priority' | 'blocked'>> & {
      assigneeAgentId?: string | null;
    }
  ) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, to: ColumnId, toIndex?: number) => void;
};

export function TaskCard({
  task,
  agents,
  runStatus,
  runMessage,
  agentStepLoading = false,
  figmaContextLoading = false,
  figmaContextLoaded = false,
  figmaContextSummary,
  figmaMeta,
  onAgentStep,
  onBacklogCheck,
  backlogCheckLoading = false,
  backlogCheckResult,
  onReadFigmaContext,
  onUpdate,
  onRemove,
  onMove,
}: TaskCardProps) {
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(task.title);
  const [draftNote, setDraftNote] = useState(task.note ?? '');
  const [showFigmaDetails, setShowFigmaDetails] = useState(false);
  const figmaDetailsRef = useRef<HTMLDivElement | null>(null);

  const i = COL_ORDER.indexOf(task.columnId);
  const canLeft = i > 0;
  const canRight = i >= 0 && i < COL_ORDER.length - 1;
  const figmaLinked = /https?:\/\/(?:www\.)?figma\.com\/[^\s)]+/i.test(task.note ?? '');
  const needsFigmaRead = figmaLinked && !figmaContextLoaded;

  const commit = () => {
    const t = draftTitle.trim();
    if (!t) return;
    onUpdate(task.id, { title: t, note: draftNote.trim() || undefined });
    setEditing(false);
  };

  const formatPtDateTime = (iso?: string | null) => {
    if (!iso) return 'n/a';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat('pt-PT', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(d);
  };

  const copyText = async (text?: string | null) => {
    const v = String(text ?? '');
    if (!v) return;
    try {
      await navigator.clipboard.writeText(v);
    } catch {
      /* fallback discreto sem interromper UX */
      const ta = document.createElement('textarea');
      ta.value = v;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand('copy');
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  useEffect(() => {
    if (!showFigmaDetails) return;
    const onDocClick = (ev: MouseEvent) => {
      const target = ev.target as Node | null;
      if (!target) return;
      if (!figmaDetailsRef.current?.contains(target)) {
        setShowFigmaDetails(false);
      }
    };
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setShowFigmaDetails(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [showFigmaDetails]);

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/task-id', task.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      className="group rounded-xl border border-border bg-card/90 p-3 shadow-sm ring-1 ring-primary/[0.04] transition-shadow hover:ring-primary/15"
    >
      <div className="flex gap-2">
        <div
          className="mt-0.5 cursor-grab text-muted-foreground opacity-60 active:cursor-grabbing group-hover:opacity-100"
          title="Arrastar"
          aria-hidden
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          {editing ? (
            <>
              <input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm font-medium text-foreground outline-none focus:border-primary"
                aria-label="Título da tarefa"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commit();
                  if (e.key === 'Escape') {
                    setDraftTitle(task.title);
                    setDraftNote(task.note ?? '');
                    setEditing(false);
                  }
                }}
              />
              <textarea
                value={draftNote}
                onChange={(e) => setDraftNote(e.target.value)}
                placeholder="Nota opcional…"
                rows={2}
                className="w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-xs text-muted-foreground outline-none focus:border-primary"
              />
              <label className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Agente
                <select
                  value={task.assigneeAgentId ?? ''}
                  onChange={(e) => onUpdate(task.id, { assigneeAgentId: e.target.value || null })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-[11px] font-normal normal-case text-foreground outline-none focus:border-primary"
                >
                  <option value="">— Nenhum</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {pickDisplayName(a.id, a.title)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={commit}
                  className="rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraftTitle(task.title);
                    setDraftNote(task.note ?? '');
                    setEditing(false);
                  }}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                >
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="min-w-0 flex-1 text-left text-sm font-medium leading-snug text-foreground hover:text-primary"
                >
                  {task.title}
                </button>
                {task.blocked ? (
                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
                    <Ban className="h-2.5 w-2.5" aria-hidden />
                    Bloqueada
                  </span>
                ) : null}
                {task.priority ? (
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase text-muted-foreground">
                    {task.priority}
                  </span>
                ) : null}
                {task.assigneeAgentId ? (
                  <span className="shrink-0 rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">
                    {pickDisplayName(
                      task.assigneeAgentId,
                      agents.find((x) => x.id === task.assigneeAgentId)?.title
                    )}
                  </span>
                ) : null}
                {runStatus ? (
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium uppercase ${
                      runStatus === 'running'
                        ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                        : runStatus === 'succeeded'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'bg-destructive/15 text-destructive'
                    }`}
                    title={runMessage || 'Estado da execução automática'}
                  >
                    {runStatus === 'running'
                      ? 'A executar'
                      : runStatus === 'succeeded'
                        ? 'Concluída'
                        : 'Falhou'}
                  </span>
                ) : null}
              </div>
              {task.note ? (
                <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground">
                  {task.note}
                </p>
              ) : null}
              {runStatus && runMessage ? (
                <p
                  className={`text-[10px] leading-relaxed ${
                    runStatus === 'failed' ? 'text-destructive' : 'text-muted-foreground'
                  }`}
                >
                  {runMessage}
                </p>
              ) : null}
              {backlogCheckResult ? (
                <div
                  className={`rounded border px-2 py-1 text-[10px] leading-relaxed ${
                    backlogCheckResult.ready
                      ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300'
                      : 'border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300'
                  }`}
                >
                  <p className="font-medium">
                    Planner check: {backlogCheckResult.ready ? 'Pronta' : 'Incompleta'} · score{' '}
                    {backlogCheckResult.score}/100
                  </p>
                  <p className="mt-0.5">{backlogCheckResult.summary}</p>
                  {backlogCheckResult.missing.length ? (
                    <p className="mt-0.5">
                      Falta: {backlogCheckResult.missing.slice(0, 3).join('; ')}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {figmaContextLoaded && figmaContextSummary ? (
                <div
                  className="relative rounded border border-emerald-500/20 bg-emerald-500/5 px-2 py-1 text-[10px] leading-relaxed text-emerald-800 dark:text-emerald-300"
                  ref={figmaDetailsRef}
                >
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <p>
                      Figma: {figmaMeta?.fileName || 'ficheiro sem nome'} ·{' '}
                      {figmaContextSummary.rootType || 'root?'} · {figmaContextSummary.nodeCount}{' '}
                      nós
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowFigmaDetails((v) => !v)}
                      className="rounded border border-emerald-500/25 px-1.5 py-0.5 text-[9px] font-medium hover:bg-emerald-500/10"
                      title="Mostrar detalhes técnicos do contexto Figma"
                    >
                      {showFigmaDetails ? 'Ocultar' : 'Detalhes'}
                    </button>
                  </div>
                  {showFigmaDetails ? (
                    <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 rounded-md border border-border bg-popover p-2 text-[9px] text-popover-foreground shadow-lg">
                      <div className="flex items-center justify-between gap-2">
                        <span>Version: {figmaMeta?.version || 'n/a'}</span>
                        <button
                          type="button"
                          onClick={() => void copyText(figmaMeta?.version)}
                          className="rounded border border-border px-1.5 py-0.5 text-[9px] hover:bg-secondary"
                        >
                          Copiar
                        </button>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span>Atualizado: {formatPtDateTime(figmaMeta?.lastModified)}</span>
                        <button
                          type="button"
                          onClick={() => void copyText(figmaMeta?.lastModified)}
                          className="rounded border border-border px-1.5 py-0.5 text-[9px] hover:bg-secondary"
                        >
                          Copiar
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <label className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Agente
                <select
                  value={task.assigneeAgentId ?? ''}
                  onChange={(e) => onUpdate(task.id, { assigneeAgentId: e.target.value || null })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-[11px] font-normal normal-case text-foreground outline-none focus:border-primary"
                  aria-label="Agente responsável pela tarefa"
                >
                  <option value="">— Nenhum</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {pickDisplayName(a.id, a.title)}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2">
        <div className="flex flex-wrap items-center gap-0.5">
          {onAgentStep ? (
            <button
              type="button"
              disabled={agentStepLoading || runStatus === 'running' || needsFigmaRead}
              onClick={() => onAgentStep(task)}
              className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[10px] font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
              title={
                runStatus === 'running'
                  ? 'Execução automática em curso para este cartão'
                  : needsFigmaRead
                    ? 'Esta tarefa tem link Figma: lê contexto primeiro.'
                    : 'Pedir retorno do agente (LLM): actualiza a nota e sugere coluna'
              }
            >
              {agentStepLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="h-3 w-3" aria-hidden />
              )}
              Retorno
            </button>
          ) : null}
          {onBacklogCheck ? (
            <button
              type="button"
              disabled={backlogCheckLoading || runStatus === 'running'}
              onClick={() => onBacklogCheck(task)}
              className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[10px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50"
              title="Validar completude do ticket no backlog (planner)"
            >
              {backlogCheckLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              ) : null}
              Corretor
            </button>
          ) : null}
          {onReadFigmaContext && figmaLinked ? (
            <button
              type="button"
              disabled={figmaContextLoading}
              onClick={() => onReadFigmaContext(task)}
              className={`inline-flex items-center gap-1 rounded px-1.5 py-1 text-[10px] font-medium disabled:opacity-50 ${
                figmaContextLoaded
                  ? 'text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300'
                  : 'text-sky-700 hover:bg-sky-500/10 dark:text-sky-300'
              }`}
              title={
                figmaContextLoaded
                  ? 'Contexto Figma já lido para esta tarefa'
                  : 'Ler contexto Figma para esta tarefa'
              }
            >
              {figmaContextLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              ) : null}
              {figmaContextLoaded ? 'Figma OK' : 'Figma'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onUpdate(task.id, { blocked: !task.blocked })}
            className={`rounded px-1.5 py-1 text-[10px] font-medium ${
              task.blocked
                ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
            title={task.blocked ? 'Desmarcar bloqueio' : 'Marcar como bloqueada'}
          >
            Bloqueio
          </button>
          <button
            type="button"
            disabled={!canLeft}
            onClick={() => canLeft && onMove(task.id, COL_ORDER[i - 1])}
            className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30"
            title="Coluna anterior"
            aria-label="Mover para coluna anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={!canRight}
            onClick={() => canRight && onMove(task.id, COL_ORDER[i + 1])}
            className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30"
            title="Coluna seguinte"
            aria-label="Mover para coluna seguinte"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => onRemove(task.id)}
          className="rounded p-1 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
          title="Remover"
          aria-label="Remover tarefa"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}
