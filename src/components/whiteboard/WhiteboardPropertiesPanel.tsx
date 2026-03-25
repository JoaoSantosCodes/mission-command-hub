import { useState } from 'react';
import { useDrawing } from './DrawingContext';

const COLORS = [
  '#1a1a1a',
  '#ffffff',
  '#ef4444',
  '#f97316',
  '#fbbf24',
  '#10b981',
  '#06b6d4',
  '#6366f1',
  '#a855f7',
  '#ec4899',
];

const PRESETS = [
  { label: 'Contorno', stroke: '#1a1a1a', bg: 'transparent', width: 2 },
  { label: 'Azul', stroke: '#4f46e5', bg: '#e0e7ff', width: 2 },
  { label: 'Laranja', stroke: '#f97316', bg: 'transparent', width: 3 },
  { label: 'Amarelo', stroke: '#1a1a1a', bg: '#fbbf24', width: 1 },
];

export function WhiteboardPropertiesPanel() {
  const {
    strokeColor,
    setStrokeColor,
    backgroundColor,
    setBackgroundColor,
    strokeWidth,
    setStrokeWidth,
    strokeStyle,
    setStrokeStyle,
    roughness,
    setRoughness,
    opacity,
    setOpacity,
    selectedIds,
  } = useDrawing();

  const [tab, setTab] = useState<'stroke' | 'fill'>('stroke');

  return (
    <div className="w-64 shrink-0 overflow-y-auto border-l border-border bg-card p-3">
      <div className="mb-3">
        <p className="text-xs font-semibold text-foreground">Propriedades</p>
        <p className="text-[10px] text-muted-foreground">
          {selectedIds.length > 0
            ? `${selectedIds.length} elemento(s) selecionado(s)`
            : 'Seleciona um elemento para editar'}
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-3 flex rounded-lg border border-border p-0.5">
        <button
          type="button"
          onClick={() => setTab('stroke')}
          className={`flex-1 rounded-md py-1 text-[11px] font-medium transition-colors ${tab === 'stroke' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Traço
        </button>
        <button
          type="button"
          onClick={() => setTab('fill')}
          className={`flex-1 rounded-md py-1 text-[11px] font-medium transition-colors ${tab === 'fill' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Preenchimento
        </button>
      </div>

      {tab === 'stroke' && (
        <div className="space-y-3">
          {/* Stroke color */}
          <div>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Cor do traço
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setStrokeColor(c)}
                  className={`h-7 w-full rounded border-2 transition-transform hover:scale-105 ${strokeColor === c ? 'border-primary' : 'border-border'}`}
                  style={{ backgroundColor: c === '#ffffff' ? '#f9fafb' : c }}
                  title={c}
                />
              ))}
            </div>
            <input
              type="color"
              value={strokeColor}
              onChange={(e) => setStrokeColor(e.target.value)}
              className="mt-1.5 h-8 w-full cursor-pointer rounded border border-border"
            />
          </div>

          {/* Stroke width */}
          <div>
            <div className="mb-1 flex justify-between">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Espessura
              </p>
              <span className="font-mono text-[10px] text-muted-foreground">{strokeWidth}px</span>
            </div>
            <input
              type="range"
              min={1}
              max={20}
              step={1}
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          {/* Stroke style */}
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Estilo
            </p>
            <select
              value={strokeStyle}
              onChange={(e) => setStrokeStyle(e.target.value as 'solid' | 'dashed' | 'dotted')}
              className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary"
            >
              <option value="solid">Sólido</option>
              <option value="dashed">Tracejado</option>
              <option value="dotted">Pontilhado</option>
            </select>
          </div>

          {/* Roughness */}
          <div>
            <div className="mb-1 flex justify-between">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Rugosidade
              </p>
              <span className="font-mono text-[10px] text-muted-foreground">
                {roughness.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={3}
              step={0.1}
              value={roughness}
              onChange={(e) => setRoughness(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
        </div>
      )}

      {tab === 'fill' && (
        <div className="space-y-3">
          {/* Background color */}
          <div>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Cor de preenchimento
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setBackgroundColor(c)}
                  className={`h-7 w-full rounded border-2 transition-transform hover:scale-105 ${backgroundColor === c ? 'border-primary' : 'border-border'}`}
                  style={{ backgroundColor: c === '#ffffff' ? '#f9fafb' : c }}
                  title={c}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setBackgroundColor('transparent')}
              className={`mt-1.5 w-full rounded border-2 py-1.5 text-[11px] transition-colors ${backgroundColor === 'transparent' ? 'border-primary bg-secondary text-foreground' : 'border-border text-muted-foreground hover:bg-secondary'}`}
            >
              Transparente
            </button>
            {backgroundColor !== 'transparent' && (
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="mt-1.5 h-8 w-full cursor-pointer rounded border border-border"
              />
            )}
          </div>

          {/* Opacity */}
          <div>
            <div className="mb-1 flex justify-between">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Opacidade
              </p>
              <span className="font-mono text-[10px] text-muted-foreground">{opacity}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
        </div>
      )}

      {/* Presets */}
      <div className="mt-4">
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Predefinições
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setStrokeColor(p.stroke);
                setBackgroundColor(p.bg);
                setStrokeWidth(p.width);
              }}
              className="rounded-lg border border-border px-2 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
