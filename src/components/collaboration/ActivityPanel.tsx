import { useState } from 'react';
import {
  BarChart2,
  FileText,
  Inbox,
  MessageSquare,
  PanelRightClose,
  PanelRightOpen,
  Shell,
  Sparkles,
  Terminal,
} from 'lucide-react';

import type { ActivityEntry } from '@/types/hub';
import { MobileDrawer } from '@/components/layout/MobileDrawer';
import { ActivityTimeline } from '@/components/collaboration/ActivityTimeline';

function FeedKindIcon({ kind, type }: { kind?: string; type: string }) {
  const k = (kind || type || '').toLowerCase();
  const cls = 'h-3.5 w-3.5 shrink-0 text-primary/85';
  if (k === 'agent') return <FileText className={cls} aria-hidden />;
  if (k === 'cli') return <Shell className={cls} aria-hidden />;
  if (k === 'command') return <Terminal className={cls} aria-hidden />;
  if (k === 'bridge') return <Sparkles className={cls} aria-hidden />;
  return <MessageSquare className={cls} aria-hidden />;
}

type ActivityPanelProps = {
  logs: ActivityEntry[];
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
};

/** Mantém a ordem; ignora repetições do mesmo `id` (ex.: race no refresh). */
function dedupeActivityLogsById(logs: ActivityEntry[]): ActivityEntry[] {
  const seen = new Set<string>();
  const out: ActivityEntry[] = [];
  for (const log of logs) {
    if (seen.has(log.id)) continue;
    seen.add(log.id);
    out.push(log);
  }
  return out;
}

function ActivityEmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border/90 bg-muted/20 px-3 py-6 text-center dark:bg-muted/10">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
        <Inbox className="h-6 w-6 text-primary" aria-hidden />
      </div>
      <p className="mt-3 text-xs font-medium text-foreground">Ainda sem eventos</p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
        Usa o comando <span className="font-mono text-foreground/90">@hub</span> na barra superior.
        Cada envio válido aparece aqui com agente e hora.
      </p>
      <ul className="mt-4 space-y-2 text-left text-[10px] text-muted-foreground">
        <li className="flex gap-2">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
          <span>Dica: o feed pode usar ficheiro JSON ou PostgreSQL (ver Estado da ponte).</span>
        </li>
      </ul>
    </div>
  );
}

function ActivityFeedList({ logs }: { logs: ActivityEntry[] }) {
  const unique = dedupeActivityLogsById(logs);
  if (unique.length === 0) {
    return <ActivityEmptyState />;
  }
  return (
    <ul className="space-y-1">
      {unique.map((log) => (
        <li
          key={log.id}
          className="rounded-lg border border-border/90 bg-background/60 p-2.5 shadow-sm"
        >
          <div className="mb-1 flex items-center gap-2">
            <FeedKindIcon kind={log.kind} type={log.type} />
            <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-primary">
              {log.agent}
            </span>
            <span className="ml-auto font-mono text-[10px] text-muted-foreground">
              {log.timestamp}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-foreground">{log.action}</p>
        </li>
      ))}
    </ul>
  );
}

export function ActivityPanel({
  logs,
  collapsed,
  onCollapsedChange,
  mobileOpen,
  onMobileClose,
}: ActivityPanelProps) {
  const [showTimeline, setShowTimeline] = useState(false);

  return (
    <>
      {collapsed ? (
        <div className="hidden w-10 shrink-0 flex-col items-center border-l border-border bg-card/50 pt-3 lg:flex">
          <button
            type="button"
            onClick={() => onCollapsedChange(false)}
            className="rounded-md text-muted-foreground transition-colors hover:text-foreground active:scale-95"
            aria-expanded={false}
            title="Expandir feed"
          >
            <PanelRightOpen className="h-4 w-4" aria-hidden />
          </button>
          <span className="mt-2 text-[9px] uppercase tracking-widest text-muted-foreground [writing-mode:vertical-rl] rotate-180">
            Atividade
          </span>
        </div>
      ) : (
        <aside
          className="hidden w-72 shrink-0 flex-col overflow-hidden border-l border-border bg-card/50 lg:flex"
          aria-label="Feed de atividade"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border p-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-accent animate-pulse-dot" aria-hidden />
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Feed de atividade
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowTimeline((v) => !v)}
                className={`rounded-md p-1 transition-colors ${showTimeline ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                aria-pressed={showTimeline}
                title="Mostrar timeline por hora"
              >
                <BarChart2 className="h-3.5 w-3.5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => onCollapsedChange(true)}
                className="rounded-md text-muted-foreground transition-colors hover:text-foreground active:scale-95"
                aria-expanded
                title="Recolher feed"
              >
                <PanelRightClose className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
          {showTimeline && (
            <div className="shrink-0 border-b border-border">
              <ActivityTimeline logs={logs} />
            </div>
          )}
          <div className="scrollbar-thin flex-1 space-y-1 overflow-auto p-3">
            <ActivityFeedList logs={logs} />
          </div>
        </aside>
      )}

      <MobileDrawer
        open={mobileOpen}
        onClose={onMobileClose}
        side="right"
        title="Feed de atividade"
      >
        <div className="scrollbar-thin flex h-full flex-col overflow-auto p-3">
          <ActivityFeedList logs={logs} />
        </div>
      </MobileDrawer>
    </>
  );
}
