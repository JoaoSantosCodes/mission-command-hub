/**
 * Express app da ponte Mission Agent (sem listen) — usado por index.mjs e testes.
 */
import cors from "cors";
import express from "express";
import fs from "fs";
import os from "node:os";
import path from "path";
import helmet from "helmet";
import { rateLimitJson } from "./lib/rate-limit-json.mjs";
import pinoHttp from "pino-http";
import {
  resolveAioxPaths,
  readAgentFiles,
  getAioxVersion,
  MAX_COMMAND_LEN,
  COMMAND_FORWARD_HINT,
} from "./lib/aiox-data.mjs";
import { createActivityStoreAuto } from "./lib/activity-store-factory.mjs";
import { logger } from "./lib/logger.mjs";
import { maskAbsolutePath, shouldMaskPathsInUi } from "./lib/paths-util.mjs";
import {
  isAioxExecConfigured,
  runAioxSubcommand,
} from "./lib/aiox-exec.mjs";
import {
  callDoubtsChatCompletion,
  getDoubtsLlmBaseUrl,
  isDoubtsLlmConfigured,
  streamDoubtsChatCompletion,
  validateDoubtsChatBody,
} from "./lib/doubts-llm.mjs";
import {
  computeTaskBoardRevision,
  loadTaskBoardFromFile,
  normalizeTaskBoardPayload,
  saveTaskBoardAtomic,
} from "./lib/task-board-store.mjs";
import {
  loadCustomizationFromFile,
  saveCustomizationAtomic,
} from "./lib/customization-store.mjs";
import { fishMood, loadFishState, saveFishState } from "./lib/fish-store.mjs";
import {
  appendIntegrationsSnapshot,
  loadIntegrationsHistory,
} from "./lib/integrations-history-store.mjs";

const isProd = process.env.NODE_ENV === "production";

const AGENT_FILE_MAX_BYTES = 512 * 1024;

/** Revisão fraca para detecção de conflito (mtime + tamanho). */
function computeAgentRevision(filePath) {
  const st = fs.statSync(filePath);
  return `${st.mtimeMs}:${st.size}`;
}

function resolveAgentMarkdownPath(agentsDir, idParam) {
  const base = String(idParam ?? "").replace(/\.md$/i, "");
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(base)) return null;
  const resolvedDir = path.resolve(agentsDir);
  const full = path.resolve(path.join(resolvedDir, `${base}.md`));
  if (!full.startsWith(resolvedDir + path.sep) && full !== resolvedDir) return null;
  return full;
}

/**
 * @param {string} missionRoot Raiz do pacote MissionAgent
 * @param {{ activityLogPath?: string; taskBoardPath?: string; customizationPath?: string; integrationsHistoryPath?: string; maskPathsInUi?: boolean }} [options]
 */
