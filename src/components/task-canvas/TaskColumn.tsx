import { useState } from "react";
import { Plus } from "lucide-react";
import type { ColumnDef, ColumnId, TaskItem } from "./types";
import { TaskCard } from "./TaskCard";

type TaskColumnProps = {
  def: ColumnDef;
  tasks: TaskItem[];
  onAdd: (columnId: ColumnId, title: string) => void;
  onUpdate: (
    id: string,
    patch: Partial<Pick<TaskItem, "title" | "note" | "priority" | "blocked">>
  ) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, to: ColumnId) => void;
};

export function TaskColumn({ def, tasks, onAdd, onUpdate, onRemove, onMove }: TaskColumnProps) {
  const [draft, setDraft] = useState("");

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/task-id");
    if (!id) return;
    onMove(id, def.id);
  };

  return (
    <section
      className="flex min-h-0 min-w-[260px] max-w-full flex-1 flex-col rounded-2xl border border-border/80 bg-secondary/20 sm:min-w-[280px]"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={onDrop}
      aria-labelledby={`col-${def.id}`}
    >
      <header className="shrink-0 border-b border-border/60 px-3 py-3 sm:px-4">
        <h2 id={`col-${def.id}`} className="text-sm font-semibold tracking-tight text-foreground">
          {def.title}
        </h2>
        {def.hint ? <p className="mt-0.5 text-[10px] text-muted-foreground">{def.hint}</p> : null}
        <p className="mt-1 font-mono text-[10px] text-muted-foreground/80">{tasks.length} tarefas</p>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3 sm:p-4">
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} onUpdate={onUpdate} onRemove={onRemove} onMove={onMove} />
        ))}
        <form
          className="mt-1 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onAdd(def.id, draft);
            setDraft("");
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Nova tarefa…"
            className="min-w-0 flex-1 rounded-lg border border-dashed border-border bg-background/50 px-2.5 py-2 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
            aria-label={`Adicionar tarefa em ${def.title}`}
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="shrink-0 rounded-lg border border-border bg-card px-2 py-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40"
            title="Adicionar"
          >
            <Plus className="h-4 w-4" aria-hidden />
          </button>
        </form>
      </div>
    </section>
  );
}
