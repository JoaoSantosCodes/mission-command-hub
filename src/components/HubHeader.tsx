import type { FormEvent } from "react";
import {
  LayoutGrid,
  Loader2,
  MessageCircle,
  Monitor,
  Moon,
  PanelLeft,
  PanelRight,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  SquareKanban,
  Sun,
  Terminal,
} from "lucide-react";
import { HubMascot } from "@/components/HubMascot";
import { MAX_COMMAND_CHARS } from "@/constants";
import type { ThemeMode } from "@/hooks/useTheme";

export type HubViewMode = "hub" | "commandCenter" | "taskCanvas";

type HubHeaderProps = {
  cmd: string;
  setCmd: (v: string) => void;
  cmdFocus: boolean;
  setCmdFocus: (v: boolean) => void;
  cmdBusy: boolean;
  onSubmit: (e: FormEvent) => void;
  onRefresh: () => void;
  refreshing: boolean;
  timeLabel: string;
  loading: boolean;
  agentsCount: number;
  versionLine: string;
  /** `null` até ao primeiro pedido; `true` / `false` conforme os pedidos a `/api` funcionam. */
  apiOnline: boolean | null;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onOpenAgentsDrawer: () => void;
  onOpenActivityDrawer: () => void;
  /** Painel lateral Dúvidas / chat local */
  onOpenDoubts?: () => void;
  onOpenCustomization?: () => void;
  onOpenIntegrationsConfig?: () => void;
  customizationSyncLabel?: string;
  viewMode?: HubViewMode;
  onViewModeChange?: (mode: HubViewMode) => void;
};

