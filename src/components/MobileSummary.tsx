type MobileSummaryProps = {
  agentsCount: number;
  timeLabel: string;
  onOpenAgents: () => void;
  onOpenActivity: () => void;
};

export function MobileSummary({ agentsCount, timeLabel, onOpenAgents, onOpenActivity }: MobileSummaryProps) {
  return (
    <section
      className="border-t border-border bg-card/30 px-3 py-3 lg:hidden"
      aria-label="Resumo em ecrã pequeno"
    >
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Agentes ({agentsCount}) · Sincronização: {timeLabel}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onOpenAgents}
          className="rounded-md border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-secondary"
        >
          Lista de agentes
        </button>
        <button
          type="button"
          onClick={onOpenActivity}
          className="rounded-md border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-secondary"
        >
          Feed de atividade
        </button>
      </div>
    </section>
  );
}
