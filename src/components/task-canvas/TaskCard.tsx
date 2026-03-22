import { useState } from "react";
import { ChevronLeft, ChevronRight, GripVertical, Trash2 } from "lucide-react";
import type { ColumnId, TaskItem } from "./types";

const COL_ORDER: ColumnId[] = ["todo", "doing", "review", "done"];

type TaskCardProps = {
  task: TaskItem;
  onUpdate: (id: string, patch: Partial<Pick<TaskItem, "title" | "note">>) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, to: ColumnId) => void;
};

export function TaskCard({ task, onUpdate, onRemove, onMove }: TaskCardProps) {
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(task.title);
  const [draftNote, setDraftNote] = useState(task.note ?? "");

  const i = COL_ORDER.indexOf(task.columnId);
  const canLeft = i > 0;
  const canRight = i >= 0 && i < COL_ORDER.length - 1;

  const commit = () => {
    const t = draftTitle.trim();
    if (!t) return;
    onUpdate(task.id, { title: t, note: draftNote.trim() || undefined });
    setEditing(false);
  };

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/task-id", task.id);
        e.dataTransfer.effectAllowed = "move";
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
                  if (e.key === "Enter") commit();
                  if (e.key === "Escape") {
                    setDraftTitle(task.title);
                    setDraftNote(task.note ?? "");
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
                    setDraftNote(task.note ?? "");
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
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="w-full text-left text-sm font-medium leading-snug text-foreground hover:text-primary"
              >
                {task.title}
              </button>
              {task.note ? (
                <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground">{task.note}</p>
              ) : null}
            </>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2">
        <div className="flex gap-0.5">
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
