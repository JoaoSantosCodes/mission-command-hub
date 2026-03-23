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
import { callDoubtsChatCompletion, isDoubtsLlmConfigured } from "./lib/doubts-llm.mjs";
import {
  computeTaskBoardRevision,
  loadTaskBoardFromFile,
  normalizeTaskBoardPayload,
  saveTaskBoardAtomic,
} from "./lib/task-board-store.mjs";

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
 * @param {{ activityLogPath?: string; taskBoardPath?: string; maskPathsInUi?: boolean }} [options]
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

  /** Capacidades do painel Dúvidas (notas locais vs LLM opcional no servidor). */
  app.get("/api/aiox/doubts", (_req, res) => {
    const docsUrl = process.env.MISSION_DOUBTS_HELP_URL?.trim() || null;
    const llmEnabled = isDoubtsLlmConfigured();
    res.json({
      ok: true,
      llmEnabled,
      knowledgeBaseEnabled: false,
      message: llmEnabled
        ? "O painel Dúvidas pode enviar mensagens a um modelo no servidor (opt-in). O histórico continua em sessionStorage no browser; não uses dados sensíveis."
        : "O painel Dúvidas guarda notas só na sessão do browser. Para activar LLM no servidor: MISSION_DOUBTS_LLM=1 e chave OpenAI-compatible (ver .env.example). Senão usa o Chat do Cursor (Ctrl+L).",
      docsUrl,
    });
  });

  const MAX_DOUBTS_MSG = 35;
  const MAX_DOUBTS_CONTENT = 8000;

  app.post("/api/aiox/doubts/chat", doubtsChatLimiter, async (req, res) => {
    if (!isDoubtsLlmConfigured()) {
      return res.status(503).json({
        ok: false,
        error: "Chat com LLM no servidor desactivado. Define MISSION_DOUBTS_LLM=1 e OPENAI_API_KEY (ou MISSION_LLM_API_KEY).",
      });
    }
    const raw = req.body?.messages;
    if (!Array.isArray(raw)) {
      return res.status(400).json({ ok: false, error: "Corpo inválido: espera-se { messages: [...] }." });
    }
    if (raw.length === 0 || raw.length > MAX_DOUBTS_MSG) {
      return res.status(400).json({
        ok: false,
        error: `messages: entre 1 e ${MAX_DOUBTS_MSG} entradas.`,
      });
    }
    const cleaned = [];
    for (let i = 0; i < raw.length; i++) {
      const m = raw[i];
      if (!m || typeof m !== "object") {
        return res.status(400).json({ ok: false, error: "Cada mensagem deve ser um objecto." });
      }
      const role = m.role;
      const content = m.content;
      if (role !== "user" && role !== "assistant") {
        return res.status(400).json({ ok: false, error: "role deve ser user ou assistant." });
      }
      if (typeof content !== "string" || !content.trim()) {
        return res.status(400).json({ ok: false, error: "content deve ser texto não vazio." });
      }
      if (content.length > MAX_DOUBTS_CONTENT) {
        return res.status(400).json({
          ok: false,
          error: `content demasiado longo (máx. ${MAX_DOUBTS_CONTENT} caracteres).`,
        });
      }
      cleaned.push({ role, content });
    }
    if (cleaned[cleaned.length - 1].role !== "user") {
      return res.status(400).json({
        ok: false,
        error: "A última mensagem do histórico deve ser do utilizador (user).",
      });
    }
    try {
      const { text } = await callDoubtsChatCompletion(cleaned);
      res.json({ ok: true, reply: text });
    } catch (e) {
      logger.warn({ err: String(e?.message || e) }, "doubts chat failed");
      res.status(502).json({
        ok: false,
        error: String(e?.message || e) || "Falha ao obter resposta do modelo.",
      });
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
        error: "Repositório aiox-core não encontrado. Define AIOX_CORE_PATH ou coloca aiox-core ao lado de MissionAgent.",
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
