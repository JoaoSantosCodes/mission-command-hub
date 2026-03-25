import type { ActivityEntry } from '@/types/hub';

type Props = {
  logs: ActivityEntry[];
};

/**
 * Gráfico de barras SVG mostrando actividade por hora nas últimas 24h.
 * Usa apenas SVG nativo — sem biblioteca de gráficos.
 */
export function ActivityTimeline({ logs }: Props) {
  // Bucketing por hora (0-23): entradas com timestamp HH:MM:SS após hora actual → ontem
  const now = new Date();
  const currentHour = now.getHours();

  const counts = new Array<number>(24).fill(0);

  for (const entry of logs) {
    const match = /^(\d{2}):\d{2}:\d{2}$/.exec(entry.timestamp);
    if (!match) continue;
    const h = parseInt(match[1]!, 10);
    if (Number.isNaN(h)) continue;
    // Entradas com hora > hora actual são provavelmente de ontem
    counts[h] = (counts[h] ?? 0) + 1;
  }

  const max = Math.max(...counts, 1);

  const W = 480;
  const H = 60;
  const BOTTOM = 50; // y do topo das barras (espaço para labels em baixo)
  const BAR_W = Math.floor(W / 24) - 1;

  return (
    <div className="px-1 pb-2 pt-1" aria-label="Timeline de actividade por hora">
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H + 14}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Actividade por hora (últimas 24h)"
      >
        {counts.map((count, h) => {
          const x = h * (W / 24);
          const barH = count === 0 ? 2 : Math.max(4, Math.round((count / max) * BOTTOM));
          const y = BOTTOM - barH;
          const isCurrentHour = h === currentHour;
          const fill = isCurrentHour
            ? 'var(--color-primary, #6366f1)'
            : count === 0
              ? 'var(--color-border, #e5e7eb)'
              : 'var(--color-muted-foreground, #6b7280)';

          return (
            <g key={h}>
              <rect
                x={x + 1}
                y={y}
                width={BAR_W}
                height={barH}
                rx={2}
                fill={fill}
                opacity={count === 0 ? 0.3 : 0.75}
              >
                <title>{`${String(h).padStart(2, '0')}:00 — ${count} evento${count !== 1 ? 's' : ''}`}</title>
              </rect>
              {/* Rótulos a cada 6 horas */}
              {h % 6 === 0 && (
                <text
                  x={x + BAR_W / 2}
                  y={BOTTOM + 12}
                  textAnchor="middle"
                  fontSize="8"
                  fill="var(--color-muted-foreground, #9ca3af)"
                  fontFamily="var(--font-mono, monospace)"
                >
                  {String(h).padStart(2, '0')}h
                </text>
              )}
            </g>
          );
        })}
        {/* Linha base */}
        <line
          x1={0}
          y1={BOTTOM + 1}
          x2={W}
          y2={BOTTOM + 1}
          stroke="var(--color-border, #e5e7eb)"
          strokeWidth={1}
          opacity={0.5}
        />
      </svg>
    </div>
  );
}
