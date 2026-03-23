import type { ActivityEntry, AgentRow } from "@/types/hub";

/** Alinhado com `FEED_LOG_WINDOW` em office.js — feed sem ISO completo. */
export const AGENT_STATUS_LOG_WINDOW = 48;

export type AgentLiveStatus = "idle" | "working" | "thinking";

export type AgentStatusInfo = {
  status: AgentLiveStatus;
  /** Última linha do feed associada (se houver). */
  hint: string;
};

function normalizeAgentToken(s: string): string {
  return String(s || "")
    .replace(/^@/, "")
    .trim()
    .toLowerCase()
    .replace(/\.md$/i, "");
}

export function matchLogAgentToRowId(logAgent: string, agentRows: AgentRow[]): string | null {
  const key = normalizeAgentToken(logAgent);
  if (!key || key === "mission-hub") return null;
  for (const row of agentRows) {
    const rid = normalizeAgentToken(row.id);
    if (rid === key) return row.id;
  }
  return null;
}

/**
 * Estado por agente a partir das entradas mais recentes do feed (mesma heurística que o escritório).
 */
export function getAgentStatusesFromLogs(
  agents: AgentRow[],
  logs: ActivityEntry[],
): Map<string, AgentStatusInfo> {
  const out = new Map<string, AgentStatusInfo>();
  const n = Math.min(AGENT_STATUS_LOG_WINDOW, logs.length);
  const matched = new Map<string, ActivityEntry>();
  for (let i = 0; i < n; i++) {
    const log = logs[i];
    const aid = matchLogAgentToRowId(log.agent, agents);
    if (!aid) continue;
    if (!matched.has(aid)) matched.set(aid, log);
  }
  for (const a of agents) {
    const log = matched.get(a.id);
    if (!log) {
      out.set(a.id, { status: "idle", hint: "" });
      continue;
    }
    const actionLower = String(log.action || "").toLowerCase();
    const isErr =
      actionLower.includes("erro") ||
      actionLower.includes("error") ||
      actionLower.includes("fail") ||
      log.type === "error";
    const status: AgentLiveStatus = isErr ? "thinking" : "working";
    const hint = String(log.action || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 100);
    out.set(a.id, { status, hint });
  }
  return out;
}

/** Percentagem estável só para UI (barra tipo “retro dashboard”). */
export function pseudoProgressPercent(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return 38 + (h % 52);
}
