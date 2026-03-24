/**
 * Preflight antes de `npm start` em produção ou para validar ambiente “real”.
 * Carrega `.env` + `.env.local` como o servidor.
 *
 * Variáveis:
 * - MISSION_PREFLIGHT_SKIP_AIOX=1 — não falha se aiox-core não existir (ex.: CI sem clone)
 * - NODE_ENV=production — regras mais estritas (CORS, dist, edição de agentes)
 *
 * Uso: npm run verify:real
 */
import "../server/load-env.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveAioxPaths } from "../server/lib/aiox-data.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const { AIOX_ROOT, AGENTS_DIR } = resolveAioxPaths(ROOT);

const isProd = process.env.NODE_ENV === "production";
const skipAiox = String(process.env.MISSION_PREFLIGHT_SKIP_AIOX || "").trim() === "1";

let failed = false;

function pass(msg) {
  console.log(`[OK] ${msg}`);
}
function warn(msg) {
  console.warn(`[WARN] ${msg}`);
}
function fail(msg) {
  console.error(`[FAIL] ${msg}`);
  failed = true;
}

console.log("MissionAgent — preflight ambiente real\n");

if (!skipAiox) {
  if (!fs.existsSync(AIOX_ROOT)) {
    fail(
      `Raiz AIOX não encontrada (${AIOX_ROOT}). Define AIOX_CORE_PATH ou coloca aiox-core ao lado de MissionAgent — sem isto a lista de agentes fica vazia.`
    );
  } else {
    pass(`aiox-core: ${AIOX_ROOT}`);
    if (!fs.existsSync(AGENTS_DIR)) {
      warn(`Pasta de agentes ainda não existe (normal em clone novo): ${AGENTS_DIR}`);
    } else {
      pass(`agents_dir: ${AGENTS_DIR}`);
    }
  }
} else {
  pass("MISSION_PREFLIGHT_SKIP_AIOX=1 — verificação de aiox-core ignorada");
}

const cors = process.env.CORS_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
if (isProd && cors.length === 0) {
  warn(
    "Produção: CORS_ORIGINS vazio — a API aceita qualquer origem no browser. Define URLs explícitas (ex.: https://hub.empresa.com)."
  );
}

if (isProd && process.env.TRUST_PROXY !== "1") {
  warn("Produção: TRUST_PROXY não é 1 — atrás de reverse proxy, rate limit por IP pode estar incorrecto.");
}

const dist = path.join(ROOT, "dist");
if (isProd && !fs.existsSync(path.join(dist, "index.html"))) {
  fail("Produção: dist/ incompleto (falta index.html) — corre npm run build antes de npm start.");
} else if (fs.existsSync(path.join(dist, "index.html"))) {
  pass("dist/ presente (bundle de produção)");
}

if (isProd && process.env.ENABLE_AIOX_CLI_EXEC === "1") {
  const sec = String(process.env.AIOX_EXEC_SECRET || "").trim();
  if (sec.length < 16) {
    warn("Produção: AIOX_EXEC_SECRET curto (<16) — usa segredo longo e rede de confiança.");
  } else {
    pass("CLI exec activo com segredo definido");
  }
}

if (isProd && process.env.MISSION_AGENT_EDIT !== "0") {
  warn(
    "Produção: MISSION_AGENT_EDIT não é 0 — a UI pode criar/editar/eliminar ficheiros .md dos agentes no servidor. Para hub só leitura: MISSION_AGENT_EDIT=0."
  );
}

if (process.env.SLACK_WEBHOOK_URL?.trim() && !process.env.SLACK_WEBHOOK_URL.includes("hooks.slack.com")) {
  warn("SLACK_WEBHOOK_URL não parece um Incoming Webhook hooks.slack.com — confirma o URL.");
}

const key = String(process.env.OPENAI_API_KEY || process.env.MISSION_LLM_API_KEY || "").trim();
if (process.env.MISSION_DOUBTS_LLM === "1" && key.length < 8) {
  warn("MISSION_DOUBTS_LLM=1 mas chave LLM em falta ou curta — painel Dúvidas fica sem modelo no servidor.");
}

if (!isProd) {
  console.log("\n[INFO] NODE_ENV não é production — regras de CORS/dist acima são informativas.\n");
} else {
  console.log("\n[INFO] NODE_ENV=production — validação estrita activa.\n");
}

process.exit(failed ? 1 : 0);
