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
  let app;

  beforeAll(async () => {
    app = await createBridgeApp(MISSION_ROOT, { activityLogPath: tmpActivity });
  });

  afterAll(() => {
    try {
      fs.unlinkSync(tmpActivity);
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
    expect(res.body.doubts).toMatchObject({ llmEnabled: expect.any(Boolean) });
  });

  it("GET /api/aiox/doubts", async () => {
    const res = await request(app).get("/api/aiox/doubts").expect(200);
    expect(res.body).toMatchObject({
      ok: true,
      llmEnabled: false,
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

  it("POST /api/aiox/doubts/chat → 400 sem messages", async () => {
    const prev = process.env.MISSION_DOUBTS_LLM;
    const prevK = process.env.OPENAI_API_KEY;
    process.env.MISSION_DOUBTS_LLM = "1";
    process.env.OPENAI_API_KEY = "sk-test-key-for-smoke-minimum-8";
    const appLlm = await createBridgeApp(MISSION_ROOT, { activityLogPath: tmpActivity });
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
    const execApp = await createBridgeApp(MISSION_ROOT, { activityLogPath: tmpActivity });
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
    const editApp = await createBridgeApp(MISSION_ROOT, { activityLogPath: tmpActivity });
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
    const editApp = await createBridgeApp(MISSION_ROOT, { activityLogPath: tmpActivity });
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
    const postApp = await createBridgeApp(MISSION_ROOT, { activityLogPath: tmpActivity });
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
    const dupApp = await createBridgeApp(MISSION_ROOT, { activityLogPath: tmpActivity });
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
    const delApp = await createBridgeApp(MISSION_ROOT, { activityLogPath: tmpActivity });
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
    const editApp = await createBridgeApp(MISSION_ROOT, { activityLogPath: tmpActivity });
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
      activityLogPath: tmpActivity,
      maskPathsInUi: true,
    });
    const res = await request(maskedApp).get("/api/aiox/info").expect(200);
    expect(res.body.pathsMasked).toBe(true);
    expect(String(res.body.aioxRoot)).toMatch(/^…\//);
  });

  it("feed persistido: nova instância lê o mesmo ficheiro", async () => {
    const persistPath = path.join(os.tmpdir(), `ma-persist-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
    try {
      const app1 = await createBridgeApp(MISSION_ROOT, { activityLogPath: persistPath });
      await request(app1).post("/api/aiox/command").send({ command: "persist-smoke-unique" }).expect(200);
      const app2 = await createBridgeApp(MISSION_ROOT, { activityLogPath: persistPath });
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
    }
  });
});
