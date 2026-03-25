import { useEffect, useMemo, useState } from 'react';
import { Palette, RefreshCw, Save, SlidersHorizontal, UserRound, X } from 'lucide-react';

import type { AgentRow } from '@/types/hub';
import { readAgentProfile, writeAgentProfile } from '@/lib/agent-profile-store';
import {
  readOfficeTheme,
  writeOfficeTheme,
  type OfficeTheme,
} from '@/lib/office-customization-store';

type CustomizationPanelProps = {
  open: boolean;
  onClose: () => void;
  agents: AgentRow[];
  syncStateLabel: string;
  onSyncNow: () => void;
};

type Draft = {
  displayName: string;
  avatarIndex: number;
  avatarOffsetX: number;
  avatarOffsetY: number;
  accentColor: string;
  officeTheme: OfficeTheme;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function CustomizationPanel({
  open,
  onClose,
  agents,
  syncStateLabel,
  onSyncNow,
}: CustomizationPanelProps) {
  const [tab, setTab] = useState<'agents' | 'office'>('agents');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [draft, setDraft] = useState<Draft>({
    displayName: '',
    avatarIndex: 0,
    avatarOffsetX: 0,
    avatarOffsetY: 0,
    accentColor: '',
    officeTheme: 'default',
  });

  useEffect(() => {
    if (!open) return;
    if (!selectedAgentId && agents.length > 0) setSelectedAgentId(agents[0].id);
  }, [open, agents, selectedAgentId]);

  const selected = useMemo(
    () => agents.find((a) => a.id === selectedAgentId) ?? null,
    [agents, selectedAgentId]
  );

  const loadFromCurrent = () => {
    const id = selected?.id;
    const p = id ? readAgentProfile(id) : {};
    const baseName = selected ? p.displayName || selected.title || selected.id : '';
    setDraft({
      displayName: baseName,
      avatarIndex: typeof p.avatarIndex === 'number' ? p.avatarIndex : 0,
      avatarOffsetX: typeof p.avatarOffsetX === 'number' ? p.avatarOffsetX : 0,
      avatarOffsetY: typeof p.avatarOffsetY === 'number' ? p.avatarOffsetY : 0,
      accentColor: p.accentColor || '',
      officeTheme: readOfficeTheme(),
    });
  };

  useEffect(() => {
    if (!open) return;
    loadFromCurrent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedAgentId]);

  const applyLocal = () => {
    if (selected?.id) {
      writeAgentProfile(selected.id, {
        displayName: draft.displayName,
        avatarIndex: clamp(draft.avatarIndex, 0, 5),
        avatarOffsetX: clamp(draft.avatarOffsetX, -6, 6),
        avatarOffsetY: clamp(draft.avatarOffsetY, -6, 6),
        accentColor: draft.accentColor.trim() || undefined,
      });
    }
    writeOfficeTheme(draft.officeTheme);
  };

  const saveAndSync = () => {
    applyLocal();
    onSyncNow();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-primary/[0.08] ring-1 ring-primary/15">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-gradient-to-br from-primary/[0.1] via-card to-secondary/25 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Architecture Agents Hub
            </p>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Painel de personalização
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-border bg-background/40 px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              sync: {syncStateLabel}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title="Fechar"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2 sm:px-5">
          <button
            type="button"
            onClick={() => setTab('agents')}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs ${
              tab === 'agents'
                ? 'border-primary/35 bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            <UserRound className="h-3.5 w-3.5" aria-hidden />
            Agentes
          </button>
          <button
            type="button"
            onClick={() => setTab('office')}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs ${
              tab === 'office'
                ? 'border-primary/35 bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            <Palette className="h-3.5 w-3.5" aria-hidden />
            Escritório
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-5">
          {tab === 'agents' ? (
            <div className="grid gap-4 md:grid-cols-[240px_1fr]">
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Selecionar agente
                </p>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-xs text-foreground outline-none focus:border-primary"
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.id}
                    </option>
                  ))}
                </select>
                {selected ? (
                  <p className="text-[11px] text-muted-foreground" title={selected.title}>
                    {selected.title}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  Nome de exibição
                  <input
                    value={draft.displayName}
                    onChange={(e) => setDraft((d) => ({ ...d, displayName: e.target.value }))}
                    className="rounded-lg border border-border bg-background px-2.5 py-2 text-xs normal-case text-foreground outline-none focus:border-primary"
                  />
                </label>
                <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  Skin / Rosto
                  <select
                    value={draft.avatarIndex}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, avatarIndex: Number(e.target.value) }))
                    }
                    className="rounded-lg border border-border bg-background px-2.5 py-2 text-xs normal-case text-foreground outline-none focus:border-primary"
                  >
                    {['👤 Padrão', '🧑 Casual', '👩 Feminino', '🧓 Sênior', '🧑‍💻 Dev', '🧑‍🎨 Creative'].map((label, i) => (
                      <option key={i} value={i}>{label}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  Posição X ({draft.avatarOffsetX})
                  <input
                    type="range"
                    min={-6}
                    max={6}
                    step={1}
                    value={draft.avatarOffsetX}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, avatarOffsetX: Number(e.target.value) }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  Posição Y ({draft.avatarOffsetY})
                  <input
                    type="range"
                    min={-6}
                    max={6}
                    step={1}
                    value={draft.avatarOffsetY}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, avatarOffsetY: Number(e.target.value) }))
                    }
                  />
                </label>
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Cor de destaque
                  </span>
                  {/* Paleta de cores rápidas */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      '#22c55e','#38bdf8','#a78bfa','#f97316','#ec4899',
                      '#eab308','#ef4444','#06b6d4','#84cc16','#ffffff',
                    ].map((c) => (
                      <button
                        key={c}
                        type="button"
                        title={c}
                        onClick={() => setDraft((d) => ({ ...d, accentColor: c }))}
                        className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${
                          draft.accentColor === c
                            ? 'border-foreground scale-110'
                            : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    {/* Picker livre */}
                    <label
                      className="relative h-6 w-6 cursor-pointer overflow-hidden rounded-full border-2 border-dashed border-border hover:border-primary"
                      title="Cor personalizada"
                    >
                      <span className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">+</span>
                      <input
                        type="color"
                        value={draft.accentColor || '#22c55e'}
                        onChange={(e) => setDraft((d) => ({ ...d, accentColor: e.target.value }))}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                    </label>
                  </div>
                  {/* Preview da cor seleccionada */}
                  {draft.accentColor ? (
                    <div className="flex items-center gap-2">
                      <span
                        className="h-4 w-4 rounded-full border border-border"
                        style={{ backgroundColor: draft.accentColor }}
                      />
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {draft.accentColor}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDraft((d) => ({ ...d, accentColor: '' }))}
                        className="text-[10px] text-muted-foreground hover:text-destructive"
                      >
                        limpar
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid max-w-xl gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Tema do escritório
                </span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {([
                    { id: 'default', label: '🌃 Padrão', desc: 'Azul noturno' },
                    { id: 'neon',    label: '🟣 Neon',   desc: 'Synthwave púrpura' },
                  ] as const).map(({ id, label, desc }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, officeTheme: id }))}
                      className={`flex flex-col items-start gap-0.5 rounded-xl border p-3 text-left transition-all ${
                        draft.officeTheme === id
                          ? 'border-primary/50 bg-primary/10 ring-1 ring-primary/30'
                          : 'border-border hover:bg-secondary/50'
                      }`}
                    >
                      <span className="text-sm">{label}</span>
                      <span className="text-[10px] text-muted-foreground">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Use <strong>Aplicar</strong> para preview local e <strong>Guardar + sync</strong> para persistir no servidor.
              </p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={loadFromCurrent}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Reverter
          </button>
          <button
            type="button"
            onClick={applyLocal}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-secondary"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
            Aplicar
          </button>
          <button
            type="button"
            onClick={() => onSyncNow()}
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/35 bg-primary/10 px-3 py-1.5 text-xs text-primary transition-colors hover:bg-primary/20"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Sincronizar agora
          </button>
          <button
            type="button"
            onClick={saveAndSync}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Save className="h-3.5 w-3.5" aria-hidden />
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
