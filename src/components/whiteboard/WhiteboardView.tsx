import { useEffect, useRef } from 'react';
import { Download, FileImage } from 'lucide-react';
import { DrawingProvider, useDrawing } from './DrawingContext';
import { WhiteboardCanvas } from './WhiteboardCanvas';
import { WhiteboardToolbar } from './WhiteboardToolbar';
import { WhiteboardPropertiesPanel } from './WhiteboardPropertiesPanel';

const TOOL_KEYS: Record<string, string> = {
  v: 'selection', r: 'rectangle', d: 'diamond', o: 'ellipse',
  a: 'arrow', l: 'line', p: 'draw', t: 'text', e: 'eraser', h: 'hand',
};

function WhiteboardInner() {
  const canvasRef = useRef<HTMLCanvasElement>(null) as React.RefObject<HTMLCanvasElement>;
  const { undo, redo, setActiveTool, elements } = useDrawing();

  /** Keyboard shortcuts — scoped to this view. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault(); undo(); return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault(); redo(); return;
      }
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const tool = TOOL_KEYS[e.key.toLowerCase()];
        if (tool) { setActiveTool(tool as Parameters<typeof setActiveTool>[0]); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, setActiveTool]);

  const exportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `whiteboard-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
    a.click();
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ version: 1, elements }, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `whiteboard-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <main
      id="main-content"
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      aria-label="Whiteboard de arquitetura"
    >
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-card/80 px-4 py-2">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Whiteboard
          </p>
          <p className="text-xs text-muted-foreground/70">
            Clica e arrasta para desenhar · Scroll para zoom · H para mover · Del para apagar
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-[10px] text-muted-foreground/60 sm:inline">
            {elements.length} elemento{elements.length !== 1 ? 's' : ''}
          </span>
          <button
            type="button"
            onClick={exportPng}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            title="Exportar como PNG"
          >
            <FileImage className="h-3.5 w-3.5" aria-hidden />
            PNG
          </button>
          <button
            type="button"
            onClick={exportJson}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-2 text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            title="Exportar elementos como JSON"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            JSON
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <WhiteboardToolbar />
        <div className="min-h-0 flex-1">
          <WhiteboardCanvas canvasRef={canvasRef} />
        </div>
        <WhiteboardPropertiesPanel />
      </div>
    </main>
  );
}

export function WhiteboardView() {
  return (
    <DrawingProvider>
      <WhiteboardInner />
    </DrawingProvider>
  );
}
