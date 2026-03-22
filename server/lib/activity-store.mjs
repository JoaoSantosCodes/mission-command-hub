/**
 * Feed de atividade persistido em JSON (sobrevive a restarts do processo).
 */
import fs from "fs";
import path from "path";
import { logger } from "./logger.mjs";

export const ACTIVITY_MAX_ENTRIES = 200;

function isEntry(x) {
  return (
    x &&
    typeof x.id === "string" &&
    typeof x.timestamp === "string" &&
    typeof x.agent === "string" &&
    typeof x.action === "string" &&
    typeof x.type === "string"
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
  fs.writeFileSync(filePath, JSON.stringify({ version: 1, logs: trimmed }, null, 0), "utf8");
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

  async function pushLog(agent, action, type = "output") {
    const now = new Date();
    const timestamp = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    const entry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp,
      agent,
      action,
      type,
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
