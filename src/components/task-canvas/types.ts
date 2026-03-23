/** Identificadores estáveis de coluna (presets só mudam títulos). */
export type ColumnId = "todo" | "doing" | "review" | "done";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type TaskItem = {
  id: string;
  title: string;
  note?: string;
  columnId: ColumnId;
  order: number;
  createdAt: number;
  /** Opcional — export/import JSON e UI futura. */
  priority?: TaskPriority;
  /** Bloqueada (ex.: dependência externa) — só metadados no cliente. */
  blocked?: boolean;
};

export type BoardPresetId = "standard" | "agents" | "delivery";

export type ColumnDef = { id: ColumnId; title: string; hint?: string };

export type BoardPreset = {
  id: BoardPresetId;
  label: string;
  description: string;
  columns: ColumnDef[];
};

/** Vista do quadro: ordem manual (drag), data ou prioridade. */
export type CanvasSortMode = "manual" | "createdDesc" | "priorityAsc";
