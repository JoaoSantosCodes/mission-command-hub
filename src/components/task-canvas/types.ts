/** Identificadores estáveis de coluna (presets só mudam títulos). */
export type ColumnId = "todo" | "doing" | "review" | "done";

export type TaskItem = {
  id: string;
  title: string;
  note?: string;
  columnId: ColumnId;
  order: number;
  createdAt: number;
};

export type BoardPresetId = "standard" | "agents" | "delivery";

export type ColumnDef = { id: ColumnId; title: string; hint?: string };

export type BoardPreset = {
  id: BoardPresetId;
  label: string;
  description: string;
  columns: ColumnDef[];
};
