import type { ActivityEntry, AgentRow } from '@/types/hub';

const SQUADS = {
  product: {
    label: 'Produto',
    color: 'blue',
    ids: ['po', 'pm', 'analyst', 'ux-design-expert'],
  },
  dev: {
    label: 'Desenvolvimento',
    color: 'green',
    ids: ['dev', 'architect', 'data-engineer'],
  },
  ops: {
    label: 'Operações',
    color: 'orange',
    ids: ['devops', 'qa', 'sm'],
  },
  orchestration: {
    label: 'Orquestração',
    color: 'purple',
    ids: ['aiox-master', 'squad-creator', 'starter'],
  },
} as const;

const COLOR_CLASSES: Record<string, { badge: string; border: string; dot: string }> = {
  blue: {
    badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/20',
    dot: 'bg-blue-500',
  },
  green: {
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  orange: {
    badge: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    border: 'border-orange-500/20',
    dot: 'bg-orange-500',
  },
  purple: {
    badge: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    border: 'border-violet-500/20',
    dot: 'bg-violet-500',
  },
};

type Props = {
  agents: AgentRow[];
  logs: ActivityEntry[];
};

function lastActivityFor(agentId: string, logs: ActivityEntry[]): string | null {
  const entry = logs.find((l) => l.agent.toLowerCase().includes(agentId.toLowerCase()));
  return entry ? entry.action.slice(0, 80) : null;
}

function AgentCard({ agent, logs }: { agent: AgentRow; logs: ActivityEntry[] }) {
  const lastActivity = lastActivityFor(agent.id, logs);
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm shadow-sm">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold uppercase text-muted-foreground">
        {agent.id.slice(0, 2)}
      </span>
      <div className="min-w-0">
        <div className="truncate font-medium text-foreground" title={agent.title}>
          {agent.title || agent.id}
        </div>
        <div className="truncate font-mono text-[10px] text-muted-foreground">@{agent.id}</div>
        {lastActivity && (
          <div
            className="mt-0.5 truncate text-[10px] text-muted-foreground/70"
            title={lastActivity}
          >
            {lastActivity}
          </div>
        )}
      </div>
    </div>
  );
}

export function SquadView({ agents, logs }: Props) {
  const assignedIds = new Set<string>(Object.values(SQUADS).flatMap((s) => s.ids));
  const unassigned = agents.filter((a) => !assignedIds.has(a.id));

  return (
    <main
      id="main-content"
      className="flex-1 overflow-auto p-4 sm:p-6"
      aria-label="Vista por squads"
    >
      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground">Squads</h2>
        <p className="text-[11px] text-muted-foreground">
          {agents.length} agente{agents.length !== 1 ? 's' : ''} distribuídos por equipa
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(Object.entries(SQUADS) as [string, (typeof SQUADS)[keyof typeof SQUADS]][]).map(
          ([key, squad]) => {
            const colors = COLOR_CLASSES[squad.color] ?? COLOR_CLASSES['blue']!;
            const squadAgents = agents.filter((a) =>
              (squad.ids as readonly string[]).includes(a.id)
            );
            return (
              <section
                key={key}
                className={`rounded-xl border bg-card p-4 shadow-sm ${colors.border}`}
                aria-label={`Squad ${squad.label}`}
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${colors.dot}`} aria-hidden />
                  <h3
                    className={`text-xs font-semibold uppercase tracking-wider ${colors.badge} rounded px-1.5 py-0.5`}
                  >
                    {squad.label}
                  </h3>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {squadAgents.length}/{squad.ids.length}
                  </span>
                </div>
                {squadAgents.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {squadAgents.map((a) => (
                      <AgentCard key={a.id} agent={a} logs={logs} />
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-[11px] text-muted-foreground/60 py-4">
                    Nenhum agente carregado para este squad
                  </p>
                )}
              </section>
            );
          }
        )}
      </div>

      {unassigned.length > 0 && (
        <section className="mt-4 rounded-xl border border-dashed border-border bg-card/50 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Sem squad ({unassigned.length})
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {unassigned.map((a) => (
              <AgentCard key={a.id} agent={a} logs={logs} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
