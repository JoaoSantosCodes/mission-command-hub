import { useEffect, useMemo, useRef, useState } from "react";
import type { ActivityEntry, AgentRow } from "@/types/hub";
import * as officeCanvas from "@/command-center/office.js";
import * as mascotCanvas from "@/command-center/mascot.js";
import { TeamStatusOverview } from "@/components/TeamStatusOverview";
import {
  AGENT_PROFILE_CHANGED_EVENT,
  readAllAgentProfiles,
} from "@/lib/agent-profile-store";
import {
  OFFICE_THEME_CHANGED_EVENT,
  readOfficeTheme,
  writeOfficeTheme,
} from "@/lib/office-customization-store";
import {
  startMissionCommandCenter,
  stopMissionCommandCenter,
  terminal,
} from "@/command-center/mission-boot.js";
import "@/command-center/command-center.css";

type CommandCenterViewProps = {
  agents: AgentRow[];
  logs: ActivityEntry[];
  onSelectAgent: (id: string) => void;
  /** Agente com modal aberto ou foco explícito — realce + balão com última linha do feed. */
  highlightedAgentId?: string | null;
  customizationSyncLabel?: string;
  onSyncCustomization?: () => void;
  fishFood?: { food: number; maxFood: number; mood: "feliz" | "normal" | "fome" | "critico" } | null;
  onFeedFish?: () => Promise<void> | void;
};

