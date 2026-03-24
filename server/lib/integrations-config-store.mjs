import crypto from "node:crypto";
import fs from "fs";
import path from "path";

const ALLOWED_KEYS = [
  "MISSION_LLM_API_KEY",
  "MISSION_LLM_BASE_URL",
  "MISSION_LLM_MODEL",
  "MISSION_DOUBTS_LLM",
  "OPENAI_API_KEY",
  "SLACK_WEBHOOK_URL",
  "NOTION_TOKEN",
  "FIGMA_ACCESS_TOKEN",
  "DATABASE_URL",
  "ENABLE_AIOX_CLI_EXEC",
  "AIOX_EXEC_SECRET",
];

function normalizeBoolLike(v) {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "1" || s === "true" || s === "yes") return "1";
  if (s === "0" || s === "false" || s === "no") return "0";
  return "";
}

export function normalizeIntegrationsConfig(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const out = {};
  for (const k of ALLOWED_KEYS) {
    const v = src[k];
    if (typeof v !== "string") continue;
    const trimmed = v.trim();
    if (!trimmed) continue;
    if (k === "MISSION_DOUBTS_LLM" || k === "ENABLE_AIOX_CLI_EXEC") {
      const b = normalizeBoolLike(trimmed);
      if (b) out[k] = b;
      continue;
    }
    out[k] = trimmed;
  }
  return out;
}

export function loadIntegrationsConfig(filePath) {
  try {
    if (!fs.existsSync(filePath)) return { data: {}, revision: "0:0" };
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    const data = normalizeIntegrationsConfig(parsed?.data || parsed);
    const st = fs.statSync(filePath);
    return { data, revision: `${st.mtimeMs}:${st.size}` };
  } catch {
    return { data: {}, revision: "0:0" };
  }
}

export function saveIntegrationsConfigAtomic(filePath, data) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const payload = JSON.stringify({ version: 1, data: normalizeIntegrationsConfig(data) }, null, 0);
  const tmp = path.join(dir, `.integrations-config-${crypto.randomBytes(8).toString("hex")}.tmp`);
  fs.writeFileSync(tmp, payload, "utf8");
  fs.renameSync(tmp, filePath);
  const st = fs.statSync(filePath);
  return `${st.mtimeMs}:${st.size}`;
}

export function applyIntegrationsConfigToEnv(data) {
  const cfg = normalizeIntegrationsConfig(data);
  for (const k of ALLOWED_KEYS) {
    if (Object.prototype.hasOwnProperty.call(cfg, k)) process.env[k] = cfg[k];
  }
}

export function redactIntegrationsConfig(data) {
  const cfg = normalizeIntegrationsConfig(data);
  const out = {};
  for (const k of ALLOWED_KEYS) {
    const v = cfg[k];
    if (!v) continue;
    if (k.includes("KEY") || k.includes("TOKEN") || k.includes("SECRET") || k.includes("WEBHOOK") || k === "DATABASE_URL") {
      out[k] = v.length <= 8 ? "********" : `${v.slice(0, 4)}…${v.slice(-4)}`;
    } else out[k] = v;
  }
  return out;
}
