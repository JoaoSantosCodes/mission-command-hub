import {
  ArrowRight,
  Circle,
  Diamond,
  Eraser,
  Hand,
  Minus,
  MousePointer2,
  Pen,
  Redo2,
  Square,
  Trash2,
  Type,
  Undo2,
} from 'lucide-react';
import { useDrawing, type ToolType } from './DrawingContext';

const TOOLS: Array<{ id: ToolType; icon: React.ReactNode; label: string; shortcut: string }> = [
  { id: 'selection', icon: <MousePointer2 size={16} />, label: 'Selecionar', shortcut: 'V' },
  { id: 'rectangle', icon: <Square size={16} />, label: 'Retângulo', shortcut: 'R' },
  { id: 'diamond', icon: <Diamond size={16} />, label: 'Losango', shortcut: 'D' },
  { id: 'ellipse', icon: <Circle size={16} />, label: 'Elipse', shortcut: 'O' },
  { id: 'arrow', icon: <ArrowRight size={16} />, label: 'Seta', shortcut: 'A' },
  { id: 'line', icon: <Minus size={16} />, label: 'Linha', shortcut: 'L' },
  { id: 'draw', icon: <Pen size={16} />, label: 'Desenho livre', shortcut: 'P' },
  { id: 'text', icon: <Type size={16} />, label: 'Texto', shortcut: 'T' },
  { id: 'eraser', icon: <Eraser size={16} />, label: 'Borracha', shortcut: 'E' },
  { id: 'hand', icon: <Hand size={16} />, label: 'Mover', shortcut: 'H' },
];

const btnBase =
  'flex h-9 w-9 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';
const btnActive = 'bg-primary text-primary-foreground shadow-sm';
const btnIdle = 'text-muted-foreground hover:bg-secondary hover:text-foreground';

export function WhiteboardToolbar() {
  const { activeTool, setActiveTool, undo, redo, canUndo, canRedo, clearCanvas } = useDrawing();

  return (
    <div className="flex flex-col gap-1 border-r border-border bg-card px-1.5 py-2 shadow-sm">
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          type="button"
          onClick={() => setActiveTool(tool.id)}
          className={`${btnBase} ${activeTool === tool.id ? btnActive : btnIdle}`}
          title={`${tool.label} (${tool.shortcut})`}
          aria-pressed={activeTool === tool.id}
        >
          {tool.icon}
        </button>
      ))}

      <div className="mx-1 my-1 h-px bg-border" />

      <button
        type="button"
        onClick={undo}
        disabled={!canUndo}
        className={`${btnBase} ${btnIdle} disabled:opacity-30`}
        title="Desfazer (Ctrl+Z)"
      >
        <Undo2 size={16} />
      </button>
      <button
        type="button"
        onClick={redo}
        disabled={!canRedo}
        className={`${btnBase} ${btnIdle} disabled:opacity-30`}
        title="Refazer (Ctrl+Y)"
      >
        <Redo2 size={16} />
      </button>
      <button
        type="button"
        onClick={() => {
          if (window.confirm('Limpar todo o quadro?')) clearCanvas();
        }}
        className={`${btnBase} text-muted-foreground hover:bg-destructive/10 hover:text-destructive`}
        title="Limpar quadro"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
