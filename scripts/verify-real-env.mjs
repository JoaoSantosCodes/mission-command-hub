/**
 * Verifica configuração para ambiente real sem imprimir segredos.
 * Carrega `.env` e `.env.local` como o servidor (ver server/load-env.mjs).
 *
 * Uso:
 *   npm run verify:env
 *   MISSION_VERIFY_UPSTREAM=1 npm run verify:env   # pings HTTP opcionais (OpenAI-compat / Notion / Figma)
 */
import "../server/load-env.mjs";
import { getDoubtsLlmBaseUrl, getDoubtsLlmModel, isDoubtsLlmConfigured } from "../server/lib/doubts-llm.mjs";

function maskSecret(s) {
  const t = String(s ?? "").trim();
  if (!t) return "—";
  if (t.length <= 8) return `*** (${t.length} chars)`;
  return `${t.slice(0, 4)}…${t.slice(-4)} (${t.length} chars)`;
}

function line(label, ok, detail = "") {
  const mark = ok ? "OK" : "—";
  const d = detail ? `  ${detail}` : "";
  console.log(`[${mark}] ${label}${d}`);
}

async function fetchStatus(url, init) {
  try {
    const r = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
    return { ok: r.ok, status: r.status };
  } catch (e) {
    return { ok: false, status: 0, err: String(e?.message || e) };
  }
}

const key = String(process.env.MISSION_LLM_API_KEY || process.env.OPENAI_API_KEY || "").trim();
const notion = String(process.env.NOTION_TOKEN || "").trim();
const figma = String(process.env.FIGMA_ACCESS_TOKEN || "").trim();
const slackHook = String(process.env.SLACK_WEBHOOK_URL || "").trim();
const db = String(process.env.DATABASE_URL || "").trim();
const base = getDoubtsLlmBaseUrl();
const model = getDoubtsLlmModel();

console.log("MissionAgent — verificação de ambiente (.env + .env.local)\n");

line("LLM: MISSION_DOUBTS_LLM=1", process.env.MISSION_DOUBTS_LLM === "1");
line("LLM: chave (MISSION_LLM_API_KEY ou OPENAI_API_KEY legado)", key.length >= 8, maskSecret(key));
line("LLM: painel Dúvidas activo (opt-in + chave)", isDoubtsLlmConfigured());
line("LLM: MISSION_LLM_BASE_URL", true, base);
line("LLM: MISSION_LLM_MODEL", true, model);
line("Notion: NOTION_TOKEN", notion.length > 0, maskSecret(notion));
line("Figma: FIGMA_ACCESS_TOKEN", figma.length > 0, maskSecret(figma));
line("Slack: SLACK_WEBHOOK_URL", slackHook.length > 0, maskSecret(slackHook));
line("PostgreSQL: DATABASE_URL", db.length > 0, db ? "definido" : "");

const upstream = String(process.env.MISSION_VERIFY_UPSTREAM || "").trim() === "1";
if (!upstream) {
  console.log("\nPara pings HTTP reais (OpenAI-compat / Notion / Figma), corre:\n  MISSION_VERIFY_UPSTREAM=1 npm run verify:env\n");
  process.exit(0);
}

console.log("\n--- MISSION_VERIFY_UPSTREAM=1 (pedidos à rede) ---\n");

if (key.length >= 8) {
  const r = await fetchStatus(`${base}/v1/models`, {
    method: "GET",
    headers: { Authorization: `Bearer ${key}` },
  });
  line(`GET ${base}/v1/models`, r.ok, r.status ? `HTTP ${r.status}` : r.err || "falhou");
} else {
  line("GET …/v1/models", false, "sem chave LLM");
}

if (notion) {
  const r = await fetchStatus("https://api.notion.com/v1/users/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${notion}`,
      "Notion-Version": "2022-06-28",
    },
  });
  line("GET api.notion.com/v1/users/me", r.ok, r.status ? `HTTP ${r.status}` : r.err || "falhou");
}

if (figma) {
  const r = await fetchStatus("https://api.figma.com/v1/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${figma}` },
  });
  line("GET api.figma.com/v1/me", r.ok, r.status ? `HTTP ${r.status}` : r.err || "falhou");
}

console.log("\nSegue com `npm run dev` e testa Dúvidas na UI ou `GET /api/aiox/doubts` com o servidor a correr.\n");
