import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';

import { useDocumentVisible } from '@/hooks/useDocumentVisible';
import { useTheme } from '@/hooks/useTheme';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { useActivityStream } from '@/hooks/useActivityStream';
import {
  consumeFishFood,
  fetchJson,
  feedFish,
  getIntegrationsStatus,
  getFishState,
  getIntegrationsConfig,
  getCustomization,
  postCommand,
  putIntegrationsConfig,
  putCustomization,
} from '@/lib/api';
import {
  AGENT_PROFILE_CHANGED_EVENT,
  readAllAgentProfiles,
  replaceAllAgentProfiles,
} from '@/lib/agent-profile-store';
import {
  OFFICE_THEME_CHANGED_EVENT,
  readOfficeTheme,
  writeOfficeTheme,
} from '@/lib/office-customization-store';
import { formatUserFacingError } from '@/lib/format-error';
import { POLL_INTERVAL_MS, SSE_FALLBACK_POLL_MS } from '@/constants';
import type { ActivityEntry, AgentRow, AioxInfo, AioxOverviewResponse } from '@/types/hub';
import { SkipLink } from '@/components/layout/SkipLink';
import { HubHeader, type HubViewMode } from '@/components/workspace/HubHeader';
import { AgentsSidebar } from '@/components/agents/AgentsSidebar';
import { MainWorkspace } from '@/components/workspace/MainWorkspace';
import { ActivityPanel } from '@/components/collaboration/ActivityPanel';
import { MobileSummary } from '@/components/layout/MobileSummary';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

// Lazy-loaded: vistas e painéis não visíveis no arranque
const CommandCenterView = lazy(() =>
  import('@/components/workspace/CommandCenterView').then((m) => ({ default: m.CommandCenterView }))
);
const TaskCanvasView = lazy(() =>
  import('@/components/task-canvas').then((m) => ({ default: m.TaskCanvasView }))
);
const AgentDetailModal = lazy(() =>
  import('@/components/agents/AgentDetailModal').then((m) => ({ default: m.AgentDetailModal }))
);
const CreateAgentModal = lazy(() =>
  import('@/components/agents/CreateAgentModal').then((m) => ({ default: m.CreateAgentModal }))
);
const DoubtsChatPanel = lazy(() =>
  import('@/components/collaboration/DoubtsChatPanel').then((m) => ({ default: m.DoubtsChatPanel }))
);
const CustomizationPanel = lazy(() =>
  import('@/components/workspace/CustomizationPanel').then((m) => ({ default: m.CustomizationPanel }))
);
const IntegrationsConfigPanel = lazy(() =>
  import('@/components/IntegrationsConfigPanel').then((m) => ({
    default: m.IntegrationsConfigPanel,
  }))
);
const SquadView = lazy(() =>
  import('@/components/collaboration/SquadView').then((m) => ({ default: m.SquadView }))
);
const WhiteboardView = lazy(() =>
  import('@/components/whiteboard/WhiteboardView').then((m) => ({ default: m.WhiteboardView }))
);
const OnboardingModal = lazy(() =>
  import('@/components/layout/OnboardingModal').then((m) => ({ default: m.OnboardingModal }))
);

