/**
 * Feed de atividade persistido em JSON (sobrevive a restarts do processo).
 */
import crypto from "node:crypto";
import fs from "fs";
import path from "path";
import { logger } from "./logger.mjs";

export const ACTIVITY_MAX_ENTRIES = 200;

/**
 * Evita gravar de novo a mesma linha que já está no topo do feed (duplo POST, debounce, etc.).
 * @param {{ agent?: string; action?: string; type?: string; kind?: string }[]} logs
 */
export function isDuplicateActivityHead(logs, agent, action, type = "output", kind) {
  const top = logs[0];
  if (!top) return false;
  const a = String(agent ?? "").trim();
  const act = String(action ?? "").trim();
  if (top.agent !== a || top.action !== act || top.type !== type) return false;
  const norm = (k) => (k == null || k === "" ? "" : String(k));
  return norm(top.kind) === norm(kind);
}

/** @param {unknown} x */
function isEntry(x) {
  return (
    x &&
    typeof x.id === "string" &&
    typeof x.timestamp === "string" &&
    typeof x.agent === "string" &&
    typeof x.action === "string" &&
    typeof x.type === "string" &&
    (x.kind === undefined || typeof x.kind === "string")
  );
}

export function loadActivityLog(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    const logs = Array.isArray(parsed?.logs) ? parsed.logs : Array.isArray(parsed) ? parsed : [];
    return logs.filter(isEntry).slice(0, ACTIVITY_MAX_ENTRIES);
  } catch {
    return [];
  }
}

function saveActivityLog(filePath, logs) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const trimmed = logs.slice(0, ACTIVITY_MAX_ENTRIES);
  const payload = JSON.stringify({ version: 1, logs: trimmed }, null, 0);
  const tmp = path.join(dir, `.activity-${crypto.randomBytes(8).toString("hex")}.tmp`);
  fs.writeFileSync(tmp, payload, "utf8");
  fs.renameSync(tmp, filePath);
}

/**
 * @param {string} filePath Ficheiro JSON (directório criado se necessário)
 */
export function createActivityStore(filePath) {
  let logs = loadActivityLog(filePath);

  function persist() {
    try {
      saveActivityLog(filePath, logs);
    } catch (e) {
      logger.warn({ err: String(e?.message || e) }, "activity log persist failed");
    }
  }

  /**
   * @param {string} agent
   * @param {string} action
   * @param {string} [type]
   * @param {string} [kind] command | bridge | agent | cli (semântica; `type` mantém compat.)
   */
  async function pushLog(agent, action, type = "output", kind) {
    if (isDuplicateActivityHead(logs, agent, action, type, kind)) {
      return logs[0];
    }
    const now = new Date();
    const timestamp = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    const entry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp,
      agent,
      action,
      type,
      ...(kind ? { kind } : {}),
    };
    logs.unshift(entry);
    if (logs.length > ACTIVITY_MAX_ENTRIES) logs.length = ACTIVITY_MAX_ENTRIES;
    persist();
    return entry;
  }

  function getLogs() {
    return logs;
  }

  return { pushLog, getLogs, backend: "file", _filePath: filePath };
}
