import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { useDocumentVisible } from "@/hooks/useDocumentVisible";
import { useTheme } from "@/hooks/useTheme";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { fetchJson, postCommand } from "@/lib/api";
import { POLL_INTERVAL_MS } from "@/constants";
import type { ActivityEntry, AgentRow, AioxInfo } from "@/types/hub";
import { SkipLink } from "@/components/SkipLink";
import { CommandCenterView } from "@/components/CommandCenterView";
import { HubHeader, type HubViewMode } from "@/components/HubHeader";
import { AgentsSidebar } from "@/components/AgentsSidebar";
import { MainWorkspace } from "@/components/MainWorkspace";
import { ActivityPanel } from "@/components/ActivityPanel";
import { MobileSummary } from "@/components/MobileSummary";
import { AgentDetailModal } from "@/components/AgentDetailModal";

export default function App() {
  const docVisible = useDocumentVisible();
  const { theme, toggle: toggleTheme } = useTheme();
  const [info, setInfo] = useState<AioxInfo | null>(null);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [logs, setLogs] = useState<ActivityEntry[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const [cmd, setCmd] = useState("");
  const [cmdFocus, setCmdFocus] = useState(false);
  const [cmdBusy, setCmdBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [collapsed, setCollapsed] = useState(false);
  const [detailAgentId, setDetailAgentId] = useState<string | null>(null);
  const [agentsDrawerOpen, setAgentsDrawerOpen] = useState(false);
  const [activityDrawerOpen, setActivityDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<HubViewMode>("hub");

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    try {
      if (!silent) setRefreshing(true);
      const [i, a, act] = await Promise.all([
        fetchJson<AioxInfo>("/api/aiox/info"),
        fetchJson<{ agents: AgentRow[] }>("/api/aiox/agents"),
        fetchJson<{ logs: ActivityEntry[] }>("/api/aiox/activity"),
      ]);
      setInfo(i);
      setAgents(a.agents);
      setLogs(act.logs);
      setLastSynced(new Date());
      setErr(null);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
      if (!silent) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!docVisible) return;
    const t = window.setInterval(() => void refresh({ silent: true }), POLL_INTERVAL_MS);
    return () => window.clearInterval(t);
  }, [docVisible, refresh]);

  useEffect(() => {
    if (!toast) return;
    const ms = toast.length > 120 ? 8000 : 4500;
    const id = window.setTimeout(() => setToast(null), ms);
    return () => window.clearTimeout(id);
  }, [toast]);

  useLockBodyScroll(Boolean(detailAgentId) || agentsDrawerOpen || activityDrawerOpen);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (detailAgentId) {
        setDetailAgentId(null);
        return;
      }
      if (agentsDrawerOpen) {
        setAgentsDrawerOpen(false);
        return;
      }
      if (activityDrawerOpen) {
        setActivityDrawerOpen(false);
        return;
      }
      if (err) setErr(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [err, detailAgentId, agentsDrawerOpen, activityDrawerOpen]);

  const onSelectAgentFromCommandCenter = useCallback((id: string) => {
    setDetailAgentId(id);
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = cmd.trim();
    if (!t || cmdBusy) return;
    setCmdBusy(true);
    setErr(null);
    try {
      const data = await postCommand(t);
      setCmd("");
      if (data.message) setToast(data.message);
      await refresh();
    } catch (e) {
      setErr(String(e));
    } finally {
      setCmdBusy(false);
    }
  };

  const timeLabel =
    lastSynced != null
      ? lastSynced.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      : "—";

  const versionLine = loading ? "…" : (info?.version ?? info?.versionError ?? "—");

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <SkipLink />
      <HubHeader
        cmd={cmd}
        setCmd={setCmd}
        cmdFocus={cmdFocus}
        setCmdFocus={setCmdFocus}
        cmdBusy={cmdBusy}
        onSubmit={onSubmit}
        onRefresh={() => void refresh()}
        refreshing={refreshing}
        timeLabel={timeLabel}
        loading={loading}
        agentsCount={agents.length}
        versionLine={versionLine}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenAgentsDrawer={() => setAgentsDrawerOpen(true)}
        onOpenActivityDrawer={() => setActivityDrawerOpen(true)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {err ? (
        <div
          role="alert"
          aria-live="assertive"
          className="flex shrink-0 items-start justify-between gap-3 border-b border-destructive/40 bg-destructive/10 px-4 py-2.5 text-xs text-destructive"
        >
          <span className="min-w-0 flex-1 leading-relaxed">{err}</span>
          <button
            type="button"
            onClick={() => setErr(null)}
            className="shrink-0 rounded-md p-1 text-destructive transition-colors hover:bg-destructive/15"
            aria-label="Fechar aviso"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      ) : null}

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="flex shrink-0 items-start justify-between gap-3 border-b border-accent/30 bg-accent/10 px-4 py-2.5 text-xs text-foreground"
        >
          <span className="min-w-0 flex-1 leading-relaxed">{toast}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="shrink-0 rounded-md p-1 text-foreground/80 transition-colors hover:bg-accent/20"
            aria-label="Fechar mensagem"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {viewMode === "hub" ? (
          <>
            <AgentsSidebar
              info={info}
              agents={agents}
              loading={loading}
              onSelectAgent={(a) => setDetailAgentId(a.id)}
              mobileOpen={agentsDrawerOpen}
              onMobileClose={() => setAgentsDrawerOpen(false)}
            />
            <MainWorkspace
              info={info}
              agentsCount={agents.length}
              timeLabel={timeLabel}
              onRefresh={() => void refresh()}
            />
            <ActivityPanel
              logs={logs}
              collapsed={collapsed}
              onCollapsedChange={setCollapsed}
              mobileOpen={activityDrawerOpen}
              onMobileClose={() => setActivityDrawerOpen(false)}
            />
          </>
        ) : (
          <CommandCenterView
            agents={agents}
            logs={logs}
            onSelectAgent={onSelectAgentFromCommandCenter}
          />
        )}
      </div>

      {viewMode === "hub" ? (
        <MobileSummary
          agentsCount={agents.length}
          timeLabel={timeLabel}
          onOpenAgents={() => setAgentsDrawerOpen(true)}
          onOpenActivity={() => setActivityDrawerOpen(true)}
        />
      ) : null}

      <AgentDetailModal
        agentId={detailAgentId}
        onClose={() => setDetailAgentId(null)}
        canEdit={info?.agentEditAllowed !== false}
        onSaved={() => void refresh({ silent: true })}
      />
    </div>
  );
}
