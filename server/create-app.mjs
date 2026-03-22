/**
 * Express app da ponte Mission Agent (sem listen) — usado por index.mjs e testes.
 */
import cors from "cors";
import express from "express";
import fs from "fs";
import os from "node:os";
import path from "path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
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

const isProd = process.env.NODE_ENV === "production";

const AGENT_FILE_MAX_BYTES = 512 * 1024;

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
 * @param {{ activityLogPath?: string; maskPathsInUi?: boolean }} [options]
 */
export async function createBridgeApp(missionRoot, options = {}) {
  const ROOT = path.resolve(missionRoot);
  const { AIOX_ROOT, AGENTS_DIR, AIOX_BIN } = resolveAioxPaths(ROOT);

  const activityLogPath =
    options.activityLogPath ??
    (process.env.MISSION_ACTIVITY_PATH
      ? path.resolve(process.env.MISSION_ACTIVITY_PATH)
      : path.join(ROOT, ".mission-agent", "activity.json"));

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

  const commandLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: Number(process.env.COMMAND_RATE_MAX || 60),
    standardHeaders: true,
    legacyHeaders: false,
  });

  const aioxExecLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: Number(process.env.AIOX_EXEC_RATE_MAX || 5),
    standardHeaders: true,
    legacyHeaders: false,
  });

  const agentEditLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: Number(process.env.AGENT_EDIT_RATE_MAX || 30),
    standardHeaders: true,
    legacyHeaders: false,
  });

  const agentEditAllowed = process.env.MISSION_AGENT_EDIT !== "0";

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

  app.get("/api/aiox/info", (_req, res) => {
    const v = getAioxVersion(AIOX_ROOT, AIOX_BIN);
    const agentsResult = readAgentFiles(AGENTS_DIR);
    res.json({
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
    });
  });

  app.get("/api/aiox/agents", (_req, res) => {
    const r = readAgentFiles(AGENTS_DIR);
    if (!r.ok) return res.status(500).json(r);
    res.json({ agents: r.agents });
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
        "command"
      );
    } catch (e) {
      logger.warn({ err: String(e?.message || e) }, "activity pushLog after agent edit failed");
    }
    logger.info({ id, bytes }, "agent markdown saved");
    res.json({ ok: true, id, bytes });
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
    try {
      await activity.pushLog(
        "@aiox-cli",
        `exec ${sub} → exit ${result.exitCode}${result.timedOut ? " (timeout)" : ""}`,
        "output"
      );
    } catch (e) {
      logger.warn({ err: String(e?.message || e) }, "activity pushLog after exec failed");
      return res.status(500).json({ ok: false, error: "falha ao registar no feed" });
    }
    logger.info({ subcommand: sub, exitCode: result.exitCode }, "aiox exec completed");
    res.json({
      ok: result.ok,
      subcommand: sub,
      exitCode: result.exitCode,
      timedOut: result.timedOut,
      stdout: result.stdout,
      stderr: result.stderr,
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
      await activity.pushLog("@aiox-master", `> ${cmd}`, "command");
      await activity.pushLog(
        "@mission-hub",
        `Encaminhamento local: "${cmd.slice(0, 120)}${cmd.length > 120 ? "…" : ""}"`,
        "output"
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

  return app;
}
