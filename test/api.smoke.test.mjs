import { describe, it, expect, afterAll, beforeAll } from "vitest";
import request from "supertest";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { createBridgeApp } from "../server/create-app.mjs";
import { MAX_COMMAND_LEN } from "../server/lib/aiox-data.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MISSION_ROOT = path.resolve(__dirname, "..");

describe("API smoke", () => {
  const tmpActivity = path.join(os.tmpdir(), `ma-smoke-${process.pid}-${Date.now()}.json`);
  const tmpTaskBoard = path.join(os.tmpdir(), `ma-tb-${process.pid}-${Date.now()}.json`);
  const tmpIntegrationsHistory = path.join(os.tmpdir(), `ma-int-history-${process.pid}-${Date.now()}.json`);
  const bridgeOpts = { activityLogPath: tmpActivity, taskBoardPath: tmpTaskBoard, integrationsHistoryPath: tmpIntegrationsHistory };
  let app;

  beforeAll(async () => {
    app = await createBridgeApp(MISSION_ROOT, bridgeOpts);
  });

  afterAll(() => {
    try {
      fs.unlinkSync(tmpActivity);
    } catch {
      /* ignore */
    }
    try {
      fs.unlinkSync(tmpTaskBoard);
    } catch {
      /* ignore */
    }
    try {
      fs.unlinkSync(tmpIntegrationsHistory);
    } catch {
      /* ignore */
    }
  });

  it("GET /api/health", async () => {
    const res = await request(app).get("/api/health").expect(200);
    expect(res.body).toMatchObject({ ok: true, service: "mission-agent-bridge" });
  });

  it("GET /api/rota-inexistente → 404 JSON", async () => {
    const res = await request(app).get("/api/endpoint-que-nao-existe-xyz");
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ ok: false });
    expect(typeof res.body.error).toBe("string");
  });

  it("POST /api/aiox/command com JSON inválido → 400 JSON", async () => {
    const res = await request(app)
      .post("/api/aiox/command")
      .set("Content-Type", "application/json")
      .send("{not-json");
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ ok: false });
    expect(typeof res.body.error).toBe("string");
  });

  it("GET /api/aiox/metrics", async () => {
    const res = await request(app).get("/api/aiox/metrics").expect(200);
    expect(res.body).toMatchObject({
      cpu_pct: expect.any(Number),
      mem_pct: expect.any(Number),
      uptime: expect.any(Number),
    });
  });

  it(
    "GET /api/aiox/weather",
    async () => {
      const res = await request(app).get("/api/aiox/weather");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("temp_c");
      expect(res.body).toHaveProperty("desc");
    },
    15_000
  );

  it("GET /api/aiox/info", async () => {
    const res = await request(app).get("/api/aiox/info").expect(200);
    expect(res.body).toHaveProperty("aioxRoot");
    expect(res.body).toHaveProperty("agentCount");
    expect(typeof res.body.agentCount).toBe("number");
    expect(res.body).toHaveProperty("aioxExecAvailable");
    expect(typeof res.body.aioxExecAvailable).toBe("boolean");
    expect(res.body).toHaveProperty("activityBackend");
    expect(["file", "postgres"]).toContain(res.body.activityBackend);
    expect(res.body).toHaveProperty("agentEditAllowed");
    expect(typeof res.body.agentEditAllowed).toBe("boolean");
    expect(res.body.taskBoard).toMatchObject({
      revision: expect.any(String),
      taskCount: expect.any(Number),
    });
  });

  it("GET /api/aiox/integrations-status", async () => {
    const res = await request(app).get("/api/aiox/integrations-status").expect(200);
    expect(res.body.ok).toBe(true);
    expect(res.body).toHaveProperty("generatedAt");
    expect(res.body).toHaveProperty("database");
    expect(typeof res.body.database.configured).toBe("boolean");
    expect(["file", "postgres"]).toContain(res.body.database.activityBackend);
    expect(res.body).toHaveProperty("doubts");
    expect(typeof res.body.doubts.llmEnabled).toBe("boolean");
    expect(res.body).toHaveProperty("notion");
    expect(typeof res.body.notion.tokenConfigured).toBe("boolean");
    expect(res.body).toHaveProperty("figma");
    expect(typeof res.body.figma.tokenConfigured).toBe("boolean");
    expect(res.body).toHaveProperty("slack");
    expect(res.body.slack).toMatchObject({
      webhookConfigured: expect.any(Boolean),
      webhookFormatOk: expect.any(Boolean),
      mirrorReady: expect.any(Boolean),
    });
    expect(Array.isArray(res.body.alerts)).toBe(true);
    expect(Array.isArray(res.body.history)).toBe(true);
  });

  it("GET /api/aiox/integrations-status?validate=1 adiciona snapshot ao histórico", async () => {
    const before = await request(app).get("/api/aiox/integrations-status").expect(200);
    const beforeCount = Array.isArray(before.body.history) ? before.body.history.length : 0;
    const validated = await request(app).get("/api/aiox/integrations-status?validate=1").expect(200);
    expect(validated.body.ok).toBe(true);
    expect(Array.isArray(validated.body.history)).toBe(true);
    expect(validated.body.history.length).toBeGreaterThanOrEqual(beforeCount);
    expect(validated.body.summary).toMatchObject({
      healthScore: expect.any(Number),
      okCount: expect.any(Number),
      total: expect.any(Number),
    });
    expect(Array.isArray(validated.body.alerts)).toBe(true);
  });

  it("GET /api/aiox/overview — ponte + agentes + logs agregados", async () => {
    const res = await request(app).get("/api/aiox/overview").expect(200);
    expect(res.body.ok).toBe(true);
    expect(res.body).toHaveProperty("generatedAt");
    expect(res.body.bridge).toMatchObject({ aioxRoot: expect.any(String) });
    expect(Array.isArray(res.body.agents)).toBe(true);
    expect(Array.isArray(res.body.logs)).toBe(true);
    expect(res.body.activity).toMatchObject({
      backend: expect.stringMatching(/file|postgres/),
      kindCounts: expect.any(Object),
    });
    expect(res.body.doubts).toMatchObject({
      llmEnabled: expect.any(Boolean),
      streamAvailable: expect.any(Boolean),
    });
    expect(res.body.bridge.taskBoard).toMatchObject({
      revision: expect.any(String),
      taskCount: expect.any(Number),
    });
  });

  it("GET /api/aiox/task-board", async () => {
    const res = await request(app).get("/api/aiox/task-board").expect(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.tasks)).toBe(true);
    expect(typeof res.body.revision).toBe("string");
  });

  it("PUT /api/aiox/task-board grava e GET relê", async () => {
    const tasks = [
      {
        id: "smoke-tb-1",
        title: "Smoke task",
        columnId: "todo",
        order: 0,
        createdAt: Date.now(),
      },
    ];
    const r0 = await request(app).get("/api/aiox/task-board").expect(200);
    const put = await request(app)
      .put("/api/aiox/task-board")
      .set("If-Match", r0.body.revision)
      .send({ tasks })
      .expect(200);
    expect(put.body.ok).toBe(true);
    expect(typeof put.body.revision).toBe("string");
    const r1 = await request(app).get("/api/aiox/task-board").expect(200);
    expect(r1.body.tasks).toHaveLength(1);
    expect(r1.body.tasks[0].id).toBe("smoke-tb-1");
  });

  it("PUT /api/aiox/task-board → 409 com If-Match inválido", async () => {
    const res = await request(app)
      .put("/api/aiox/task-board")
      .set("If-Match", "9999999999999:1")
      .send({ tasks: [] });
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ ok: false, conflict: true });
  });

  it("GET /api/aiox/doubts", async () => {
    const res = await request(app).get("/api/aiox/doubts").expect(200);
    expect(res.body).toMatchObject({
      ok: true,
      llmEnabled: false,
      streamAvailable: false,
      knowledgeBaseEnabled: false,
    });
    expect(typeof res.body.message).toBe("string");
    expect(res.body).toHaveProperty("docsUrl");
  });

  it("POST /api/aiox/doubts/chat → 503 sem MISSION_DOUBTS_LLM", async () => {
    const res = await request(app)
      .post("/api/aiox/doubts/chat")
      .set("Content-Type", "application/json")
      .send({ messages: [{ role: "user", content: "olá" }] });
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ ok: false });
    expect(typeof res.body.error).toBe("string");
  });

  it("POST /api/aiox/doubts/chat/stream → 503 sem MISSION_DOUBTS_LLM", async () => {
    const res = await request(app)
      .post("/api/aiox/doubts/chat/stream")
      .set("Content-Type", "application/json")
      .send({ messages: [{ role: "user", content: "olá" }] });
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ ok: false });
    expect(typeof res.body.error).toBe("string");
  });

  it("POST /api/aiox/doubts/chat → 400 sem messages", async () => {
    const prev = process.env.MISSION_DOUBTS_LLM;
    const prevK = process.env.OPENAI_API_KEY;
    process.env.MISSION_DOUBTS_LLM = "1";
    process.env.OPENAI_API_KEY = "sk-test-key-for-smoke-minimum-8";
    const appLlm = await createBridgeApp(MISSION_ROOT, bridgeOpts);
    const res = await request(appLlm)
      .post("/api/aiox/doubts/chat")
      .set("Content-Type", "application/json")
      .send({});
    expect(res.status).toBe(400);
    process.env.MISSION_DOUBTS_LLM = prev;
    process.env.OPENAI_API_KEY = prevK;
  });

  it("GET /api/aiox/agents", async () => {
    const res = await request(app).get("/api/aiox/agents");
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(Array.isArray(res.body.agents)).toBe(true);
    }
  });

  it("POST /api/aiox/exec 503 quando desactivado", async () => {
    const res = await request(app)
      .post("/api/aiox/exec")
      .send({ subcommand: "info", confirm: "n/a" });
    expect(res.status).toBe(503);
  });

  it("POST /api/aiox/exec 403 com segredo errado", async () => {
    const prevE = process.env.ENABLE_AIOX_CLI_EXEC;
    const prevS = process.env.AIOX_EXEC_SECRET;
    process.env.ENABLE_AIOX_CLI_EXEC = "1";
    process.env.AIOX_EXEC_SECRET = "testsecret12";
    const execApp = await createBridgeApp(MISSION_ROOT, bridgeOpts);
    const res = await request(execApp).post("/api/aiox/exec").send({ subcommand: "info", confirm: "wrong" });
    expect(res.status).toBe(403);
    process.env.ENABLE_AIOX_CLI_EXEC = prevE;
    process.env.AIOX_EXEC_SECRET = prevS;
  });

  it("POST /api/aiox/command rejeita vazio", async () => {
    const res = await request(app).post("/api/aiox/command").send({ command: "   " }).expect(400);
    expect(res.body.error).toBeDefined();
  });

  it("POST /api/aiox/command aceita texto curto", async () => {
    const res = await request(app)
      .post("/api/aiox/command")
      .send({ command: "echo test" })
      .expect(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.message).toBeDefined();
  });

  it("POST /api/aiox/command rejeita comando longo", async () => {
    const res = await request(app)
      .post("/api/aiox/command")
      .send({ command: "x".repeat(MAX_COMMAND_LEN + 1) })
      .expect(400);
    expect(String(res.body.error)).toContain("longo");
  });

  it("POST /api/aiox/activity/event rejeita action vazia", async () => {
    const res = await request(app).post("/api/aiox/activity/event").send({ action: "   " }).expect(400);
    expect(res.body.ok).toBe(false);
    expect(typeof res.body.error).toBe("string");
  });

  it("POST /api/aiox/activity/event registra no feed", async () => {
    const action = `smoke-activity-${Date.now()}`;
    const post = await request(app)
      .post("/api/aiox/activity/event")
      .send({ agent: "@task-canvas", action, type: "output", kind: "bridge" })
      .expect(200);
    expect(post.body.ok).toBe(true);

    const get = await request(app).get("/api/aiox/activity").expect(200);
    expect(Array.isArray(get.body.logs)).toBe(true);
    expect(get.body.logs.some((l) => l.action === action)).toBe(true);
  });

  it("GET /api/aiox/agents/:id — 404 para agente inexistente", async () => {
    const res = await request(app).get("/api/aiox/agents/nonexistent_agent_xyz_123");
    expect(res.status).toBe(404);
  });

  it("PUT /api/aiox/agents/:id grava Markdown no disco", async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ma-aiox-"));
    const agentsDir = path.join(tmpRoot, ".aiox-core", "development", "agents");
    fs.mkdirSync(agentsDir, { recursive: true });
    const agentFile = path.join(agentsDir, "edit-smoke.md");
    fs.writeFileSync(agentFile, "# edit-smoke\n\nhello", "utf8");
    const prevAiox = process.env.AIOX_CORE_PATH;
    const prevEdit = process.env.MISSION_AGENT_EDIT;
    process.env.AIOX_CORE_PATH = tmpRoot;
    delete process.env.MISSION_AGENT_EDIT;
    const editApp = await createBridgeApp(MISSION_ROOT, bridgeOpts);
    try {
      const getRes = await request(editApp).get("/api/aiox/agents/edit-smoke").expect(200);
      expect(typeof getRes.body.revision).toBe("string");
      expect(getRes.body.revision).toMatch(/^[\d.]+:\d+$/);
      const res = await request(editApp)
        .put("/api/aiox/agents/edit-smoke")
        .set("If-Match", getRes.body.revision)
        .send({ content: "# edit-smoke\n\nhello2", revision: getRes.body.revision });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(fs.readFileSync(agentFile, "utf8")).toContain("hello2");
    } finally {
      process.env.AIOX_CORE_PATH = prevAiox;
      process.env.MISSION_AGENT_EDIT = prevEdit;
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it("PUT /api/aiox/agents/:id → 409 quando revision não coincide", async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ma-aiox-"));
    const agentsDir = path.join(tmpRoot, ".aiox-core", "development", "agents");
    fs.mkdirSync(agentsDir, { recursive: true });
    const agentFile = path.join(agentsDir, "conflict-smoke.md");
    fs.writeFileSync(agentFile, "# a\n", "utf8");
    const prevAiox = process.env.AIOX_CORE_PATH;
    const prevEdit = process.env.MISSION_AGENT_EDIT;
    process.env.AIOX_CORE_PATH = tmpRoot;
    delete process.env.MISSION_AGENT_EDIT;
    const editApp = await createBridgeApp(MISSION_ROOT, bridgeOpts);
    try {
      const res = await request(editApp)
        .put("/api/aiox/agents/conflict-smoke")
        .send({ content: "# b\n", revision: "0:1" });
      expect(res.status).toBe(409);
      expect(res.body.conflict).toBe(true);
      expect(res.body).toHaveProperty("revision");
    } finally {
      process.env.AIOX_CORE_PATH = prevAiox;
      process.env.MISSION_AGENT_EDIT = prevEdit;
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it("POST /api/aiox/agents cria .md no aiox-core", async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ma-aiox-"));
    const prevAiox = process.env.AIOX_CORE_PATH;
    const prevEdit = process.env.MISSION_AGENT_EDIT;
    process.env.AIOX_CORE_PATH = tmpRoot;
    delete process.env.MISSION_AGENT_EDIT;
    const postApp = await createBridgeApp(MISSION_ROOT, bridgeOpts);
    try {
      const res = await request(postApp).post("/api/aiox/agents").send({ id: "create-smoke-agent" });
      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      const f = path.join(tmpRoot, ".aiox-core", "development", "agents", "create-smoke-agent.md");
      expect(fs.existsSync(f)).toBe(true);
      expect(fs.readFileSync(f, "utf8")).toContain("create-smoke-agent");
    } finally {
      process.env.AIOX_CORE_PATH = prevAiox;
      process.env.MISSION_AGENT_EDIT = prevEdit;
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it("POST /api/aiox/agents 409 quando o id já existe", async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ma-aiox-"));
    const agentsDir = path.join(tmpRoot, ".aiox-core", "development", "agents");
    fs.mkdirSync(agentsDir, { recursive: true });
    fs.writeFileSync(path.join(agentsDir, "dup-agent.md"), "# dup\n", "utf8");
    const prevAiox = process.env.AIOX_CORE_PATH;
    const prevEdit = process.env.MISSION_AGENT_EDIT;
    delete process.env.MISSION_AGENT_EDIT;
    process.env.AIOX_CORE_PATH = tmpRoot;
    const dupApp = await createBridgeApp(MISSION_ROOT, bridgeOpts);
    try {
      const res = await request(dupApp).post("/api/aiox/agents").send({ id: "dup-agent" });
      expect(res.status).toBe(409);
      expect(res.body.ok).toBe(false);
    } finally {
      process.env.AIOX_CORE_PATH = prevAiox;
      if (prevEdit !== undefined) process.env.MISSION_AGENT_EDIT = prevEdit;
      else delete process.env.MISSION_AGENT_EDIT;
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it("DELETE /api/aiox/agents/:id remove o ficheiro", async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ma-aiox-"));
    const agentsDir = path.join(tmpRoot, ".aiox-core", "development", "agents");
    fs.mkdirSync(agentsDir, { recursive: true });
    const fp = path.join(agentsDir, "delete-smoke.md");
    fs.writeFileSync(fp, "# delete-smoke\n", "utf8");
    const prevAiox = process.env.AIOX_CORE_PATH;
    const prevEdit = process.env.MISSION_AGENT_EDIT;
    process.env.AIOX_CORE_PATH = tmpRoot;
    delete process.env.MISSION_AGENT_EDIT;
    const delApp = await createBridgeApp(MISSION_ROOT, bridgeOpts);
    try {
      const res = await request(delApp).delete("/api/aiox/agents/delete-smoke");
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(fs.existsSync(fp)).toBe(false);
    } finally {
      process.env.AIOX_CORE_PATH = prevAiox;
      process.env.MISSION_AGENT_EDIT = prevEdit;
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it("PUT /api/aiox/agents/:id 403 quando MISSION_AGENT_EDIT=0", async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ma-aiox-"));
    const agentsDir = path.join(tmpRoot, ".aiox-core", "development", "agents");
    fs.mkdirSync(agentsDir, { recursive: true });
    fs.writeFileSync(path.join(agentsDir, "edit-off.md"), "# x\n", "utf8");
    const prevAiox = process.env.AIOX_CORE_PATH;
    const prevEdit = process.env.MISSION_AGENT_EDIT;
    process.env.AIOX_CORE_PATH = tmpRoot;
    process.env.MISSION_AGENT_EDIT = "0";
    const editApp = await createBridgeApp(MISSION_ROOT, bridgeOpts);
    try {
      const res = await request(editApp).put("/api/aiox/agents/edit-off").send({ content: "# y\n" });
      expect(res.status).toBe(403);
    } finally {
      process.env.AIOX_CORE_PATH = prevAiox;
      process.env.MISSION_AGENT_EDIT = prevEdit;
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it("GET /api/aiox/info pode mascarar caminhos", async () => {
    const maskedApp = await createBridgeApp(MISSION_ROOT, {
      ...bridgeOpts,
      maskPathsInUi: true,
    });
    const res = await request(maskedApp).get("/api/aiox/info").expect(200);
    expect(res.body.pathsMasked).toBe(true);
    expect(String(res.body.aioxRoot)).toMatch(/^…\//);
  });

  it("agentsDir segue resource_locations.agents_dir no YAML (projeto mínimo)", async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ma-aiox-yaml-"));
    const prevAiox = process.env.AIOX_CORE_PATH;
    const customRel = ".aiox-core/agents-custom";
    try {
      fs.mkdirSync(path.join(tmpRoot, ".aiox-core"), { recursive: true });
      fs.writeFileSync(
        path.join(tmpRoot, ".aiox-core", "framework-config.yaml"),
        [
          "metadata:",
          '  name: "mission-smoke"',
          '  framework_version: "1.0.0"',
          "resource_locations:",
          `  agents_dir: "${customRel}"`,
          "",
        ].join("\n"),
        "utf8",
      );
      const agentsDir = path.join(tmpRoot, ".aiox-core", "agents-custom");
      fs.mkdirSync(agentsDir, { recursive: true });
      fs.writeFileSync(path.join(agentsDir, "yaml-smoke-agent.md"), "# YAML smoke\n", "utf8");

      process.env.AIOX_CORE_PATH = tmpRoot;
      const yamlApp = await createBridgeApp(MISSION_ROOT, bridgeOpts);
      const res = await request(yamlApp).get("/api/aiox/info").expect(200);
      expect(path.normalize(res.body.agentsDir)).toBe(path.normalize(agentsDir));
      expect(res.body.agentCount).toBeGreaterThanOrEqual(1);
    } finally {
      if (prevAiox !== undefined) process.env.AIOX_CORE_PATH = prevAiox;
      else delete process.env.AIOX_CORE_PATH;
      try {
        fs.rmSync(tmpRoot, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  });

  it("feed persistido: nova instância lê o mesmo ficheiro", async () => {
    const persistPath = path.join(os.tmpdir(), `ma-persist-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
    const tbPath = path.join(os.tmpdir(), `ma-tb-persist-${Date.now()}.json`);
    try {
      const app1 = await createBridgeApp(MISSION_ROOT, { activityLogPath: persistPath, taskBoardPath: tbPath });
      await request(app1).post("/api/aiox/command").send({ command: "persist-smoke-unique" }).expect(200);
      const app2 = await createBridgeApp(MISSION_ROOT, { activityLogPath: persistPath, taskBoardPath: tbPath });
      const res = await request(app2).get("/api/aiox/activity").expect(200);
      const hit = res.body.logs.some(
        (l) => typeof l.action === "string" && l.action.includes("persist-smoke-unique")
      );
      expect(hit).toBe(true);
    } finally {
      try {
        fs.unlinkSync(persistPath);
      } catch {
        /* ignore */
      }
      try {
        fs.unlinkSync(tbPath);
      } catch {
        /* ignore */
      }
    }
  });
});
