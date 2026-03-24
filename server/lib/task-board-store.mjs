/**
 * Quadro Kanban (Canvas) persistido em JSON no disco — espelha o formato do cliente (`task-canvas`).
 */
import crypto from "node:crypto";
import fs from "fs";
import path from "path";
import { logger } from "./logger.mjs";

export const TASK_BOARD_MAX_ITEMS = 2000;

const COL_IDS = new Set(["todo", "doing", "review", "done"]);
const PRIORITIES = new Set(["low", "medium", "high", "urgent"]);
const AGENT_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;

/** @param {unknown} v */
function sanitizeAssigneeAgentId(v) {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  if (!s || !AGENT_ID_RE.test(s)) return undefined;
  return s;
}

/** @param {string} filePath */
export function computeTaskBoardRevision(filePath) {
  try {
    if (!fs.existsSync(filePath)) return "0:0";
    const st = fs.statSync(filePath);
    return `${st.mtimeMs}:${st.size}`;
  } catch {
    return "0:0";
  }
}

/**
 * Valida e normaliza o array de tarefas (mesma lógica que `parseTaskBoardJson` no cliente).
 * @param {unknown} raw
 */
export function normalizeTaskBoardPayload(raw) {
  let arr;
  if (Array.isArray(raw)) arr = raw;
  else if (raw && typeof raw === "object" && Array.isArray(raw.tasks)) arr = raw.tasks;
  else return { error: 'Corpo inválido: espera-se { "tasks": [...] } ou um array.' };

  if (arr.length > TASK_BOARD_MAX_ITEMS) {
    return { error: `Demasiadas tarefas (máx. ${TASK_BOARD_MAX_ITEMS}).` };
  }

  const out = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const o = item;
    const id = typeof o.id === "string" ? o.id : "";
    const title = typeof o.title === "string" ? o.title.trim() : "";
    const columnId = o.columnId;
    if (!id || !title || typeof columnId !== "string" || !COL_IDS.has(columnId)) continue;
    const order = typeof o.order === "number" && Number.isFinite(o.order) ? o.order : out.length;
    const createdAt =
      typeof o.createdAt === "number" && Number.isFinite(o.createdAt) ? o.createdAt : Date.now();
    const note = typeof o.note === "string" && o.note.trim() ? o.note.trim() : undefined;
    const priority =
      typeof o.priority === "string" && PRIORITIES.has(o.priority) ? o.priority : undefined;
    const blocked = o.blocked === true;
    const assigneeAgentId = sanitizeAssigneeAgentId(o.assigneeAgentId);
    const row = { id, title, columnId, order, createdAt, note, priority, blocked };
    if (assigneeAgentId) row.assigneeAgentId = assigneeAgentId;
    out.push(row);
  }
  return { tasks: out };
}

/** @param {string} filePath */
export function loadTaskBoardFromFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { tasks: [], revision: computeTaskBoardRevision(filePath) };
    }
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    const tasksArr = Array.isArray(parsed?.tasks) ? parsed.tasks : Array.isArray(parsed) ? parsed : [];
    const normalized = normalizeTaskBoardPayload({ tasks: tasksArr });
    if ("error" in normalized) {
      logger.warn({ err: normalized.error }, "task board file parse fallback to empty");
      return { tasks: [], revision: computeTaskBoardRevision(filePath) };
    }
    return { tasks: normalized.tasks, revision: computeTaskBoardRevision(filePath) };
  } catch (e) {
    logger.warn({ err: String(e?.message || e) }, "task board read failed");
    return { tasks: [], revision: "0:0" };
  }
}

/**
 * @param {string} filePath
 * @param {unknown[]} tasks
 */
export function saveTaskBoardAtomic(filePath, tasks) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const payload = JSON.stringify({ version: 1, tasks }, null, 0);
  const tmp = path.join(dir, `.task-board-${crypto.randomBytes(8).toString("hex")}.tmp`);
  fs.writeFileSync(tmp, payload, "utf8");
  fs.renameSync(tmp, filePath);
}
