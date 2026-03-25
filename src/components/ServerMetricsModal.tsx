import { useEffect, useRef, useState } from 'react';
import { Cpu, HardDrive, MemoryStick, Server, X } from 'lucide-react';

type Metrics = {
  cpu_pct: number;
  mem_pct: number;
  disk_pct: number;
  temp_c: number;
  uptime: number;
};

function fmtUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60) % 60;
  const h = Math.floor(seconds / 3600) % 24;
  const d = Math.floor(seconds / 86400);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: color }}
      />
    </div>
  );
}

type Props = { open: boolean; onClose: () => void };

export function ServerMetricsModal({ open, onClose }: Props) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(false);

    const fetch_ = async () => {
      try {
        const r = await fetch('/api/aiox/metrics');
        if (!r.ok) throw new Error('bad response');
        const data = (await r.json()) as Metrics;
        setMetrics(data);
        setError(false);
      } catch {
        setError(true);
      }
    };

    void fetch_();
    intervalRef.current = window.setInterval(() => void fetch_(), 5_000);
    return () => {
      if (intervalRef.current != null) window.clearInterval(intervalRef.current);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-80 rounded-xl border border-border bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-primary" aria-hidden />
            <span className="text-sm font-semibold text-foreground">Server Rack</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {error ? (
          <p className="text-center text-xs text-destructive">Erro ao obter métricas</p>
        ) : !metrics ? (
          <p className="text-center text-xs text-muted-foreground">A carregar…</p>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                  <Cpu className="h-3 w-3" aria-hidden />
                  CPU
                </span>
                <span className="font-mono text-[11px] text-foreground">{metrics.cpu_pct}%</span>
              </div>
              <Bar pct={metrics.cpu_pct} color={metrics.cpu_pct > 80 ? '#ef4444' : '#6366f1'} />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                  <MemoryStick className="h-3 w-3" aria-hidden />
                  RAM
                </span>
                <span className="font-mono text-[11px] text-foreground">{metrics.mem_pct}%</span>
              </div>
              <Bar pct={metrics.mem_pct} color={metrics.mem_pct > 85 ? '#ef4444' : '#10b981'} />
            </div>

            {metrics.disk_pct > 0 && (
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <HardDrive className="h-3 w-3" aria-hidden />
                    Disco
                  </span>
                  <span className="font-mono text-[11px] text-foreground">{metrics.disk_pct}%</span>
                </div>
                <Bar pct={metrics.disk_pct} color={metrics.disk_pct > 90 ? '#ef4444' : '#f59e0b'} />
              </div>
            )}

            <div className="mt-2 flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Uptime
              </span>
              <span className="font-mono text-[11px] text-foreground">
                {fmtUptime(metrics.uptime)}
              </span>
            </div>

            <p className="text-center text-[10px] text-muted-foreground/60">
              Atualiza a cada 5 s
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