export async function createBridgeApp(missionRoot, options = {}) {
  const ROOT = path.resolve(missionRoot);
  const { AIOX_ROOT, AGENTS_DIR, AIOX_BIN } = resolveAioxPaths(ROOT);

  const activityLogPath =
    options.activityLogPath ??
    (process.env.MISSION_ACTIVITY_PATH
      ? path.resolve(process.env.MISSION_ACTIVITY_PATH)
      : path.join(ROOT, ".mission-agent", "activity.json"));

  const taskBoardPath =
    options.taskBoardPath ??
    (process.env.MISSION_TASK_BOARD_PATH
      ? path.resolve(process.env.MISSION_TASK_BOARD_PATH)
      : path.join(ROOT, ".mission-agent", "task-board.json"));

  const customizationPath =
    options.customizationPath ??
    (process.env.MISSION_CUSTOMIZATION_PATH
      ? path.resolve(process.env.MISSION_CUSTOMIZATION_PATH)
      : path.join(ROOT, ".mission-agent", "customization.json"));

  const fishStatePath = process.env.MISSION_FISH_PATH
    ? path.resolve(process.env.MISSION_FISH_PATH)
    : path.join(ROOT, ".mission-agent", "fish-state.json");
  const integrationsHistoryPath =
    options.integrationsHistoryPath ??
    (process.env.MISSION_INTEGRATIONS_HISTORY_PATH
      ? path.resolve(process.env.MISSION_INTEGRATIONS_HISTORY_PATH)
      : path.join(ROOT, ".mission-agent", "integrations-history.json"));

  const activity = await createActivityStoreAuto(activityLogPath);

  const app = express();
  if (process.env.TRUST_PROXY === "1") {
    app.set("trust proxy", 1);
  }
  if (isProd) {
    app.use(helmet({ contentSecurityPolicy: false }));
  }

  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === "/api/health" },
    })
  );

  const corsOrigins = process.env.CORS_ORIGINS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  app.use(
    cors(
      corsOrigins?.length
        ? { origin: corsOrigins, credentials: true }
        : { origin: true }
    )
  );
  app.use(express.json({ limit: "1mb" }));

  const commandLimiter = rateLimitJson({
    windowMs: 60 * 1000,
    limit: Number(process.env.COMMAND_RATE_MAX || 60),
  });

  const aioxExecLimiter = rateLimitJson({
    windowMs: 60 * 1000,
    limit: Number(process.env.AIOX_EXEC_RATE_MAX || 5),
  });

  const agentEditLimiter = rateLimitJson({
    windowMs: 60 * 1000,
    limit: Number(process.env.AGENT_EDIT_RATE_MAX || 30),
  });

  const doubtsChatLimiter = rateLimitJson({
    windowMs: 60 * 1000,
    limit: Number(process.env.DOUBTS_CHAT_RATE_MAX || 20),
  });

  const taskBoardLimiter = rateLimitJson({
    windowMs: 60 * 1000,
    limit: Number(process.env.TASK_BOARD_PUT_RATE_MAX || 45),
  });

  const agentEditAllowed = process.env.MISSION_AGENT_EDIT !== "0";

  function getTaskBoardSummary() {
    const { tasks, revision } = loadTaskBoardFromFile(taskBoardPath);
    return { revision, taskCount: tasks.length };
  }

  const maskPaths = options.maskPathsInUi ?? shouldMaskPathsInUi();

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "mission-agent-bridge" });
  });

  app.get("/api/aiox/metrics", (_req, res) => {
    const cpus = os.cpus()?.length || 1;
    const load = os.loadavg()[0];
    const cpu_pct = Math.min(100, Math.round((load / cpus) * 100));
    const total = os.totalmem();
    const free = os.freemem();
    const mem_pct = total > 0 ? Math.round(((total - free) / total) * 100) : 0;
    res.json({
      cpu_pct,
      mem_pct,
      disk_pct: 0,
      temp_c: 0,
      uptime: Math.floor(os.uptime()),
    });
  });

  app.get("/api/aiox/weather", async (_req, res) => {
    const loc = process.env.WEATHER_LOCATION || "Lisbon,Portugal";
    try {
      const url = `https://wttr.in/${encodeURIComponent(loc)}?format=j1`;
      const r = await fetch(url, {
        headers: { "User-Agent": "MissionAgent/1.0" },
        signal: AbortSignal.timeout(12_000),
      });
      if (!r.ok) throw new Error("wttr");
      const j = await r.json();
      const cur = j.current_condition?.[0] || {};
      const area = j.nearest_area?.[0]?.areaName?.[0]?.value || "";
      const region = j.nearest_area?.[0]?.region?.[0]?.value || "";
      res.json({
        temp_c: cur.temp_C ?? "--",
        desc: (cur.weatherDesc?.[0]?.value || "—").slice(0, 32),
        code: Number(cur.weatherCode) || 0,
        location: [area, region].filter(Boolean).join(", ") || loc,
      });
    } catch (e) {
      logger.warn({ err: String(e?.message || e) }, "weather fetch failed");
      res.json({ temp_c: "—", desc: "n/d", code: 0, location: loc });
    }
  });

  /** @param {ReturnType<typeof readAgentFiles> | null} [cachedAgents] resultado em cache de `readAgentFiles` */
  function buildBridgePayload(cachedAgents) {
    const v = getAioxVersion(AIOX_ROOT, AIOX_BIN);
    const agentsResult = cachedAgents ?? readAgentFiles(AGENTS_DIR);
    return {
      aioxRoot: maskPaths ? maskAbsolutePath(AIOX_ROOT) : AIOX_ROOT,
      aioxExists: fs.existsSync(AIOX_ROOT),
      agentsDir: maskPaths ? maskAbsolutePath(AGENTS_DIR) : AGENTS_DIR,
      version: v.ok ? v.version : null,
      versionError: v.ok ? null : v.error,
      agentCount: agentsResult.ok ? agentsResult.agents.length : 0,
      agentsError: agentsResult.ok ? null : agentsResult.error,
      pathsMasked: maskPaths,
      aioxExecAvailable: isAioxExecConfigured(),
      activityBackend: activity.backend ?? "file",
      agentEditAllowed,
      taskBoard: getTaskBoardSummary(),
    };
  }

  app.get("/api/aiox/info", (_req, res) => {
    res.json(buildBridgePayload());
  });

  /** Vista agregada: ponte + lista de agentes + feed + contagens por `kind` (um pedido em vez de três). */
  app.get("/api/aiox/overview", (_req, res) => {
    const agentsResult = readAgentFiles(AGENTS_DIR);
    const logs = activity.getLogs();
    const kindCounts = {};
    for (const e of logs) {
      const k = e.kind || e.type || "unknown";
      kindCounts[k] = (kindCounts[k] || 0) + 1;
    }
    res.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      bridge: buildBridgePayload(agentsResult),
      agents: agentsResult.ok ? agentsResult.agents : [],
      agentsError: agentsResult.ok ? null : agentsResult.error,
      logs,
      activity: {
        backend: activity.backend ?? "file",
        kindCounts,
      },
      doubts: {
        llmEnabled: isDoubtsLlmConfigured(),
        streamAvailable: isDoubtsLlmConfigured(),
      },
    });
  });

  /** Quadro Kanban (Canvas): persistência opcional no servidor (ficheiro JSON). */
  app.get("/api/aiox/task-board", (_req, res) => {
    const { tasks, revision } = loadTaskBoardFromFile(taskBoardPath);
    res.json({ ok: true, tasks, revision });
  });

  app.put("/api/aiox/task-board", taskBoardLimiter, (req, res) => {
    const currentRev = computeTaskBoardRevision(taskBoardPath);
    const rawIfMatch = String(req.headers["if-match"] ?? "").trim();
    const ifMatch = rawIfMatch.replace(/^W\//, "").replace(/^"(.*)"$/, "$1").trim();
    if (ifMatch && ifMatch !== currentRev) {
      return res.status(409).json({
        ok: false,
        error: "conflito: o quadro mudou no servidor. Recarrega ou sincroniza.",
        conflict: true,
        revision: currentRev,
      });
    }
    const normalized = normalizeTaskBoardPayload(req.body);
    if ("error" in normalized) {
      return res.status(400).json({ ok: false, error: normalized.error });
    }
    try {
      saveTaskBoardAtomic(taskBoardPath, normalized.tasks);
      const revision = computeTaskBoardRevision(taskBoardPath);
      res.json({ ok: true, revision });
    } catch (e) {
      logger.warn({ err: String(e?.message || e) }, "task board save failed");
      res.status(500).json({ ok: false, error: "falha ao gravar o quadro" });
    }
  });

  /** Personalização (agentes + escritório) para sync híbrido local/servidor. */
  app.get("/api/aiox/customization", (_req, res) => {
    const { data, revision } = loadCustomizationFromFile(customizationPath);
    res.json({ ok: true, data, revision });
  });

  app.put("/api/aiox/customization", taskBoardLimiter, (req, res) => {
    const currentRev = loadCustomizationFromFile(customizationPath).revision;
    const rawIfMatch = String(req.headers["if-match"] ?? "").trim();
    const ifMatch = rawIfMatch.replace(/^W\//, "").replace(/^"(.*)"$/, "$1").trim();
    if (ifMatch && ifMatch !== currentRev) {
      return res.status(409).json({
        ok: false,
        error: "conflito: a personalização mudou no servidor. Recarrega antes de gravar.",
        conflict: true,
        revision: currentRev,
      });
    }
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const payload = {
      agents: body.agents && typeof body.agents === "object" ? body.agents : {},
      office: body.office && typeof body.office === "object" ? body.office : {},
    };
    try {
      const revision = saveCustomizationAtomic(customizationPath, payload);
      return res.json({ ok: true, revision });
    } catch (e) {
      logger.warn({ err: String(e?.message || e) }, "customization save failed");
      return res.status(500).json({ ok: false, error: "falha ao gravar personalização" });
    }
  });

  app.get("/api/aiox/fish", (_req, res) => {
    const st = loadFishState(fishStatePath);
    const mood = fishMood(st.food, st.maxFood);
    res.json({ ok: true, ...st, mood });
  });

  app.post("/api/aiox/fish/consume", commandLimiter, async (req, res) => {
    const amountRaw = Number(req.body?.amount);
    const amount = Number.isFinite(amountRaw) ? Math.max(0, Math.min(50, Math.round(amountRaw))) : 0;
    const source = String(req.body?.source ?? "consumo");
    if (amount <= 0) return res.status(400).json({ ok: false, error: "amount inválido" });
    const current = loadFishState(fishStatePath);
    const next = saveFishState(fishStatePath, {
      ...current,
      food: current.food - amount,
    });
    try {
      await activity.pushLog("@aquario", `Ração -${amount} (${source})`, "output", "bridge");
    } catch {
      /* ignore feed failure */
    }
    return res.json({ ok: true, ...next, mood: fishMood(next.food, next.maxFood) });
  });

  app.post("/api/aiox/fish/feed", commandLimiter, async (req, res) => {
    const amountRaw = Number(req.body?.amount);
    const amount = Number.isFinite(amountRaw) ? Math.max(1, Math.min(50, Math.round(amountRaw))) : 12;
    const current = loadFishState(fishStatePath);
    const next = saveFishState(fishStatePath, {
      ...current,
      food: current.food + amount,
    });
    try {
      await activity.pushLog("@aquario", `Peixe alimentado +${amount}`, "output", "bridge");
    } catch {
      /* ignore feed failure */
    }
    return res.json({ ok: true, ...next, mood: fishMood(next.food, next.maxFood) });
  });

  const INTEGRATIONS_VALIDATE_TTL_MS = 45_000;
  let integrationsValidationCache = null;
  let integrationsValidationAt = 0;
  let integrationsValidationPromise = null;

  async function fetchWithTimeout(url, init, timeoutMs) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }
      return { ok: res.ok, status: res.status, data, text };
    } finally {
      clearTimeout(t);
    }
  }

  async function validateIntegrations() {
    const openaiKey = String(process.env.OPENAI_API_KEY || process.env.MISSION_LLM_API_KEY || "");
    const openaiKeyConfigured = openaiKey.trim().length >= 8;
    const doubtsOptIn = process.env.MISSION_DOUBTS_LLM === "1";

    const openaiBase = getDoubtsLlmBaseUrl();
    const notionToken = String(process.env.NOTION_TOKEN || "").trim();
    const figmaToken = String(process.env.FIGMA_ACCESS_TOKEN || "").trim();

    const timeoutMs = Math.max(4_000, Math.min(10_000, Number(process.env.MISSION_INTEGRATIONS_TIMEOUT_MS) || 7_000));

    async function validateOpenAI() {
      if (!openaiKeyConfigured) return { openaiValidated: false, openaiError: "Sem OPENAI_API_KEY/MISSION_LLM_API_KEY" };
      const r = await fetchWithTimeout(`${openaiBase}/v1/models`, { method: "GET", headers: { Authorization: `Bearer ${openaiKey}` } }, timeoutMs);
      if (r.ok) return { openaiValidated: true };
      const err = String(r.data?.error?.message || r.data?.message || r.text || `HTTP ${r.status}`).slice(0, 180);
      return { openaiValidated: false, openaiError: err };
    }

    async function validateNotion() {
      if (!notionToken) return { tokenValidated: false, tokenError: "Sem NOTION_TOKEN" };
      const r = await fetchWithTimeout(
        "https://api.notion.com/v1/users/me",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${notionToken}`,
            "Notion-Version": "2022-06-28",
          },
        },
        timeoutMs
      );
      if (r.ok) return { tokenValidated: true };
      const err = String(r.data?.message || r.text || `HTTP ${r.status}`).slice(0, 180);
      return { tokenValidated: false, tokenError: err };
    }

    async function validateFigma() {
      if (!figmaToken) return { tokenValidated: false, tokenError: "Sem FIGMA_ACCESS_TOKEN" };
      const r = await fetchWithTimeout(
        "https://api.figma.com/v1/me",
        { method: "GET", headers: { Authorization: `Bearer ${figmaToken}` } },
        timeoutMs
      );
      if (r.ok) return { tokenValidated: true };
      const err = String(r.data?.error?.message || r.data?.message || r.text || `HTTP ${r.status}`).slice(0, 180);
      return { tokenValidated: false, tokenError: err };
    }

    const [openaiRes, notionRes, figmaRes] = await Promise.allSettled([validateOpenAI(), validateNotion(), validateFigma()]);
    const openaiOut = openaiRes.status === "fulfilled" ? openaiRes.value : { openaiValidated: false, openaiError: String(openaiRes.reason || "Erro").slice(0, 180) };
    const notionOut = notionRes.status === "fulfilled" ? notionRes.value : { tokenValidated: false, tokenError: String(notionRes.reason || "Erro").slice(0, 180) };
    const figmaOut = figmaRes.status === "fulfilled" ? figmaRes.value : { tokenValidated: false, tokenError: String(figmaRes.reason || "Erro").slice(0, 180) };

    return {
      doubts: {
        doubtsOptIn,
        openaiKeyConfigured,
        openaiValidated: Boolean(openaiOut.openaiValidated),
        openaiError: openaiOut.openaiValidated ? null : openaiOut.openaiError || null,
      },
      notion: notionOut,
      figma: figmaOut,
    };
  }

  function computeIntegrationsSummary(payload) {
    const checks = [
      payload?.database?.activityBackend === "postgres",
      payload?.exec?.configured === true,
      payload?.doubts?.llmEnabled === true && payload?.doubts?.openaiValidated === true,
      payload?.notion?.tokenValidated === true,
      payload?.figma?.tokenValidated === true,
      payload?.fish?.enabled === true,
    ];
    const total = checks.length;
    const okCount = checks.filter(Boolean).length;
    const healthScore = total > 0 ? Math.round((okCount / total) * 100) : 0;
    return { okCount, total, healthScore };
  }

  function buildIntegrationsAlerts(payload) {
    const alerts = [];
    if ((payload?.database?.activityBackend ?? "file") !== "postgres") {
      alerts.push("DB em fallback para ficheiro (sem Postgres ativo)");
    }
    if (payload?.exec?.configured !== true) {
      alerts.push("CLI AIOX desativado (ENABLE_AIOX_CLI_EXEC=1 em falta)");
    }
    if (!(payload?.doubts?.llmEnabled === true && payload?.doubts?.openaiValidated === true)) {
      alerts.push("OpenAI Dúvidas indisponível ou com validação falhada");
    }
    if (payload?.notion?.tokenValidated !== true) {
      alerts.push("Notion pendente: token ausente ou inválido");
    }
    if (payload?.figma?.tokenValidated !== true) {
      alerts.push("Figma pendente: token ausente ou inválido");
    }
    if (payload?.fish?.enabled !== true) {
      alerts.push("Fish desativado");
    }
    return alerts.slice(0, 12);
  }

  function attachHistoryAndAlerts(payload) {
    const summary = computeIntegrationsSummary(payload);
    const alerts = buildIntegrationsAlerts(payload);
    payload.summary = summary;
    payload.alerts = alerts;
    const generatedAt = String(payload.generatedAt || new Date().toISOString());
    payload.history = appendIntegrationsSnapshot(integrationsHistoryPath, {
      generatedAt,
      healthScore: summary.healthScore,
      okCount: summary.okCount,
      total: summary.total,
      alerts,
    }).slice(-24);
    return payload;
  }

  app.get("/api/aiox/integrations-status", async (req, res) => {
    const openaiKey = String(process.env.OPENAI_API_KEY || process.env.MISSION_LLM_API_KEY || "");
    const openaiKeyConfigured = openaiKey.trim().length >= 8;
    const doubtsOptIn = process.env.MISSION_DOUBTS_LLM === "1";
    const wantValidate = String(req.query.validate ?? "").trim() === "1";

    /** Base (sem chamadas externas) para não bloquear UI e para testes. */
    const payload = {
      ok: true,
      generatedAt: new Date().toISOString(),
      database: {
        configured: Boolean(process.env.DATABASE_URL?.trim()),
        activityBackend: activity.backend ?? "file",
      },
      exec: {
        configured: isAioxExecConfigured(),
      },
      doubts: {
        openaiKeyConfigured,
        doubtsOptIn,
        llmEnabled: isDoubtsLlmConfigured(),
        streamAvailable: isDoubtsLlmConfigured(),
      },
      notion: {
        tokenConfigured: Boolean(process.env.NOTION_TOKEN?.trim()),
      },
      figma: {
        tokenConfigured: Boolean(process.env.FIGMA_ACCESS_TOKEN?.trim()),
      },
      fish: {
        persistence: "file",
        enabled: true,
      },
    };
    payload.history = loadIntegrationsHistory(integrationsHistoryPath).slice(-24);
    payload.summary = computeIntegrationsSummary(payload);
    payload.alerts = buildIntegrationsAlerts(payload);

    if (!wantValidate) {
      return res.json(payload);
    }

    if (!integrationsValidationCache || Date.now() - integrationsValidationAt > INTEGRATIONS_VALIDATE_TTL_MS) {
      if (!integrationsValidationPromise) {
        integrationsValidationPromise = validateIntegrations();
      }
      try {
        integrationsValidationCache = await integrationsValidationPromise;
        integrationsValidationAt = Date.now();
      } finally {
        integrationsValidationPromise = null;
      }
    }

    const merged = {
      ...payload,
      doubts: {
        ...payload.doubts,
        ...integrationsValidationCache.doubts,
      },
      notion: {
        ...payload.notion,
        ...integrationsValidationCache.notion,
      },
      figma: {
        ...payload.figma,
        ...integrationsValidationCache.figma,
      },
    };
    attachHistoryAndAlerts(merged);

    return res.json(merged);
  });

  /** Capacidades do painel Dúvidas (notas locais vs LLM opcional no servidor). */
  app.get("/api/aiox/doubts", (_req, res) => {
    const docsUrl = process.env.MISSION_DOUBTS_HELP_URL?.trim() || null;
    const llmEnabled = isDoubtsLlmConfigured();
    res.json({
      ok: true,
      llmEnabled,
      streamAvailable: llmEnabled,
      knowledgeBaseEnabled: false,
      message: llmEnabled
        ? "O painel Dúvidas pode enviar mensagens a um modelo no servidor (opt-in). O histórico continua em sessionStorage no browser; não uses dados sensíveis."
        : "O painel Dúvidas guarda notas só na sessão do browser. Para activar LLM no servidor: MISSION_DOUBTS_LLM=1 e chave OpenAI-compatible (ver .env.example). Senão usa o Chat do Cursor (Ctrl+L).",
      docsUrl,
    });
  });

  app.post("/api/aiox/doubts/chat", doubtsChatLimiter, async (req, res) => {
    if (!isDoubtsLlmConfigured()) {
      return res.status(503).json({
        ok: false,
        error: "Chat com LLM no servidor desactivado. Define MISSION_DOUBTS_LLM=1 e OPENAI_API_KEY (ou MISSION_LLM_API_KEY).",
      });
    }
    const parsed = validateDoubtsChatBody(req);
    if (!parsed.ok) {
      return res.status(parsed.status).json({ ok: false, error: parsed.error });
    }
    try {
      const { text } = await callDoubtsChatCompletion(parsed.messages);
      res.json({ ok: true, reply: text });
    } catch (e) {
      logger.warn({ err: String(e?.message || e) }, "doubts chat failed");
      res.status(502).json({
        ok: false,
        error: String(e?.message || e) || "Falha ao obter resposta do modelo.",
      });
    }
  });

  /** Mesmo contrato que `POST /api/aiox/doubts/chat`, mas resposta `text/event-stream` (SSE): linhas `data: {"delta":"..."}` e final `data: [DONE]`. */
  app.post("/api/aiox/doubts/chat/stream", doubtsChatLimiter, async (req, res) => {
    if (!isDoubtsLlmConfigured()) {
      return res.status(503).json({
        ok: false,
        error: "Chat com LLM no servidor desactivado. Define MISSION_DOUBTS_LLM=1 e OPENAI_API_KEY (ou MISSION_LLM_API_KEY).",
      });
    }
    const parsed = validateDoubtsChatBody(req);
    if (!parsed.ok) {
      return res.status(parsed.status).json({ ok: false, error: parsed.error });
    }
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (typeof res.flushHeaders === "function") res.flushHeaders();
    try {
      for await (const delta of streamDoubtsChatCompletion(parsed.messages)) {
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (e) {
      logger.warn({ err: String(e?.message || e) }, "doubts chat stream failed");
      res.write(
        `data: ${JSON.stringify({
          error: String(e?.message || e) || "Falha ao obter resposta do modelo.",
        })}\n\n`
      );
      res.end();
    }
  });

  app.get("/api/aiox/agents", (_req, res) => {
    const r = readAgentFiles(AGENTS_DIR);
    if (!r.ok) {
      return res.status(500).json({ ok: false, error: r.error });
    }
    res.json({ agents: r.agents });
  });

  app.post("/api/aiox/agents", agentEditLimiter, async (req, res) => {
    if (!agentEditAllowed) {
      return res.status(403).json({
        ok: false,
        error: "Criação de agentes desactivada (MISSION_AGENT_EDIT=0).",
      });
    }
    const idParam = req.body?.id;
    const resolved = resolveAgentMarkdownPath(AGENTS_DIR, idParam);
    if (!resolved) {
      return res.status(400).json({
        ok: false,
        error: "id inválido (usa letras, números, . _ - ; máx. 128 caracteres)",
      });
    }
    if (!fs.existsSync(AIOX_ROOT)) {
      return res.status(503).json({
        ok: false,
        error:
          "Raiz do projeto AIOX não encontrada (pasta com .aiox-core). Define AIOX_CORE_PATH ou coloca o clone aiox-core ao lado de MissionAgent.",
      });
    }
    try {
      fs.mkdirSync(AGENTS_DIR, { recursive: true });
    } catch (e) {
      logger.warn({ err: String(e?.message || e) }, "mkdir agents failed");
      return res.status(500).json({ ok: false, error: "falha ao criar pasta de agentes" });
    }
    if (fs.existsSync(resolved)) {
      return res.status(409).json({ ok: false, error: "já existe um agente com este id" });
    }
    const id = path.basename(resolved, ".md");
    const contentIn = req.body?.content;
    let content;
    if (typeof contentIn === "string" && contentIn.trim().length > 0) {
      content = contentIn;
    } else {
      content = `# ${id}\n\n---\n\n`;
    }
    const bytes = Buffer.byteLength(content, "utf8");
    if (bytes > AGENT_FILE_MAX_BYTES) {
      return res.status(413).json({
        ok: false,
        error: `conteúdo demasiado grande (máx. ${AGENT_FILE_MAX_BYTES} bytes)`,
      });
    }
    try {
      fs.writeFileSync(resolved, content, "utf8");
    } catch (e) {
      logger.warn({ err: String(e?.message || e) }, "agent file create failed");
      return res.status(500).json({ ok: false, error: "falha ao criar ficheiro do agente" });
    }
    try {
      await activity.pushLog("@mission-hub", `Criou agente ${id} (${bytes} bytes)`, "command", "agent");
    } catch (e) {
      logger.warn({ err: String(e?.message || e) }, "activity pushLog after agent create failed");
    }
    logger.info({ id, bytes }, "agent markdown created");
    res.status(201).json({ ok: true, id, bytes });
  });

  app.get("/api/aiox/agents/:id", (req, res) => {
    const resolved = resolveAgentMarkdownPath(AGENTS_DIR, req.params.id);
    if (!resolved) {
      return res.status(400).json({ ok: false, error: "id inválido" });
    }
    if (!fs.existsSync(resolved)) {
      return res.status(404).json({ ok: false, error: "agente não encontrado" });
    }
    let st;
    try {
      st = fs.statSync(resolved);
    } catch {
      return res.status(404).json({ ok: false, error: "agente não encontrado" });
    }
    if (st.size > AGENT_FILE_MAX_BYTES) {
      return res.status(413).json({ ok: false, error: "ficheiro demasiado grande" });
    }
    const raw = fs.readFileSync(resolved, "utf8");
    const id = path.basename(resolved, ".md");
    let title = id;
    const first = raw.split(/\r?\n/).find((l) => l.trim().startsWith("#"));
    if (first) title = first.replace(/^#+\s*/, "").trim().slice(0, 200);
    res.json({
      id,
      file: path.basename(resolved),
      title,
      content: raw,
      revision: computeAgentRevision(resolved),
    });
  });

  app.put("/api/aiox/agents/:id", agentEditLimiter, async (req, res) => {
    if (!agentEditAllowed) {
      return res.status(403).json({
        ok: false,
        error: "Edição de agentes desactivada (MISSION_AGENT_EDIT=0).",
      });
    }
    const resolved = resolveAgentMarkdownPath(AGENTS_DIR, req.params.id);
    if (!resolved) {
      return res.status(400).json({ ok: false, error: "id inválido" });
    }
    if (!fs.existsSync(resolved)) {
      return res.status(404).json({ ok: false, error: "agente não encontrado" });
    }
    const content = req.body?.content;
    if (typeof content !== "string") {
      return res.status(400).json({ ok: false, error: "content (string) obrigatório" });
    }
    const bytes = Buffer.byteLength(content, "utf8");
    if (bytes > AGENT_FILE_MAX_BYTES) {
      return res.status(413).json({
        ok: false,
        error: `conteúdo demasiado grande (máx. ${AGENT_FILE_MAX_BYTES} bytes)`,
      });
    }
    let currentRev;
    try {
      currentRev = computeAgentRevision(resolved);
    } catch {
      return res.status(404).json({ ok: false, error: "agente não encontrado" });
    }
    const ifMatch = String(req.headers["if-match"] ?? "").replace(/^W\//, "").replace(/^"|"$/g, "").trim();
    const bodyRev =
      typeof req.body?.revision === "string" ? req.body.revision.trim() : "";
    const clientRev = ifMatch || bodyRev;
    if (clientRev && clientRev !== currentRev) {
      return res.status(409).json({
        ok: false,
        error:
          "O ficheiro foi alterado no disco desde a última leitura. Recarrega o agente antes de gravar.",
        conflict: true,
        revision: currentRev,
      });
    }
    try {
      fs.writeFileSync(resolved, content, "utf8");
    } catch (e) {
      logger.warn({ err: String(e?.message || e) }, "agent file write failed");
      return res.status(500).json({ ok: false, error: "falha ao gravar ficheiro" });
    }
    const id = path.basename(resolved, ".md");
    try {
      await activity.pushLog(
        "@mission-hub",
        `Gravou definição do agente ${id} (${bytes} bytes)`,
        "command",
        "agent"
      );
    } catch (e) {
      logger.warn({ err: String(e?.message || e) }, "activity pushLog after agent edit failed");
    }
    logger.info({ id, bytes }, "agent markdown saved");
    res.json({ ok: true, id, bytes });
  });

  app.delete("/api/aiox/agents/:id", agentEditLimiter, async (req, res) => {
    if (!agentEditAllowed) {
      return res.status(403).json({
        ok: false,
        error: "Eliminação de agentes desactivada (MISSION_AGENT_EDIT=0).",
      });
    }
    const resolved = resolveAgentMarkdownPath(AGENTS_DIR, req.params.id);
    if (!resolved) {
      return res.status(400).json({ ok: false, error: "id inválido" });
    }
    if (!fs.existsSync(resolved)) {
      return res.status(404).json({ ok: false, error: "agente não encontrado" });
    }
    const id = path.basename(resolved, ".md");
    try {
      fs.unlinkSync(resolved);
    } catch (e) {
      logger.warn({ err: String(e?.message || e) }, "agent file delete failed");
      return res.status(500).json({ ok: false, error: "falha ao eliminar ficheiro do agente" });
    }
    try {
      await activity.pushLog("@mission-hub", `Eliminou agente ${id}`, "command", "agent");
    } catch (e) {
      logger.warn({ err: String(e?.message || e) }, "activity pushLog after agent delete failed");
    }
    logger.info({ id }, "agent markdown deleted");
    res.json({ ok: true, id });
  });

  app.get("/api/aiox/activity", (_req, res) => {
    res.json({ logs: activity.getLogs() });
  });

  /** Evento de atividade genérico (ex.: Task Canvas) para sincronizar feed e abas. */
  app.post("/api/aiox/activity/event", commandLimiter, async (req, res) => {
    const agent = String(req.body?.agent ?? "@mission-hub").trim().slice(0, 64) || "@mission-hub";
    const action = String(req.body?.action ?? "").trim().slice(0, 240);
    const type = String(req.body?.type ?? "output").trim().slice(0, 24) || "output";
    const kind = String(req.body?.kind ?? "bridge").trim().slice(0, 24) || "bridge";
    if (!action) {
      return res.status(400).json({ ok: false, error: "action vazio" });
    }
    try {
      await activity.pushLog(agent, action, type, kind);
      return res.json({ ok: true });
    } catch (e) {
      logger.warn({ err: String(e?.message || e) }, "activity event pushLog failed");
      return res.status(500).json({ ok: false, error: "falha ao registar atividade" });
    }
  });

  app.post("/api/aiox/exec", aioxExecLimiter, async (req, res) => {
    if (!isAioxExecConfigured()) {
      return res.status(503).json({
        ok: false,
        error:
          "Execução CLI desactivada. Define ENABLE_AIOX_CLI_EXEC=1 e AIOX_EXEC_SECRET (≥8 caracteres).",
      });
    }
    const sub = String(req.body?.subcommand ?? "").trim();
    const confirm = String(req.body?.confirm ?? "").trim();
    if (confirm !== process.env.AIOX_EXEC_SECRET) {
      return res.status(403).json({ ok: false, error: "confirmação inválida" });
    }
    const result = await runAioxSubcommand(sub, { aioxRoot: AIOX_ROOT, aioxBin: AIOX_BIN });
    if ("error" in result && result.error) {
      return res.status(400).json({ ok: false, error: result.error });
    }
    let activityLogged = true;
    try {
      await activity.pushLog(
        "@aiox-cli",
        `exec ${sub} → exit ${result.exitCode}${result.timedOut ? " (timeout)" : ""}`,
        "output",
        "cli"
      );
    } catch (e) {
      activityLogged = false;
      logger.warn({ err: String(e?.message || e) }, "activity pushLog after exec failed");
    }
    logger.info({ subcommand: sub, exitCode: result.exitCode }, "aiox exec completed");
    res.json({
      ok: result.ok,
      subcommand: sub,
      exitCode: result.exitCode,
      timedOut: result.timedOut,
      stdout: result.stdout,
      stderr: result.stderr,
      activityLogged,
    });
  });

  app.post("/api/aiox/command", commandLimiter, async (req, res) => {
    const cmd = String(req.body?.command ?? "").trim();
    if (!cmd) {
      return res.status(400).json({ ok: false, error: "command vazio" });
    }
    if (cmd.length > MAX_COMMAND_LEN) {
      return res.status(400).json({
        ok: false,
        error: `comando demasiado longo (máx. ${MAX_COMMAND_LEN} caracteres)`,
      });
    }
    try {
      await activity.pushLog("@aiox-master", `> ${cmd}`, "command", "command");
      await activity.pushLog(
        "@mission-hub",
        `Encaminhamento local: "${cmd.slice(0, 120)}${cmd.length > 120 ? "…" : ""}"`,
        "output",
        "bridge"
      );
    } catch (e) {
      logger.warn({ err: String(e?.message || e) }, "activity pushLog failed");
      return res.status(500).json({ ok: false, error: "falha ao registar no feed" });
    }
    const ar = readAgentFiles(AGENTS_DIR);
    res.json({
      ok: true,
      message: COMMAND_FORWARD_HINT,
      agentsAvailable: ar.ok ? ar.agents.length : 0,
    });
  });

  app.use("/api", (req, res) => {
    res.status(404).json({ ok: false, error: "recurso API não encontrado" });
  });

  app.use((err, _req, res, next) => {
    const isJsonParse =
      (err instanceof SyntaxError && "body" in err) ||
      err?.type === "entity.parse.failed" ||
      err?.type === "entity.too.large";
    if (isJsonParse) {
      const msg =
        err?.type === "entity.too.large"
          ? "Corpo do pedido demasiado grande"
          : "JSON inválido no corpo do pedido";
      return res.status(err.status || 400).json({ ok: false, error: msg });
    }
    next(err);
  });

  return app;
}
