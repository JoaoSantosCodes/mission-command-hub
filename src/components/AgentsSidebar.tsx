import { useEffect, useState } from "react";
import { HubMascot } from "@/components/HubMascot";
import { TeamStatusOverview } from "@/components/TeamStatusOverview";
import { Bot, Database, FileText, FolderKanban, LayoutList, Plus } from "lucide-react";
import type { ActivityEntry, AgentRow, AioxInfo } from "@/types/hub";
import { MobileDrawer } from "@/components/MobileDrawer";
import {
  AGENT_PROFILE_CHANGED_EVENT,
  pickDisplayName,
  readAgentProfile,
} from "@/lib/agent-profile-store";
import type { IntegrationsStatus } from "@/lib/api";

type AgentsSidebarProps = {
  info: AioxInfo | null;
  agents: AgentRow[];
  logs: ActivityEntry[];
  loading: boolean;
  onSelectAgent: (a: AgentRow) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  /** Quando `true` e `onCreateAgent` definido, mostra atalho «Novo agente». */
  canCreate?: boolean;
  onCreateAgent?: () => void;
  integrations?: IntegrationsStatus | null;
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
  logs,
  loading,
  onSelectAgent,
  mobileOpen,
  onMobileClose,
  canCreate = false,
  onCreateAgent,
  integrations = null,
}: AgentsSidebarProps) {
  const [sideTab, setSideTab] = useState<"team" | "list" | "integrations">("team");
  const [profileTick, setProfileTick] = useState(0);

  useEffect(() => {
    const onChanged = () => setProfileTick((v) => v + 1);
    window.addEventListener(AGENT_PROFILE_CHANGED_EVENT, onChanged as EventListener);
    window.addEventListener("storage", onChanged);
    return () => {
      window.removeEventListener(AGENT_PROFILE_CHANGED_EVENT, onChanged as EventListener);
      window.removeEventListener("storage", onChanged);
    };
  }, []);

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
          Caminho abaixo: raiz do <strong className="font-medium text-foreground/85">projeto AIOX</strong> (contém{" "}
          <span className="font-mono text-foreground/90">.aiox-core</span>). A lista de agentes segue{" "}
          <span className="font-mono text-[9px] text-foreground/85">agents_dir</span> nos YAML (framework → project → local).
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
        <div
          className="mb-2 flex gap-1 rounded-md border border-border bg-muted/30 p-0.5"
          role="tablist"
          aria-label="Painel lateral"
        >
          <button
            type="button"
            role="tab"
            aria-selected={sideTab === "team"}
            onClick={() => setSideTab("team")}
            className={`flex-1 rounded px-2 py-1 text-[10px] font-medium uppercase tracking-wide transition-colors ${
              sideTab === "team"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Estado
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={sideTab === "list"}
            onClick={() => setSideTab("list")}
            className={`flex-1 rounded px-2 py-1 text-[10px] font-medium uppercase tracking-wide transition-colors ${
              sideTab === "list"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Lista
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={sideTab === "integrations"}
            onClick={() => setSideTab("integrations")}
            className={`flex-1 rounded px-2 py-1 text-[10px] font-medium uppercase tracking-wide transition-colors ${
              sideTab === "integrations"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Status de integrações"
          >
            Integrações
          </button>
        </div>
        {sideTab === "team" ? (
          <TeamStatusOverview
            agents={agents}
            logs={logs}
            loading={loading}
            onSelectAgent={pickAgent}
          />
        ) : sideTab === "list" ? (
          loading ? (
            <p className="text-xs text-muted-foreground">A carregar…</p>
          ) : agents.length === 0 ? (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Nenhum ficheiro <span className="font-mono">.md</span> na pasta de agentes. Verifica{" "}
              <span className="font-mono">AIOX_CORE_PATH</span>.
            </p>
          ) : (
            <ul key={profileTick} className="space-y-2">
              {agents.map((a, i) => {
                const accent = AGENT_ACCENTS[i % AGENT_ACCENTS.length];
                const p = readAgentProfile(a.id);
                const displayName = pickDisplayName(a.id, a.id);
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
                          style={
                            p.accentColor
                              ? {
                                  color: p.accentColor,
                                  background: `${p.accentColor}22`,
                                  boxShadow: `inset 0 0 0 1px ${p.accentColor}55`,
                                }
                              : undefined
                          }
                        >
                          <FileText className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="truncate font-mono text-xs font-semibold text-primary"
                              style={p.accentColor ? { color: p.accentColor } : undefined}
                              title={p.displayName ? a.id : undefined}
                            >
                              {displayName}
                            </span>
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
          )
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl border border-border/80 bg-background/50 p-3">
              <div className="flex items-center gap-2">
                <Database className="h-3.5 w-3.5 text-primary" aria-hidden />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Integrações</p>
              </div>
              <div className="mt-3 space-y-2">
                <IntegrationRow
                  label="DB / Feed"
                  ok={integrations?.database.activityBackend === "postgres"}
                  value={integrations?.database.activityBackend ?? "—"}
                  hint={integrations?.database.configured ? "DATABASE_URL activo" : "Ficheiro JSON (fallback)"}
                />
                <IntegrationRow
                  label="CLI aiox"
                  ok={integrations?.exec.configured === true}
                  value={integrations?.exec.configured ? "OK" : "—"}
                />
                <IntegrationRow
                  label="OpenIA (Dúvidas)"
                  ok={integrations?.doubts.llmEnabled === true && integrations?.doubts.openaiValidated === true}
                  value={
                    integrations
                      ? integrations.doubts.llmEnabled
                        ? integrations.doubts.openaiValidated
                          ? "OK"
                          : "falhou"
                        : "desligado"
                      : "—"
                  }
                  hint={
                    integrations?.doubts.llmEnabled && integrations?.doubts.openaiValidated === false
                      ? String(integrations.doubts.openaiError ?? "Erro ao validar OpenAI").slice(0, 80)
                      : integrations?.doubts.doubtsOptIn
                        ? "MISSION_DOUBTS_LLM=1"
                        : "MISSION_DOUBTS_LLM!=1"
                  }
                />
                <IntegrationRow
                  label="OpenAI key"
                  ok={integrations?.doubts.openaiValidated === true}
                  value={
                    integrations
                      ? integrations.doubts.openaiValidated
                        ? "OK"
                        : integrations.doubts.openaiKeyConfigured
                          ? "falhou"
                          : "—"
                      : "—"
                  }
                  hint={
                    integrations?.doubts.openaiValidated === false
                      ? String(integrations.doubts.openaiError ?? "Erro ao validar OpenAI").slice(0, 80)
                      : undefined
                  }
                />
                <IntegrationRow
                  label="MCP Notion (token)"
                  ok={integrations?.notion.tokenValidated === true}
                  value={
                    integrations
                      ? integrations.notion.tokenValidated
                        ? "OK"
                        : integrations.notion.tokenConfigured
                          ? "falhou"
                          : "—"
                      : "—"
                  }
                  hint={
                    integrations?.notion.tokenValidated === false
                      ? String(integrations.notion.tokenError ?? "Erro ao validar Notion").slice(0, 80)
                      : undefined
                  }
                />
                <IntegrationRow
                  label="MCP Figma (token)"
                  ok={integrations?.figma.tokenValidated === true}
                  value={
                    integrations
                      ? integrations.figma.tokenValidated
                        ? "OK"
                        : integrations.figma.tokenConfigured
                          ? "falhou"
                          : "—"
                      : "—"
                  }
                  hint={
                    integrations?.figma.tokenValidated === false
                      ? String(integrations.figma.tokenError ?? "Erro ao validar Figma").slice(0, 80)
                      : undefined
                  }
                />
              </div>
            </div>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Este painel valida integrações no servidor com chamadas HTTP leves. Funciona em qualquer IDE (VSCODE/VS/...) — o que importa é o
              `.env` do projeto.
            </p>
          </div>
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

function IntegrationRow({
  label,
  ok,
  value,
  hint,
}: {
  label: string;
  ok?: boolean;
  value: string;
  hint?: string;
}) {
  const tone = ok === true ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground";
  const badge = ok === true ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/25" : "bg-muted/40 text-muted-foreground";
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {hint ? <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p> : null}
      </div>
      <div className={`shrink-0 rounded-full border border-border px-2.5 py-1 text-[10px] font-mono ${badge}`}>
        <span className={tone}>{value}</span>
      </div>
    </div>
  );
}
