import { HubMascot } from "@/components/HubMascot";
import { Bot, FolderKanban, LayoutList, Plus } from "lucide-react";
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
          <ul className="space-y-1.5">
            {agents.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => pickAgent(a)}
                  className="w-full rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-medium text-primary">{a.id}</span>
                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" aria-hidden />
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground" title={a.title}>
                    {a.title}
                  </p>
                </button>
              </li>
            ))}
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
