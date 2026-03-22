import { useEffect, useMemo, useRef } from "react";
import type { ActivityEntry, AgentRow } from "@/types/hub";
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
};

export function CommandCenterView({ agents, logs, onSelectAgent }: CommandCenterViewProps) {
  const agentKey = useMemo(
    () => agents.map((a) => `${a.id}:${a.title}`).join("|"),
    [agents]
  );
  const seenLogIds = useRef(new Set<string>());

  useEffect(() => {
    seenLogIds.current.clear();
    startMissionCommandCenter({
      agentRows: agents,
      onSelectAgent,
    });
    return () => stopMissionCommandCenter();
  }, [agentKey, agents, onSelectAgent]);

  useEffect(() => {
    for (const log of logs) {
      if (seenLogIds.current.has(log.id)) continue;
      seenLogIds.current.add(log.id);
      const line = `[${log.agent}] ${log.action}`;
      terminal.log(line, "info", false);
    }
  }, [logs]);

  return (
    <main
      id="conteudo-principal"
      tabIndex={-1}
      className="flex min-h-0 min-w-0 flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
    <div id="mission-cc-root" className="flex min-h-0 flex-1 flex-col" aria-label="Central de agentes">
      <div id="command-center">
        <div id="zone-mascot" className="zone">
          <div className="zone-header">
            <span className="zone-dot" aria-hidden />
            Estado do hub
          </div>
          <canvas id="mascot-canvas" width={320} height={240} />
          <div id="mascot-label">IDLE</div>
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
          <canvas id="office-canvas" width={640} height={480} />
        </div>
      </div>
    </div>
    </main>
  );
}