export function HubHeader({
  cmd,
  setCmd,
  cmdFocus,
  setCmdFocus,
  cmdBusy,
  onSubmit,
  onRefresh,
  refreshing,
  timeLabel,
  loading,
  agentsCount,
  versionLine,
  apiOnline,
  theme,
  onToggleTheme,
  onOpenAgentsDrawer,
  onOpenActivityDrawer,
  onOpenDoubts,
  onOpenCustomization,
  onOpenIntegrationsConfig,
  customizationSyncLabel,
  viewMode = "hub",
  onViewModeChange,
}: HubHeaderProps) {
  return (
    <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-card/80 px-3 py-2.5 sm:gap-4 sm:px-4">
      <div className="flex shrink-0 items-center gap-2" title="Architecture Agents Hub">
        <HubMascot size="md" className="shadow-sm" />
        <span className="max-w-[11rem] truncate text-xs font-semibold tracking-tight text-foreground sm:max-w-none sm:text-sm">
          Architecture Agents Hub
        </span>
      </div>
      {customizationSyncLabel ? (
        <div
          className="hidden shrink-0 items-center rounded-full border border-border bg-secondary/30 px-2 py-1 text-[10px] font-medium text-muted-foreground sm:flex"
          title="Estado de sincronização da personalização"
        >
          perfil: {customizationSyncLabel}
        </div>
      ) : null}

      <div
        className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-secondary/30 px-2 py-1 text-[10px] font-medium text-muted-foreground"
        title={
          apiOnline === true
            ? "Ponte /api a responder (em dev/preview o Express corre embebido no Vite; em produção costuma ser :8787)"
            : apiOnline === false
              ? "Sem resposta em /api — corre npm run dev (recomendado) ou npm run build && npm start"
              : "A verificar ligação à API…"
        }
      >
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
            apiOnline === true
              ? "bg-emerald-500 shadow-[0_0_6px_rgba(34,197,94,0.55)]"
              : apiOnline === false
                ? "bg-red-500"
                : "animate-pulse bg-amber-400"
          }`}
          aria-hidden
        />
        <span className="hidden max-w-[5.5rem] truncate sm:inline">
          {apiOnline === true ? "API ligada" : apiOnline === false ? "API offline" : "API …"}
        </span>
        <span className="font-mono text-[9px] opacity-80">/api</span>
      </div>

      <div className="flex shrink-0 items-center gap-1 lg:hidden">
        <button
          type="button"
          onClick={onOpenAgentsDrawer}
          className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          title="Abrir lista de agentes"
        >
          <PanelLeft className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onOpenActivityDrawer}
          className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          title="Abrir feed de atividade"
        >
          <PanelRight className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <form onSubmit={onSubmit} className="min-w-[12rem] flex-1 max-w-2xl" aria-label="Comando global">
        <div
          className={`flex items-center gap-2 rounded-lg border bg-card px-3 py-2 transition-all duration-200 sm:gap-3 sm:px-4 sm:py-2.5 ${
            cmdFocus ? "border-primary glow-blue-sm" : "border-border"
          }`}
        >
          <Terminal className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span className="hidden shrink-0 font-mono text-xs font-medium text-primary sm:inline">@hub</span>
          <input
            value={cmd}
            onChange={(e) => setCmd(e.target.value)}
            onFocus={() => setCmdFocus(true)}
            onBlur={() => setCmdFocus(false)}
            disabled={cmdBusy}
            maxLength={MAX_COMMAND_CHARS}
            placeholder="Comando…"
            title={`Máximo ${MAX_COMMAND_CHARS} caracteres`}
            className="min-w-0 flex-1 bg-transparent font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground"
            aria-label="Texto do comando"
          />
          <button
            type="submit"
            disabled={cmdBusy || !cmd.trim()}
            className="flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 sm:px-3"
          >
            {cmdBusy ? (
              <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" aria-hidden />
            ) : (
              <Sparkles className="h-3 w-3" aria-hidden />
            )}
            <span className="hidden sm:inline">{cmdBusy ? "…" : "Executar"}</span>
          </button>
        </div>
      </form>

      <div className="flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
        {onViewModeChange ? (
          <div className="mr-1 flex items-center gap-0.5 rounded-md border border-border p-0.5">
            <button
              type="button"
              onClick={() => onViewModeChange("hub")}
              className={`rounded px-2 py-1.5 transition-colors ${
                viewMode === "hub"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
              }`}
              title="Vista em colunas (hub)"
              aria-pressed={viewMode === "hub"}
              aria-label="Vista em colunas"
            >
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("commandCenter")}
              className={`rounded px-2 py-1.5 transition-colors ${
                viewMode === "commandCenter"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
              }`}
              title="Central de agentes (estilo OpenClaw)"
              aria-pressed={viewMode === "commandCenter"}
              aria-label="Central de agentes"
            >
              <Monitor className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("taskCanvas")}
              className={`rounded px-2 py-1.5 transition-colors ${
                viewMode === "taskCanvas"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
              }`}
              title="Canvas de tarefas (Kanban modular)"
              aria-pressed={viewMode === "taskCanvas"}
              aria-label="Canvas de tarefas"
            >
              <SquareKanban className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        ) : null}
        {onOpenDoubts ? (
          <button
            type="button"
            onClick={onOpenDoubts}
            className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            title="Dúvidas e ajuda (chat local). Atalho: Ctrl+/ ou Cmd+/"
            aria-label="Abrir dúvidas e ajuda"
          >
            <MessageCircle className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : null}
        {onOpenCustomization ? (
          <button
            type="button"
            onClick={onOpenCustomization}
            className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            title="Personalização de agentes e escritório"
            aria-label="Abrir painel de personalização"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : null}
        {onOpenIntegrationsConfig ? (
          <button
            type="button"
            onClick={onOpenIntegrationsConfig}
            className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            title="Configuração de APIs e integrações"
            aria-label="Abrir configuração de integrações"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onToggleTheme}
          className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          title={theme === "dark" ? "Tema claro" : "Tema escuro"}
          aria-label={theme === "dark" ? "Activar tema claro" : "Activar tema escuro"}
        >
          {theme === "dark" ? <Sun className="h-3.5 w-3.5" aria-hidden /> : <Moon className="h-3.5 w-3.5" aria-hidden />}
        </button>
        <button
          type="button"
          onClick={() => onRefresh()}
          disabled={refreshing}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
          title="Actualizar dados"
        >
          <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden />
          <span className="hidden sm:inline">{timeLabel}</span>
        </button>
        <span className="hidden sm:inline">
          Ag.: <span className="font-medium text-accent">{loading ? "…" : agentsCount}</span>
        </span>
        <span className="hidden max-w-[7rem] truncate font-mono text-[10px] lg:inline" title={versionLine}>
          {loading ? "…" : versionLine}
        </span>
      </div>
    </header>
  );
}