const GLOBAL_HELP_VISIBLE_STORAGE_KEY = 'mission-agent-global-help-visible';
const ONBOARDING_DONE_KEY = 'mission-onboarding-done';

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

  const [cmd, setCmd] = useState('');
  const [cmdFocus, setCmdFocus] = useState(false);
  const [cmdBusy, setCmdBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [collapsed, setCollapsed] = useState(false);
  const [detailAgentId, setDetailAgentId] = useState<string | null>(null);
  const [createAgentOpen, setCreateAgentOpen] = useState(false);
  const [doubtsOpen, setDoubtsOpen] = useState(false);
  const [customizationOpen, setCustomizationOpen] = useState(false);
  const [integrationsConfigOpen, setIntegrationsConfigOpen] = useState(false);
  const [integrationsConfigSaving, setIntegrationsConfigSaving] = useState(false);
  const [integrationsConfigRev, setIntegrationsConfigRev] = useState('0:0');
  const [integrationsConfigDraft, setIntegrationsConfigDraft] = useState<
    import('@/lib/api').IntegrationsConfigPayload
  >({});
  const [integrationsConfigRedacted, setIntegrationsConfigRedacted] = useState<
    Record<string, string>
  >({});
  const [agentsDrawerOpen, setAgentsDrawerOpen] = useState(false);
  const [activityDrawerOpen, setActivityDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<HubViewMode>('hub');
  /** `null` até ao primeiro refresh; depois indica se a API Express respondeu. */
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [customRev, setCustomRev] = useState('0:0');
  const [customHydrated, setCustomHydrated] = useState(false);
  const [customSyncState, setCustomSyncState] = useState<
    'local' | 'syncing' | 'synced' | 'conflict' | 'error'
  >('local');
  const [fishFood, setFishFood] = useState<{
    food: number;
    maxFood: number;
    mood: 'feliz' | 'normal' | 'fome' | 'critico';
  } | null>(null);
  const [integrations, setIntegrations] = useState<import('@/lib/api').IntegrationsStatus | null>(
    null
  );
  const [globalHelpVisible, setGlobalHelpVisible] = useState<boolean>(() => {
    try {
      return localStorage.getItem(GLOBAL_HELP_VISIBLE_STORAGE_KEY) !== '0';
    } catch {
      return true;
    }
  });
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  const ACTIVITY_MAX = 200;
  const { connected: sseConnected } = useActivityStream({
    enabled: docVisible,
    onActivity: (entry) =>
      setLogs((prev) => {
        if (prev.length > 0 && prev[0].id === entry.id) return prev;
        return [entry, ...prev].slice(0, ACTIVITY_MAX);
      }),
    onAgents: (newAgents) => setAgents(newAgents),
    onSnapshot: ({ agents: newAgents, logs: newLogs }) => {
      setAgents(newAgents);
      setLogs(newLogs);
      setApiOnline(true);
      setLoading(false);
    },
  });

  const refreshIntegrations = useCallback(async () => {
    try {
      const s = await getIntegrationsStatus({ validate: true });
      setIntegrations(s);
    } catch {
      // Sem integração disponível; mantemos o estado anterior.
    }
  }, []);

  const refreshIntegrationsConfig = useCallback(async () => {
    const c = await getIntegrationsConfig();
    setIntegrationsConfigDraft(c.data);
    setIntegrationsConfigRedacted(c.redacted);
    setIntegrationsConfigRev(c.revision);
  }, []);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    try {
      if (!silent) setRefreshing(true);
      const o = await fetchJson<AioxOverviewResponse>('/api/aiox/overview');
      setInfo(o.bridge);
      setAgents(o.agents);
      setLogs(o.logs);
      setLastSynced(new Date());
      setErr(null);
      setApiOnline(true);
    } catch (e) {
      setErr(String(e));
      setApiOnline(false);
    } finally {
      setLoading(false);
      if (!silent) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refreshIntegrations();
  }, [refreshIntegrations]);

  useEffect(() => {
    try {
      localStorage.setItem(GLOBAL_HELP_VISIBLE_STORAGE_KEY, globalHelpVisible ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [globalHelpVisible]);

  useEffect(() => {
    try {
      if (!localStorage.getItem(ONBOARDING_DONE_KEY)) setOnboardingOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refreshIntegrationsConfig();
  }, [refreshIntegrationsConfig]);

  useEffect(() => {
    if (!docVisible) return;
    const id = window.setInterval(() => void refreshIntegrations(), 30_000);
    return () => window.clearInterval(id);
  }, [docVisible, refreshIntegrations]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const refreshFish = useCallback(async () => {
    try {
      const next = await getFishState();
      setFishFood({ food: next.food, maxFood: next.maxFood, mood: next.mood });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refreshFish();
  }, [refreshFish]);

  useEffect(() => {
    if (!docVisible) return;
    const id = window.setInterval(() => void refreshFish(), Math.max(12_000, POLL_INTERVAL_MS));
    return () => window.clearInterval(id);
  }, [docVisible, refreshFish]);

  const hydrateCustomizationFromServer = useCallback(async () => {
    const r = await getCustomization();
    replaceAllAgentProfiles(r.data.agents || {});
    if (r.data.office?.theme === 'neon' || r.data.office?.theme === 'default') {
      writeOfficeTheme(r.data.office.theme, { emit: false });
    }
    // Restore office layout from server to localStorage (office.js reads on next init).
    if (r.data.office?.layout && typeof r.data.office.layout === 'object') {
      try {
        localStorage.setItem(
          'mission-agent-office-layout-v5',
          JSON.stringify(r.data.office.layout)
        );
      } catch {
        /* ignore */
      }
    }
    setCustomRev(r.revision || '0:0');
    return r;
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        await hydrateCustomizationFromServer();
        if (alive) setCustomSyncState('synced');
      } catch {
        if (alive) setCustomSyncState('local');
      } finally {
        if (alive) setCustomHydrated(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [hydrateCustomizationFromServer]);

  const syncCustomizationNow = useCallback(async () => {
    setCustomSyncState('syncing');
    // Include the office layout from localStorage (written by office.js).
    let officeLayout: unknown = null;
    try {
      const raw = localStorage.getItem('mission-agent-office-layout-v5');
      if (raw) officeLayout = JSON.parse(raw);
    } catch {
      /* ignore */
    }
    const payload = {
      agents: readAllAgentProfiles(),
      office: { theme: readOfficeTheme(), ...(officeLayout ? { layout: officeLayout } : {}) },
    };
    try {
      const r = await putCustomization(payload, customRev || '0:0');
      setCustomRev(r.revision || customRev);
      setCustomSyncState('synced');
    } catch (e) {
      if (String(e).includes('CONFLICT_CUSTOMIZATION')) {
        setCustomSyncState('conflict');
        try {
          await hydrateCustomizationFromServer();
          setCustomSyncState('synced');
        } catch {
          setCustomSyncState('error');
        }
        return;
      }
      setCustomSyncState('error');
    }
  }, [customRev, hydrateCustomizationFromServer]);

  useEffect(() => {
    if (!customHydrated) return;
    let timer: number | null = null;
    const flush = () => {
      if (timer != null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void syncCustomizationNow();
      }, 550);
    };
    window.addEventListener(AGENT_PROFILE_CHANGED_EVENT, flush as EventListener);
    window.addEventListener(OFFICE_THEME_CHANGED_EVENT, flush as EventListener);
    return () => {
      window.removeEventListener(AGENT_PROFILE_CHANGED_EVENT, flush as EventListener);
      window.removeEventListener(OFFICE_THEME_CHANGED_EVENT, flush as EventListener);
      if (timer != null) window.clearTimeout(timer);
    };
  }, [customHydrated, syncCustomizationNow]);

  useEffect(() => {
    if (!docVisible) return;
    // Quando SSE está ativo usa intervalo longo (60s) como segurança; sem SSE usa intervalo normal
    const interval = sseConnected ? SSE_FALLBACK_POLL_MS : POLL_INTERVAL_MS;
    const t = window.setInterval(() => void refresh({ silent: true }), interval);
    return () => window.clearInterval(t);
  }, [docVisible, refresh, sseConnected]);

  useEffect(() => {
    /** Evita rajadas de GET /overview quando há várias acções seguidas no canvas (cada uma gerava um refresh). */
    const debounceMs = 380;
    let debounceTimer: number | null = null;
    const onTeamActivity = () => {
      if (debounceTimer != null) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        debounceTimer = null;
        void refresh({ silent: true });
      }, debounceMs);
    };
    window.addEventListener('mission-team-activity', onTeamActivity as EventListener);
    return () => {
      if (debounceTimer != null) window.clearTimeout(debounceTimer);
      window.removeEventListener('mission-team-activity', onTeamActivity as EventListener);
    };
  }, [refresh]);

  useEffect(() => {
    const onTaskTokenSpent = (evt: Event) => {
      const d = (evt as CustomEvent<{ amount?: number; to?: string }>).detail;
      const amount = Number(d?.amount ?? 0);
      if (!Number.isFinite(amount) || amount <= 0) return;
      void consumeFishFood(amount, `task:${String(d?.to ?? 'move')}`)
        .then((next) => setFishFood({ food: next.food, maxFood: next.maxFood, mood: next.mood }))
        .catch(() => void 0);
    };
    window.addEventListener('mission-task-token-spent', onTaskTokenSpent as EventListener);
    return () =>
      window.removeEventListener('mission-task-token-spent', onTaskTokenSpent as EventListener);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const ms = toast.length > 120 ? 8000 : 4500;
    const id = window.setTimeout(() => setToast(null), ms);
    return () => window.clearTimeout(id);
  }, [toast]);

  useLockBodyScroll(
    Boolean(detailAgentId) ||
      agentsDrawerOpen ||
      activityDrawerOpen ||
      createAgentOpen ||
      doubtsOpen ||
      customizationOpen ||
      integrationsConfigOpen ||
      onboardingOpen
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (doubtsOpen) {
        setDoubtsOpen(false);
        return;
      }
      if (customizationOpen) {
        setCustomizationOpen(false);
        return;
      }
      if (createAgentOpen) {
        setCreateAgentOpen(false);
        return;
      }
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
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    err,
    detailAgentId,
    agentsDrawerOpen,
    activityDrawerOpen,
    createAgentOpen,
    doubtsOpen,
    customizationOpen,
    integrationsConfigOpen,
  ]);

  /** Toggle painel Dúvidas: Ctrl+/ ou Cmd+/ (não dispara dentro de inputs). */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || (!e.ctrlKey && !e.metaKey)) return;
      const el = e.target as HTMLElement | null;
      if (el) {
        const tag = el.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable)
          return;
      }
      e.preventDefault();
      setDoubtsOpen((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /** Atalhos de navegação: Alt+1/2/3/4 mudam de vista; Ctrl+K foca o campo de comando. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el) {
        const tag = el.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable)
          return;
      }
      if (e.altKey) {
        if (e.key === '1') {
          e.preventDefault();
          setViewMode('hub');
          return;
        }
        if (e.key === '2') {
          e.preventDefault();
          setViewMode('commandCenter');
          return;
        }
        if (e.key === '3') {
          e.preventDefault();
          setViewMode('taskCanvas');
          return;
        }
        if (e.key === '4') {
          e.preventDefault();
          setViewMode('squad');
          return;
        }
        if (e.key === '5') {
          e.preventDefault();
          setViewMode('whiteboard');
          return;
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('[aria-label="Texto do comando"]')?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onSelectAgentFromCommandCenter = useCallback((id: string) => {
    setDetailAgentId(id);
  }, []);

  const handleRetryConnection = useCallback(() => {
    void refresh();
  }, [refresh]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = cmd.trim();
    if (!t || cmdBusy) return;
    setCmdBusy(true);
    setErr(null);
    try {
      const data = await postCommand(t);
      try {
        const fish = await consumeFishFood(3, 'command');
        setFishFood({ food: fish.food, maxFood: fish.maxFood, mood: fish.mood });
      } catch {
        /* ignore fish failures */
      }
      setCmd('');
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
      ? lastSynced.toLocaleTimeString('pt-PT', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : '—';

  const versionLine = loading ? '…' : (info?.version ?? info?.versionError ?? '—');
  const customSyncLabelPt =
    customSyncState === 'syncing'
      ? 'sincronizando'
      : customSyncState === 'synced'
        ? 'sincronizado'
        : customSyncState === 'conflict'
          ? 'conflito'
          : customSyncState === 'error'
            ? 'erro'
            : 'local';

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
        apiOnline={apiOnline}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenAgentsDrawer={() => setAgentsDrawerOpen(true)}
        onOpenActivityDrawer={() => setActivityDrawerOpen(true)}
        onOpenDoubts={() => setDoubtsOpen(true)}
        onOpenCustomization={() => setCustomizationOpen(true)}
        onOpenIntegrationsConfig={() => setIntegrationsConfigOpen(true)}
        helpVisible={globalHelpVisible}
        onToggleHelpVisible={() => setGlobalHelpVisible((v) => !v)}
        customizationSyncLabel={customSyncLabelPt}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {err ? (
        <div
          role="alert"
          aria-live="assertive"
          className="flex shrink-0 items-start justify-between gap-3 border-b border-destructive/40 bg-destructive/10 px-4 py-2.5 text-xs text-destructive"
        >
          <span className="min-w-0 flex-1 leading-relaxed">{formatUserFacingError(err)}</span>
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
        {viewMode === 'hub' ? (
          <>
            <AgentsSidebar
              agents={agents}
              logs={logs}
              loading={loading}
              onSelectAgent={(a) => {
                if (a.id === 'starter') {
                  setOnboardingOpen(true);
                  return;
                }
                setDetailAgentId(a.id);
              }}
              mobileOpen={agentsDrawerOpen}
              onMobileClose={() => setAgentsDrawerOpen(false)}
              canCreate={info?.agentEditAllowed !== false}
              onCreateAgent={() => setCreateAgentOpen(true)}
              integrations={integrations}
            />
            <MainWorkspace
              info={info}
              agentsCount={agents.length}
              timeLabel={timeLabel}
              onRefresh={() => void refresh()}
              helpVisible={globalHelpVisible}
              onHelpVisibleChange={setGlobalHelpVisible}
            />
            <ActivityPanel
              logs={logs}
              collapsed={collapsed}
              onCollapsedChange={setCollapsed}
              mobileOpen={activityDrawerOpen}
              onMobileClose={() => setActivityDrawerOpen(false)}
            />
          </>
        ) : viewMode === 'commandCenter' ? (
          <ErrorBoundary>
            <Suspense fallback={null}>
              <CommandCenterView
                agents={agents}
                logs={logs}
                onSelectAgent={onSelectAgentFromCommandCenter}
                highlightedAgentId={detailAgentId}
                customizationSyncLabel={customSyncLabelPt}
                onSyncCustomization={() => void syncCustomizationNow()}
                fishFood={fishFood}
                onFeedFish={async () => {
                  const next = await feedFish(12);
                  setFishFood({ food: next.food, maxFood: next.maxFood, mood: next.mood });
                }}
                onViewModeChange={setViewMode}
              />
            </Suspense>
          </ErrorBoundary>
        ) : viewMode === 'taskCanvas' ? (
          <ErrorBoundary>
            <Suspense fallback={null}>
              <TaskCanvasView
                agents={agents}
                helpVisible={globalHelpVisible}
                onHelpVisibleChange={setGlobalHelpVisible}
              />
            </Suspense>
          </ErrorBoundary>
        ) : viewMode === 'squad' ? (
          <ErrorBoundary>
            <Suspense fallback={null}>
              <SquadView agents={agents} logs={logs} />
            </Suspense>
          </ErrorBoundary>
        ) : (
          <ErrorBoundary>
            <Suspense fallback={null}>
              <WhiteboardView />
            </Suspense>
          </ErrorBoundary>
        )}
      </div>

      {viewMode === 'hub' ? (
        <MobileSummary
          agentsCount={agents.length}
          timeLabel={timeLabel}
          onOpenAgents={() => setAgentsDrawerOpen(true)}
          onOpenActivity={() => setActivityDrawerOpen(true)}
        />
      ) : null}

      <ErrorBoundary fallback={null}>
        <Suspense fallback={null}>
          <AgentDetailModal
            agentId={detailAgentId}
            onClose={() => setDetailAgentId(null)}
            canEdit={info?.agentEditAllowed !== false}
            onSaved={() => void refresh({ silent: true })}
            onDeleted={() => void refresh({ silent: true })}
            apiOnline={apiOnline}
            onRetryConnection={handleRetryConnection}
          />

          <CreateAgentModal
            open={createAgentOpen}
            onClose={() => setCreateAgentOpen(false)}
            onCreated={(id) => {
              void refresh({ silent: true });
              setDetailAgentId(id);
            }}
          />

          <DoubtsChatPanel
            open={doubtsOpen}
            onClose={() => setDoubtsOpen(false)}
            helpVisible={globalHelpVisible}
            onHelpVisibleChange={setGlobalHelpVisible}
          />

          <CustomizationPanel
            open={customizationOpen}
            onClose={() => setCustomizationOpen(false)}
            agents={agents}
            syncStateLabel={customSyncLabelPt}
            onSyncNow={() => void syncCustomizationNow()}
          />

          <OnboardingModal open={onboardingOpen} onClose={() => setOnboardingOpen(false)} />

          <IntegrationsConfigPanel
            open={integrationsConfigOpen}
            onClose={() => setIntegrationsConfigOpen(false)}
            draft={integrationsConfigDraft}
            redacted={integrationsConfigRedacted}
            status={integrations}
            saving={integrationsConfigSaving}
            onChange={(patch) => setIntegrationsConfigDraft((d) => ({ ...d, ...patch }))}
            onReload={() => void refreshIntegrationsConfig()}
            onValidateNow={() => void refreshIntegrations()}
            helpVisible={globalHelpVisible}
            onHelpVisibleChange={setGlobalHelpVisible}
            onSave={() => {
              void (async () => {
                setIntegrationsConfigSaving(true);
                setErr(null);
                try {
                  const r = await putIntegrationsConfig(
                    integrationsConfigDraft,
                    integrationsConfigRev || '0:0'
                  );
                  setIntegrationsConfigRev(r.revision);
                  setIntegrationsConfigRedacted(r.redacted);
                  setToast('Configurações guardadas. A validar integrações…');
                  await refreshIntegrations();
                } catch (e) {
                  const msg = String(e);
                  if (msg.includes('CONFLICT_INTEGRATIONS_CONFIG')) {
                    setErr(
                      'Conflito na configuração de integrações. Recarreguei os valores do servidor.'
                    );
                    await refreshIntegrationsConfig();
                  } else {
                    setErr(msg);
                  }
                } finally {
                  setIntegrationsConfigSaving(false);
                }
              })();
            }}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
