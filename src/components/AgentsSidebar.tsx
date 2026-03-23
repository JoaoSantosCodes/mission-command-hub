import { HubMascot } from "@/components/HubMascot";
import { Bot, FileText, FolderKanban, LayoutList, Plus } from "lucide-react";
import type { AgentRow, AioxInfo } from "@/types/hub";
import { MobileDrawer } from "@/components/MobileDrawer";

type AgentsSidebarProps = {
  info: AioxInfo | null;
  agents: AgentRow[];
  loading: boolean;
  onSelectAgent: (a: AgentRow) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  /** Quando `true` e `onCreateAgent` definido, mostra atalho «Novo agente». */
  canCreate?: boolean;
  onCreateAgent?: () => void;
};

const AGENT_ACCENTS = [
  "bg-sky-500/15 text-sky-400 ring-sky-500/25",
  "bg-emerald-500/15 text-emerald-400 ring-emerald-500/25",
  "bg-violet-500/15 text-violet-400 ring-violet-500/25",
  "bg-amber-500/15 text-amber-400 ring-amber-500/25",
  "bg-cyan-500/15 text-cyan-400 ring-cyan-500/25",
  "bg-rose-500/15 text-rose-400 ring-rose-500/25",
];

export function AgentsSidebar({
  info,
  agents,
  loading,
  onSelectAgent,
  mobileOpen,
  onMobileClose,
  canCreate = false,
  onCreateAgent,
}: AgentsSidebarProps) {
  const pickAgent = (a: AgentRow) => {
    onSelectAgent(a);
    onMobileClose();
  };

  const inner = (
    <>
      <div className="border-b border-border p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <FolderKanban className="h-3.5 w-3.5" aria-hidden />
          Projetos
        </div>
        <div className="flex items-center gap-2 rounded-md bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary">
          <HubMascot size="sm" />
          Architecture Agents Hub
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
          Ponte ao <span className="font-mono text-foreground/90">aiox-core</span>
        </p>
        <p className="mt-1 break-all font-mono text-[9px] text-muted-foreground/90" title={info?.aioxRoot}>
          {info?.aioxRoot ?? "…"}
        </p>
      </div>

      <div className="border-b border-border p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <LayoutList className="h-3.5 w-3.5" aria-hidden />
          Backlog geral
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Definições</span>
          <span className="font-mono font-medium text-foreground">{agents.length}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">CLI</span>
          <span className="font-mono text-accent">{info?.aioxExists ? "ok" : "—"}</span>
        </div>
      </div>

      <div className="scrollbar-thin flex-1 overflow-auto p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Bot className="h-3.5 w-3.5" aria-hidden />
            Agentes de IA
          </div>
          {canCreate && onCreateAgent ? (
            <button
              type="button"
              onClick={() => {
                onCreateAgent();
                onMobileClose();
              }}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary transition-colors hover:bg-primary/20"
            >
              <Plus className="h-3 w-3" aria-hidden />
              Novo
            </button>
          ) : null}
        </div>
        {loading ? (
          <p className="text-xs text-muted-foreground">A carregar…</p>
        ) : agents.length === 0 ? (
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Nenhum ficheiro <span className="font-mono">.md</span> na pasta de agentes. Verifica{" "}
            <span className="font-mono">AIOX_CORE_PATH</span>.
          </p>
        ) : (
          <ul className="space-y-2">
            {agents.map((a, i) => {
              const accent = AGENT_ACCENTS[i % AGENT_ACCENTS.length];
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => pickAgent(a)}
                    className="group w-full rounded-xl border border-border bg-card/80 p-2.5 text-left shadow-sm transition-all hover:border-primary/35 hover:bg-card hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ${accent}`}
                        aria-hidden
                      >
                        <FileText className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-mono text-xs font-semibold text-primary">{a.id}</span>
                          <span
                            className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 opacity-80 ring-2 ring-emerald-500/30"
                            title="Definição disponível no disco"
                            aria-hidden
                          />
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground" title={a.title}>
                          {a.title}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );

  return (
    <>
      <aside
        className="hidden w-64 shrink-0 flex-col overflow-hidden border-r border-border bg-card/50 lg:flex"
        aria-label="Projetos e agentes"
      >
        {inner}
      </aside>

      <MobileDrawer
        open={mobileOpen}
        onClose={onMobileClose}
        side="left"
        title="Projetos e agentes"
      >
        <div className="flex h-full flex-col overflow-hidden bg-card/50">{inner}</div>
      </MobileDrawer>
    </>
  );
}
