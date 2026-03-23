import { useEffect, useMemo, useState } from "react";
import { HubMascot } from "@/components/HubMascot";
import { TeamStatusOverview } from "@/components/TeamStatusOverview";
import { Bot, BookOpen, Database, FileText, FolderKanban, LayoutList, Layers, Plus, Sparkles, Terminal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
  const latestTeamActivity = useMemo(
    () => logs.find((l) => l.kind === "command" || l.kind === "agent" || l.kind === "bridge") ?? logs[0] ?? null,
    [logs]
  );

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
        {latestTeamActivity ? (
          <div className="mb-2 rounded-md border border-border/80 bg-background/60 px-2.5 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Última atividade</p>
            <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-foreground/90">{latestTeamActivity.action}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {latestTeamActivity.agent} · {latestTeamActivity.timestamp}
            </p>
          </div>
        ) : null}
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
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                <Database className="h-3.5 w-3.5 text-primary" aria-hidden />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Integrações</p>
                </div>
                <span className="rounded-full border border-border bg-primary/10 px-2 py-1 text-[10px] font-mono text-primary">
                  {integrations?.summary?.healthScore ?? 0}%
                </span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Saúde geral:{" "}
                <span className="font-mono text-foreground">
                  {integrations?.summary ? `${integrations.summary.okCount}/${integrations.summary.total}` : "—"}
                </span>{" "}
                · atualizado{" "}
                <span className="font-mono text-foreground">
                  {integrations?.generatedAt ? new Date(integrations.generatedAt).toLocaleTimeString("pt-PT") : "—"}
                </span>
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2">
                <IntegrationServiceCard
                  icon={Database}
                  name="DB / FEED"
                  status={integrations?.database.activityBackend === "postgres" ? "OK" : "PENDENTE"}
                  statusTone={integrations?.database.activityBackend === "postgres" ? "ok" : "pending"}
                  value={integrations?.database.activityBackend ?? "—"}
                  hint={integrations?.database.activityBackend === "postgres" ? undefined : integrations?.database.configured ? "DB env ok, mas fallback em runtime" : "Sem DATABASE_URL (fallback para ficheiro)"}
                />
                <IntegrationServiceCard
                  icon={Terminal}
                  name="CLI AIOX"
                  status={integrations?.exec.configured === true ? "OK" : "PENDENTE"}
                  statusTone={integrations?.exec.configured === true ? "ok" : "pending"}
                  value={integrations?.exec.configured === true ? "ENABLE_AIOX_CLI_EXEC=1" : "—"}
                />
                <IntegrationServiceCard
                  icon={Sparkles}
                  name="OPENAI (DÚVIDAS)"
                  status={integrations?.doubts.llmEnabled === true && integrations?.doubts.openaiValidated === true ? "OK" : "PENDENTE"}
                  statusTone={integrations?.doubts.llmEnabled === true && integrations?.doubts.openaiValidated === true ? "ok" : "pending"}
                  value={
                    integrations?.doubts.llmEnabled
                      ? integrations?.doubts.openaiValidated
                        ? "Validação OK"
                        : "Falhou validação"
                      : "Desligado (opt-in)"
                  }
                  hint={
                    integrations?.doubts.llmEnabled && integrations?.doubts.openaiValidated === false
                      ? String(integrations.doubts.openaiError ?? "Erro ao validar OpenAI").slice(0, 90)
                      : integrations?.doubts.doubtsOptIn
                        ? "MISSION_DOUBTS_LLM=1"
                        : "Definir MISSION_DOUBTS_LLM=1 + key"
                  }
                />
                <IntegrationServiceCard
                  icon={BookOpen}
                  name="NOTION (MCP)"
                  status={integrations?.notion.tokenValidated === true ? "OK" : "PENDENTE"}
                  statusTone={integrations?.notion.tokenValidated === true ? "ok" : "pending"}
                  value={integrations?.notion.tokenConfigured ? "Token presente" : "Sem token"}
                  hint={
                    integrations?.notion.tokenValidated === false
                      ? String(integrations.notion.tokenError ?? "Token não válido").slice(0, 90)
                      : undefined
                  }
                />
                <IntegrationServiceCard
                  icon={Layers}
                  name="FIGMA (MCP)"
                  status={integrations?.figma.tokenValidated === true ? "OK" : "PENDENTE"}
                  statusTone={integrations?.figma.tokenValidated === true ? "ok" : "pending"}
                  value={integrations?.figma.tokenConfigured ? "Token presente" : "Sem token"}
                  hint={
                    integrations?.figma.tokenValidated === false
                      ? String(integrations.figma.tokenError ?? "Token não válido").slice(0, 90)
                      : undefined
                  }
                />
                <IntegrationServiceCard
                  icon={Database}
                  name="FISH (persistência)"
                  status={integrations?.fish.enabled ? "OK" : "PENDENTE"}
                  statusTone={integrations?.fish.enabled ? "ok" : "pending"}
                  value={integrations?.fish.persistence ?? "file"}
                  hint="Persistência local (sem chamadas externas)."
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

function IntegrationServiceCard({
  icon: Icon,
  name,
  status,
  statusTone,
  value,
  hint,
}: {
  icon: LucideIcon;
  name: string;
  status: "OK" | "PENDENTE";
  statusTone: "ok" | "pending";
  value: string;
  hint?: string;
}) {
  const badge =
    statusTone === "ok"
      ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-400"
      : "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-400";

  return (
    <div className="rounded-xl border border-border/80 bg-card/80 p-3 shadow-sm transition-all hover:border-primary/30 hover:bg-card">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/12 ring-1 ring-primary/25" aria-hidden>
          <Icon className="h-[18px] w-[18px] text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-foreground">{name}</p>
          </div>
          <div className={`mt-1 inline-flex rounded-full border border-border px-2 py-1 text-[10px] font-mono ${badge}`}>
            {status}
          </div>
          <p className="mt-1 line-clamp-1 text-[10px] leading-snug text-muted-foreground font-mono">{value}</p>
          {hint ? <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-muted-foreground">{hint}</p> : null}
        </div>
      </div>
    </div>
  );
}
