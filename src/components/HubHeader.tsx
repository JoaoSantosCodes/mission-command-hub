import type { FormEvent } from "react";
import {
  Bot,
  LayoutGrid,
  Loader2,
  Monitor,
  Moon,
  PanelLeft,
  PanelRight,
  RefreshCw,
  Sparkles,
  Sun,
  Terminal,
} from "lucide-react";
import { MAX_COMMAND_CHARS } from "@/constants";
import type { ThemeMode } from "@/hooks/useTheme";

export type HubViewMode = "hub" | "commandCenter";

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
  theme: ThemeMode;
  onToggleTheme: () => void;
  onOpenAgentsDrawer: () => void;
  onOpenActivityDrawer: () => void;
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
  theme,
  onToggleTheme,
  onOpenAgentsDrawer,
  onOpenActivityDrawer,
  viewMode = "hub",
  onViewModeChange,
}: HubHeaderProps) {
  return (
    <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-card/80 px-3 py-2.5 sm:gap-4 sm:px-4">
      <div className="flex shrink-0 items-center gap-2" title="Architecture Agents Hub">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/20">
          <Bot className="h-4 w-4 text-primary" aria-hidden />
        </div>
        <span className="max-w-[11rem] truncate text-xs font-semibold tracking-tight text-foreground sm:max-w-none sm:text-sm">
          Architecture Agents Hub
        </span>
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
          </div>
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
