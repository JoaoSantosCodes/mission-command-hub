import { PanelRightClose, PanelRightOpen } from "lucide-react";
import type { ActivityEntry } from "@/types/hub";
import { MobileDrawer } from "@/components/MobileDrawer";

type ActivityPanelProps = {
  logs: ActivityEntry[];
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
};

function ActivityFeedList({ logs }: { logs: ActivityEntry[] }) {
  if (logs.length === 0) {
    return <p className="text-[11px] text-muted-foreground">Sem eventos — envia um comando acima.</p>;
  }
  return (
    <ul className="space-y-1">
      {logs.map((log) => (
        <li key={log.id} className="rounded-md border border-border bg-background/50 p-2.5">
          <div className="mb-1 flex items-center gap-2">
            <span className="font-mono text-[10px] text-primary">{log.agent}</span>
            <span className="ml-auto font-mono text-[10px] text-muted-foreground">{log.timestamp}</span>
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
          <div className="scrollbar-thin flex-1 space-y-1 overflow-auto p-3">
            <ActivityFeedList logs={logs} />
          </div>
        </aside>
      )}

      <MobileDrawer open={mobileOpen} onClose={onMobileClose} side="right" title="Feed de atividade">
        <div className="scrollbar-thin flex h-full flex-col overflow-auto p-3">
          <ActivityFeedList logs={logs} />
        </div>
      </MobileDrawer>
    </>
  );
}