export function CommandCenterView({
  agents,
  logs,
  onSelectAgent,
  highlightedAgentId = null,
  customizationSyncLabel = "local",
  onSyncCustomization,
  fishFood = null,
  onFeedFish,
}: CommandCenterViewProps) {
  const [officeTheme, setOfficeTheme] = useState<"default" | "neon">(
    typeof window !== "undefined" ? readOfficeTheme() : "default"
  );
  const agentKey = useMemo(
    () => agents.map((a) => `${a.id}:${a.title}`).join("|"),
    [agents]
  );
  const seenLogIds = useRef(new Set<string>());
  const layoutFileRef = useRef<HTMLInputElement>(null);
  const [feedBusy, setFeedBusy] = useState(false);
  const [feedCooldownUntil, setFeedCooldownUntil] = useState(0);

  useEffect(() => {
    seenLogIds.current.clear();
    startMissionCommandCenter({
      agentRows: agents,
      onSelectAgent,
    });
    return () => stopMissionCommandCenter();
  }, [agentKey, agents, onSelectAgent]);

  useEffect(() => {
    officeCanvas.syncAgentsFromLogs(logs, agents);
  }, [logs, agentKey, agents]);

  useEffect(() => {
    const applyAccents = () => {
      const all = readAllAgentProfiles();
      const overrides: Record<string, string> = {};
      for (const [id, p] of Object.entries(all)) {
        if (p?.accentColor) overrides[id] = p.accentColor;
      }
      officeCanvas.setAgentAccentOverrides(overrides);
    };
    applyAccents();
    window.addEventListener(AGENT_PROFILE_CHANGED_EVENT, applyAccents as EventListener);
    window.addEventListener("storage", applyAccents);
    return () => {
      window.removeEventListener(AGENT_PROFILE_CHANGED_EVENT, applyAccents as EventListener);
      window.removeEventListener("storage", applyAccents);
    };
  }, [agentKey]);

  useEffect(() => {
    officeCanvas.setAgentHighlight(highlightedAgentId, !!highlightedAgentId);
    officeCanvas.setAgentSelectionCaption(
      highlightedAgentId,
      highlightedAgentId
        ? officeCanvas.formatLatestFeedLineForAgent(highlightedAgentId, logs, agents)
        : ""
    );
  }, [highlightedAgentId, logs, agents]);

  useEffect(() => {
    for (const log of logs) {
      if (seenLogIds.current.has(log.id)) continue;
      seenLogIds.current.add(log.id);
      const line = `[${log.agent}] ${log.action}`;
      terminal.log(line, "info", false);
    }
  }, [logs]);

  useEffect(() => {
    const onThemeChanged = () => setOfficeTheme(readOfficeTheme());
    window.addEventListener(OFFICE_THEME_CHANGED_EVENT, onThemeChanged as EventListener);
    window.addEventListener("storage", onThemeChanged);
    return () => {
      window.removeEventListener(OFFICE_THEME_CHANGED_EVENT, onThemeChanged as EventListener);
      window.removeEventListener("storage", onThemeChanged);
    };
  }, []);

  useEffect(() => {
    if (!fishFood) return;
    officeCanvas.setFishFoodState(fishFood);
    const moodToEmotion =
      fishFood.mood === "feliz"
        ? "happy"
        : fishFood.mood === "normal"
          ? "idle"
          : fishFood.mood === "fome"
            ? "thinking"
            : "error";
    mascotCanvas.setEmotion(moodToEmotion);
  }, [fishFood]);

  const onExportLayout = () => {
    const json = officeCanvas.getOfficeLayoutExportJSON();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "office-layout.json";
    a.click();
    URL.revokeObjectURL(url);
    terminal.log("[layout] Exportação descarregada (office-layout.json).", "info", true);
  };

  const onPickImportLayout = () => layoutFileRef.current?.click();

  const onLayoutFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      if (officeCanvas.importOfficeLayoutFromJSON(text)) {
        terminal.log("[layout] Importação aplicada.", "info", true);
      } else {
        terminal.log("[layout] JSON inválido (esperado positions e/ou furniture).", "error", true);
      }
    };
    reader.readAsText(f);
  };

  const onResetLayout = () => {
    officeCanvas.resetOfficeLayoutToDefaults();
    terminal.log("[layout] Posições repostas ao desenho inicial.", "info", true);
  };

  const onOfficeThemeChange = (v: "default" | "neon") => {
    writeOfficeTheme(v);
    setOfficeTheme(v);
  };

  const fishPct = fishFood ? Math.max(0, Math.min(100, Math.round((fishFood.food / Math.max(1, fishFood.maxFood)) * 100))) : 0;
  const canFeed = Date.now() >= feedCooldownUntil && !feedBusy;
  const moodPt = fishPct > 70 ? "feliz" : fishPct > 40 ? "com fome" : "faminto";

  return (
    <main
      id="conteudo-principal"
      tabIndex={-1}
      className="flex min-h-0 min-w-0 flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
    <div
      id="mission-cc-root"
      data-office-theme={officeTheme}
      className="flex min-h-0 flex-1 flex-col"
      aria-label="Central de agentes"
    >
      <div id="command-center">
        <div id="zone-mascot" className="zone">
          <div className="zone-header">
            <span className="zone-dot" aria-hidden />
            Estado do hub
          </div>
          <canvas id="mascot-canvas" width={320} height={240} />
          <div id="mascot-label">IDLE</div>
          <div className="mascot-fish-hud" aria-live="polite">
            <div className="mascot-fish-row">
              <span className="mascot-fish-title">Ração</span>
              <span className="mascot-fish-value">
                {fishFood ? `${fishFood.food}/${fishFood.maxFood}` : "—"} · {moodPt}
              </span>
            </div>
            <div className="mascot-fish-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={fishPct}>
              <div className="mascot-fish-bar-fill" style={{ width: `${fishPct}%` }} />
            </div>
            <button
              type="button"
              className="office-toolbar-btn mascot-feed-btn"
              disabled={!canFeed || !onFeedFish}
              onClick={async () => {
                if (!onFeedFish || !canFeed) return;
                setFeedBusy(true);
                try {
                  await onFeedFish();
                  setFeedCooldownUntil(Date.now() + 12_000);
                } finally {
                  setFeedBusy(false);
                }
              }}
              title="Alimenta o peixe e recupera ração"
            >
              {feedBusy ? "A alimentar..." : canFeed ? "Alimentar peixe" : "Aguarde..."}
            </button>
          </div>
        </div>

        <div id="zone-terminal" className="zone">
          <div className="zone-header">
            <span className="zone-dot" aria-hidden />
            Registo de actividade
          </div>
          <div id="terminal-output" />
        </div>

        <div id="zone-office" className="zone">
          <div className="zone-header">
            <span className="zone-dot" aria-hidden />
            Escritório Architecture Agents Hub · agentes no disco
          </div>
          <div className="office-toolbar" role="toolbar" aria-label="Layout do escritório">
            <input
              ref={layoutFileRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-hidden
              tabIndex={-1}
              onChange={onLayoutFileChange}
            />
            <button type="button" className="office-toolbar-btn" onClick={onExportLayout}>
              Exportar layout
            </button>
            <button type="button" className="office-toolbar-btn" onClick={onPickImportLayout}>
              Importar layout
            </button>
            <button type="button" className="office-toolbar-btn" onClick={onResetLayout}>
              Repor posições
            </button>
            <button
              type="button"
              className="office-toolbar-btn"
              onClick={() => onSyncCustomization?.()}
              disabled={!onSyncCustomization}
              title="Sincronizar personalização com servidor"
            >
              Sync perfil
            </button>
            <span className="office-toolbar-sync" title="Estado de sincronização da personalização">
              {customizationSyncLabel}
            </span>
            <label className="office-toolbar-theme">
              Tema
              <select
                value={officeTheme}
                onChange={(e) => onOfficeThemeChange(e.target.value === "neon" ? "neon" : "default")}
              >
                <option value="default">Padrão</option>
                <option value="neon">Neon</option>
              </select>
            </label>
          </div>
          <div className="office-main">
            <div className="office-canvas-wrap">
              <canvas id="office-canvas" width={640} height={480} />
              <div className="office-corner-hint" role="note" aria-label="Dicas de layout no canvas">
                <span className="office-corner-hint-line">Alt + arrastar → mover agente</span>
                <span className="office-corner-hint-line">Shift + Alt + arrastar → mobiliário (inclui aquário)</span>
                <span className="office-corner-hint-line">Ctrl + Shift + Alt + arrastar → tamanho do aquário</span>
                <span className="office-corner-hint-line">Sync perfil → botão no topo (estado: {customizationSyncLabel})</span>
                <span className="office-corner-hint-line">Cor de destaque do agente aparece no escritório</span>
                <span className="office-corner-hint-line">Comandos e tarefas consomem ração no aquário</span>
              </div>
            </div>
            <aside className="office-status-wrap" aria-label="Estado da equipa no escritório">
              <TeamStatusOverview
                agents={agents}
                logs={logs}
                loading={false}
                compact
                onSelectAgent={(a) => onSelectAgent(a.id)}
              />
            </aside>
          </div>
        </div>
      </div>
    </div>
    </main>
  );
}
