import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

import request from 'supertest';
import { describe, it, expect, afterAll, beforeAll } from 'vitest';

import { createBridgeApp } from '../server/create-app.mjs';
import { MAX_COMMAND_LEN } from '../server/lib/aiox-data.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MISSION_ROOT = path.resolve(__dirname, '..');

describe('API smoke', () => {
  const tmpActivity = path.join(os.tmpdir(), `ma-smoke-${process.pid}-${Date.now()}.json`);
  const tmpTaskBoard = path.join(os.tmpdir(), `ma-tb-${process.pid}-${Date.now()}.json`);
  const tmpTaskRuns = path.join(os.tmpdir(), `ma-runs-${process.pid}-${Date.now()}.json`);
  const tmpIntegrationsHistory = path.join(
    os.tmpdir(),
    `ma-int-history-${process.pid}-${Date.now()}.json`
  );
  const tmpIntegrationsConfig = path.join(
    os.tmpdir(),
    `ma-int-config-${process.pid}-${Date.now()}.json`
  );
  const bridgeOpts = {
    activityLogPath: tmpActivity,
    taskBoardPath: tmpTaskBoard,
    taskRunsPath: tmpTaskRuns,
    integrationsHistoryPath: tmpIntegrationsHistory,
    integrationsConfigPath: tmpIntegrationsConfig,
  };
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
    try {
      fs.unlinkSync(tmpTaskRuns);
    } catch {
      /* ignore */
    }
    try {
      fs.unlinkSync(tmpIntegrationsConfig);
    } catch {
      /* ignore */
    }
  });

  it('GET /api/health', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body).toMatchObject({
      ok: true,
      service: 'mission-agent-bridge',
      capabilities: { taskBoardAgentStep: true },
    });
  });

  it('GET / JSON raiz (modo não-produção)', async () => {
    const res = await request(app).get('/').expect(200);
    expect(res.body).toMatchObject({ ok: true, service: 'mission-agent-api', express: true });
    expect(res.body.paths).toMatchObject({ health: '/api/health' });
  });

  it('GET /api/rota-inexistente → 404 JSON', async () => {
    const res = await request(app).get('/api/endpoint-que-nao-existe-xyz');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ ok: false });
    expect(typeof res.body.error).toBe('string');
  });

  it('POST /api/aiox/command com JSON inválido → 400 JSON', async () => {
    const res = await request(app)
      .post('/api/aiox/command')
      .set('Content-Type', 'application/json')
      .send('{not-json');
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ ok: false });
    expect(typeof res.body.error).toBe('string');
  });

  it('GET /api/aiox/metrics', async () => {
    const res = await request(app).get('/api/aiox/metrics').expect(200);
    expect(res.body).toMatchObject({
      cpu_pct: expect.any(Number),
      mem_pct: expect.any(Number),
      uptime: expect.any(Number),
    });
  });

  it('GET /api/aiox/weather', async () => {
    const res = await request(app).get('/api/aiox/weather');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('temp_c');
    expect(res.body).toHaveProperty('desc');
  }, 15_000);

  it('GET /api/aiox/info', async () => {
    const res = await request(app).get('/api/aiox/info').expect(200);
    expect(res.body).toHaveProperty('aioxRoot');
    expect(res.body).toHaveProperty('agentCount');
    expect(typeof res.body.agentCount).toBe('number');
    expect(res.body).toHaveProperty('aioxExecAvailable');
    expect(typeof res.body.aioxExecAvailable).toBe('boolean');
    expect(res.body).toHaveProperty('activityBackend');
    expect(['file', 'postgres']).toContain(res.body.activityBackend);
    expect(res.body).toHaveProperty('agentEditAllowed');
    expect(typeof res.body.agentEditAllowed).toBe('boolean');
    expect(res.body.taskBoard).toMatchObject({
      revision: expect.any(String),
      taskCount: expect.any(Number),
    });
  });

  it('GET /api/aiox/integrations-status sem validate: LLM configurado não alerta falha de sondagem', async () => {
    const prev = {
      MISSION_DOUBTS_LLM: process.env.MISSION_DOUBTS_LLM,
      MISSION_LLM_API_KEY: process.env.MISSION_LLM_API_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    };
    process.env.MISSION_DOUBTS_LLM = '1';
    process.env.MISSION_LLM_API_KEY = 'smoke-llm-key-at-least-8-chars';
    delete process.env.OPENAI_API_KEY;
    const appLlm = await createBridgeApp(MISSION_ROOT, bridgeOpts);
    const res = await request(appLlm).get('/api/aiox/integrations-status').expect(200);
    expect(res.body.doubts.llmEnabled).toBe(true);
    expect(res.body.doubts.llmKeyConfigured).toBe(true);
    expect(res.body.alerts.some((a) => String(a).includes('LLM Dúvidas'))).toBe(false);
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it('GET /api/aiox/integrations-status', async () => {
    const res = await request(app).get('/api/aiox/integrations-status').expect(200);
    expect(res.body.ok).toBe(true);
    expect(res.body).toHaveProperty('generatedAt');
    expect(res.body).toHaveProperty('database');
    expect(typeof res.body.database.configured).toBe('boolean');
    expect(['file', 'postgres']).toContain(res.body.database.activityBackend);
    expect(res.body).toHaveProperty('doubts');
    expect(typeof res.body.doubts.llmEnabled).toBe('boolean');
    expect(res.body).toHaveProperty('notion');
    expect(typeof res.body.notion.tokenConfigured).toBe('boolean');
    expect(res.body).toHaveProperty('figma');
    expect(typeof res.body.figma.tokenConfigured).toBe('boolean');
    expect(res.body).toHaveProperty('slack');
    expect(res.body.slack).toMatchObject({
      webhookConfigured: expect.any(Boolean),
      webhookFormatOk: expect.any(Boolean),
      mirrorReady: expect.any(Boolean),
    });
    expect(Array.isArray(res.body.alerts)).toBe(true);
    expect(Array.isArray(res.body.history)).toBe(true);
  });

  it('GET /api/aiox/integrations-status?validate=1 adiciona snapshot ao histórico', async () => {
    const before = await request(app).get('/api/aiox/integrations-status').expect(200);
    const beforeCount = Array.isArray(before.body.history) ? before.body.history.length : 0;
    const validated = await request(app)
      .get('/api/aiox/integrations-status?validate=1')
      .expect(200);
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

  it('GET /api/aiox/overview — ponte + agentes + logs agregados', async () => {
    const res = await request(app).get('/api/aiox/overview').expect(200);
    expect(res.body.ok).toBe(true);
    expect(res.body).toHaveProperty('generatedAt');
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

  it('GET /api/aiox/task-board', async () => {
    const res = await request(app).get('/api/aiox/task-board').expect(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.tasks)).toBe(true);
    expect(typeof res.body.revision).toBe('string');
  });

  it('GET/PUT /api/aiox/integrations-config', async () => {
    const g0 = await request(app).get('/api/aiox/integrations-config').expect(200);
    expect(g0.body.ok).toBe(true);
    expect(typeof g0.body.revision).toBe('string');
    const put = await request(app)
      .put('/api/aiox/integrations-config')
      .set('If-Match', g0.body.revision)
      .send({ data: { MISSION_DOUBTS_LLM: '1', MISSION_LLM_MODEL: 'gpt-4o-mini' } })
      .expect(200);
    expect(put.body.ok).toBe(true);
    const g1 = await request(app).get('/api/aiox/integrations-config').expect(200);
    expect(g1.body.data.MISSION_DOUBTS_LLM).toBe('1');
    expect(g1.body.data.MISSION_LLM_MODEL).toBe('gpt-4o-mini');
  });

  it('PUT /api/aiox/integrations-config com patch parcial preserva chaves existentes', async () => {
    const g0 = await request(app).get('/api/aiox/integrations-config').expect(200);
    const put1 = await request(app)
      .put('/api/aiox/integrations-config')
      .set('If-Match', g0.body.revision)
      .send({ data: { NOTION_TOKEN: 'ntn_test_value_123', MISSION_DOUBTS_LLM: '1' } })
      .expect(200);
    const put2 = await request(app)
      .put('/api/aiox/integrations-config')
      .set('If-Match', put1.body.revision)
      .send({ data: { FIGMA_ACCESS_TOKEN: 'figd_test_value_456' } })
      .expect(200);
    const g1 = await request(app).get('/api/aiox/integrations-config').expect(200);
    expect(g1.body.data.NOTION_TOKEN).toBe('ntn_test_value_123');
    expect(g1.body.data.MISSION_DOUBTS_LLM).toBe('1');
    expect(g1.body.data.FIGMA_ACCESS_TOKEN).toBe('figd_test_value_456');
    expect(put2.body.ok).toBe(true);
  });

  it('GET /api/aiox/task-runs retorna lista', async () => {
    const res = await request(app).get('/api/aiox/task-runs').expect(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.runs)).toBe(true);
    expect(typeof res.body.autoRunEnabled).toBe('boolean');
    expect(typeof res.body.backend).toBe('string');
    expect(res.body.policy).toMatchObject({
      defaults: expect.any(Array),
      rules: expect.any(Array),
    });
  });

  it('POST /api/aiox/task-board/agent-step → 400 sem task', async () => {
    const res = await request(app).post('/api/aiox/task-board/agent-step').send({}).expect(400);
    expect(res.body.ok).toBe(false);
    expect(typeof res.body.error).toBe('string');
  });

  it('POST /api/aiox/figma/context → 503 sem FIGMA_ACCESS_TOKEN', async () => {
    const isolatedCfg = path.join(
      os.tmpdir(),
      `ma-int-config-empty-${process.pid}-${Date.now()}.json`
    );
    const prevFigma = process.env.FIGMA_ACCESS_TOKEN;
    delete process.env.FIGMA_ACCESS_TOKEN;
    const noTokenApp = await createBridgeApp(MISSION_ROOT, {
      ...bridgeOpts,
      integrationsConfigPath: isolatedCfg,
    });
    try {
      const res = await request(noTokenApp)
        .post('/api/aiox/figma/context')
        .send({ fileKey: 'abc123' })
        .expect(503);
      expect(res.body.ok).toBe(false);
      expect(res.body.code).toBe('FIGMA_TOKEN_MISSING');
    } finally {
      try {
        fs.unlinkSync(isolatedCfg);
      } catch {
        /* ignore */
      }
      if (prevFigma == null) delete process.env.FIGMA_ACCESS_TOKEN;
      else process.env.FIGMA_ACCESS_TOKEN = prevFigma;
    }
  });

  it('POST /api/aiox/task-board/agent-step → 503 sem LLM (corpo válido)', async () => {
    const res = await request(app)
      .post('/api/aiox/task-board/agent-step')
      .send({ task: { id: 't-agent-step', title: 'Teste', columnId: 'todo' } })
      .expect(503);
    expect(res.body.ok).toBe(false);
    expect(String(res.body.error)).toContain('LLM');
  });

  it('POST /api/aiox/task-board/agent-step → 403 quando policy bloqueia agente', async () => {
    const prev = process.env.MISSION_TASK_AGENT_ALLOWLIST;
    process.env.MISSION_TASK_AGENT_ALLOWLIST = '*:agentStep;aiox-master:exec:info';
    const policyApp = await createBridgeApp(MISSION_ROOT, bridgeOpts);
    try {
      const res = await request(policyApp)
        .post('/api/aiox/task-board/agent-step')
        .send({
          task: {
            id: 't-policy',
            title: 'Teste policy',
            columnId: 'todo',
            assigneeAgentId: 'aiox-master',
          },
        })
        .expect(403);
      expect(res.body.ok).toBe(false);
      expect(String(res.body.error)).toContain('Policy');
    } finally {
      if (prev == null) delete process.env.MISSION_TASK_AGENT_ALLOWLIST;
      else process.env.MISSION_TASK_AGENT_ALLOWLIST = prev;
    }
  });

  it('PUT /api/aiox/task-board grava e GET relê', async () => {
    const tasks = [
      {
        id: 'smoke-tb-1',
        title: 'Smoke task',
        columnId: 'todo',
        order: 0,
        createdAt: Date.now(),
      },
    ];
    const r0 = await request(app).get('/api/aiox/task-board').expect(200);
    const put = await request(app)
      .put('/api/aiox/task-board')
      .set('If-Match', r0.body.revision)
      .send({ tasks })
      .expect(200);
    expect(put.body.ok).toBe(true);
    expect(typeof put.body.revision).toBe('string');
    const r1 = await request(app).get('/api/aiox/task-board').expect(200);
    expect(r1.body.tasks).toHaveLength(1);
    expect(r1.body.tasks[0].id).toBe('smoke-tb-1');
  });

  it('PUT /api/aiox/task-board persiste assigneeAgentId válido e ignora inválido', async () => {
    const r0 = await request(app).get('/api/aiox/task-board').expect(200);
    const tasks = [
      {
        id: 'a1',
        title: 'Com agente',
        columnId: 'doing',
        order: 0,
        createdAt: Date.now(),
        assigneeAgentId: 'dev-agent',
      },
      {
        id: 'a2',
        title: 'Id inválido',
        columnId: 'todo',
        order: 0,
        createdAt: Date.now(),
        assigneeAgentId: '../etc/passwd',
      },
    ];
    await request(app)
      .put('/api/aiox/task-board')
      .set('If-Match', r0.body.revision)
      .send({ tasks })
      .expect(200);
    const r1 = await request(app).get('/api/aiox/task-board').expect(200);
    expect(r1.body.tasks).toHaveLength(2);
    const withAgent = r1.body.tasks.find((t) => t.id === 'a1');
    const bad = r1.body.tasks.find((t) => t.id === 'a2');
    expect(withAgent.assigneeAgentId).toBe('dev-agent');
    expect(bad.assigneeAgentId).toBeUndefined();
  });

  it('PUT /api/aiox/task-board → 409 com If-Match inválido', async () => {
    const res = await request(app)
      .put('/api/aiox/task-board')
      .set('If-Match', '9999999999999:1')
      .send({ tasks: [] });
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ ok: false, conflict: true });
  });

  it('GET /api/aiox/doubts', async () => {
    const res = await request(app).get('/api/aiox/doubts').expect(200);
    expect(res.body).toMatchObject({
      ok: true,
      llmEnabled: false,
      streamAvailable: false,
      knowledgeBaseEnabled: false,
    });
    expect(typeof res.body.message).toBe('string');
    expect(typeof res.body.dataPolicyNotice).toBe('string');
    expect(res.body.dataPolicyNotice.length).toBeGreaterThan(10);
    expect(res.body).toHaveProperty('docsUrl');
    expect(res.body.rateLimitMax).toBeGreaterThanOrEqual(1);
    expect(res.body.rateLimitWindowMs).toBeGreaterThanOrEqual(10_000);
  });

  it('POST /api/aiox/doubts/chat → 503 sem MISSION_DOUBTS_LLM', async () => {
    const res = await request(app)
      .post('/api/aiox/doubts/chat')
      .set('Content-Type', 'application/json')
      .send({ messages: [{ role: 'user', content: 'olá' }] });
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ ok: false });
    expect(typeof res.body.error).toBe('string');
  });

  it('POST /api/aiox/doubts/chat/stream → 503 sem MISSION_DOUBTS_LLM', async () => {
    const res = await request(app)
      .post('/api/aiox/doubts/chat/stream')
      .set('Content-Type', 'application/json')
      .send({ messages: [{ role: 'user', content: 'olá' }] });
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ ok: false });
    expect(typeof res.body.error).toBe('string');
  });

  it('POST /api/aiox/doubts/chat → 400 sem messages', async () => {
    const prev = process.env.MISSION_DOUBTS_LLM;
    const prevK = process.env.MISSION_LLM_API_KEY;
    const prevO = process.env.OPENAI_API_KEY;
    process.env.MISSION_DOUBTS_LLM = '1';
    delete process.env.OPENAI_API_KEY;
    process.env.MISSION_LLM_API_KEY = 'sk-test-key-for-smoke-minimum-8';
    const appLlm = await createBridgeApp(MISSION_ROOT, bridgeOpts);
    const res = await request(appLlm)
      .post('/api/aiox/doubts/chat')
      .set('Content-Type', 'application/json')
      .send({});
    expect(res.status).toBe(400);
    process.env.MISSION_DOUBTS_LLM = prev;
    if (prevK !== undefined) process.env.MISSION_LLM_API_KEY = prevK;
    else delete process.env.MISSION_LLM_API_KEY;
    if (prevO !== undefined) process.env.OPENAI_API_KEY = prevO;
    else delete process.env.OPENAI_API_KEY;
  });

  it('GET integrations validate=1: LLM sem HTTP quando MISSION_LLM_VALIDATE=0', async () => {
    const prev = {
      MISSION_LLM_VALIDATE: process.env.MISSION_LLM_VALIDATE,
      MISSION_LLM_API_KEY: process.env.MISSION_LLM_API_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      MISSION_DOUBTS_LLM: process.env.MISSION_DOUBTS_LLM,
    };
    process.env.MISSION_LLM_VALIDATE = '0';
    process.env.MISSION_LLM_API_KEY = 'generic-api-key-min-8-chars';
    delete process.env.OPENAI_API_KEY;
    process.env.MISSION_DOUBTS_LLM = '1';
    const app2 = await createBridgeApp(MISSION_ROOT, bridgeOpts);
    const res = await request(app2).get('/api/aiox/integrations-status?validate=1').expect(200);
    expect(res.body.doubts.llmValidated).toBe(true);
    expect(res.body.doubts.openaiValidated).toBe(true);
    expect(res.body.doubts.llmValidationSkipped).toBe(true);
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it('GET /api/aiox/agents', async () => {
    const res = await request(app).get('/api/aiox/agents');
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(Array.isArray(res.body.agents)).toBe(true);
    }
  });

  it('POST /api/aiox/exec 503 quando desactivado', async () => {
    const res = await request(app)
      .post('/api/aiox/exec')
      .send({ subcommand: 'info', confirm: 'n/a' });
    expect(res.status).toBe(503);
  });

  it('POST /api/aiox/exec 403 com segredo errado', async () => {
    const prevE = process.env.ENABLE_AIOX_CLI_EXEC;
    const prevS = process.env.AIOX_EXEC_SECRET;
    process.env.ENABLE_AIOX_CLI_EXEC = '1';
    process.env.AIOX_EXEC_SECRET = 'testsecret12';
    const execApp = await createBridgeApp(MISSION_ROOT, bridgeOpts);
    const res = await request(execApp)
      .post('/api/aiox/exec')
      .send({ subcommand: 'info', confirm: 'wrong' });
    expect(res.status).toBe(403);
    process.env.ENABLE_AIOX_CLI_EXEC = prevE;
    process.env.AIOX_EXEC_SECRET = prevS;
  });

  it('POST /api/aiox/command rejeita vazio', async () => {
    const res = await request(app).post('/api/aiox/command').send({ command: '   ' }).expect(400);
    expect(res.body.error).toBeDefined();
  });

  it('POST /api/aiox/command aceita texto curto', async () => {
    const res = await request(app)
      .post('/api/aiox/command')
      .send({ command: 'echo test' })
      .expect(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.message).toBeDefined();
  });

  it('POST /api/aiox/command rejeita comando longo', async () => {
    const res = await request(app)
      .post('/api/aiox/command')
      .send({ command: 'x'.repeat(MAX_COMMAND_LEN + 1) })
      .expect(400);
    expect(String(res.body.error)).toContain('longo');
  });

  it('POST /api/aiox/activity/event rejeita action vazia', async () => {
    const res = await request(app)
      .post('/api/aiox/activity/event')
      .send({ action: '   ' })
      .expect(400);
    expect(res.body.ok).toBe(false);
    expect(typeof res.body.error).toBe('string');
  });

  it('POST /api/aiox/activity/event registra no feed', async () => {
    const action = `smoke-activity-${Date.now()}`;
    const post = await request(app)
      .post('/api/aiox/activity/event')
      .send({ agent: '@task-canvas', action, type: 'output', kind: 'bridge' })
      .expect(200);
    expect(post.body.ok).toBe(true);

    const get = await request(app).get('/api/aiox/activity').expect(200);
    expect(Array.isArray(get.body.logs)).toBe(true);
    expect(get.body.logs.some((l) => l.action === action)).toBe(true);
  });

  it('POST /api/aiox/activity/event não duplica linha idêntica no topo', async () => {
    const action = `smoke-dedupe-${Date.now()}`;
    const payload = { agent: '@task-canvas', action, type: 'output', kind: 'bridge' };
    await request(app).post('/api/aiox/activity/event').send(payload).expect(200);
    await request(app).post('/api/aiox/activity/event').send(payload).expect(200);
    const get = await request(app).get('/api/aiox/activity').expect(200);
    const matches = get.body.logs.filter((l) => l.action === action);
    expect(matches.length).toBe(1);
  });

  it('GET /api/aiox/agents/:id — 404 para agente inexistente', async () => {
    const res = await request(app).get('/api/aiox/agents/nonexistent_agent_xyz_123');
    expect(res.status).toBe(404);
  });

  it('PUT /api/aiox/agents/:id grava Markdown no disco', async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ma-aiox-'));
    const agentsDir = path.join(tmpRoot, '.aiox-core', 'development', 'agents');
    fs.mkdirSync(agentsDir, { recursive: true });
    const agentFile = path.join(agentsDir, 'edit-smoke.md');
    fs.writeFileSync(agentFile, '# edit-smoke\n\nhello', 'utf8');
    const prevAiox = process.env.AIOX_CORE_PATH;
    const prevEdit = process.env.MISSION_AGENT_EDIT;
    process.env.AIOX_CORE_PATH = tmpRoot;
    delete process.env.MISSION_AGENT_EDIT;
    const editApp = await createBridgeApp(MISSION_ROOT, bridgeOpts);
    try {
      const getRes = await request(editApp).get('/api/aiox/agents/edit-smoke').expect(200);
      expect(typeof getRes.body.revision).toBe('string');
      expect(getRes.body.revision).toMatch(/^[\d.]+:\d+$/);
      const res = await request(editApp)
        .put('/api/aiox/agents/edit-smoke')
        .set('If-Match', getRes.body.revision)
        .send({ content: '# edit-smoke\n\nhello2', revision: getRes.body.revision });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(fs.readFileSync(agentFile, 'utf8')).toContain('hello2');
    } finally {
      process.env.AIOX_CORE_PATH = prevAiox;
      process.env.MISSION_AGENT_EDIT = prevEdit;
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it('PUT /api/aiox/agents/:id → 409 quando revision não coincide', async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ma-aiox-'));
    const agentsDir = path.join(tmpRoot, '.aiox-core', 'development', 'agents');
    fs.mkdirSync(agentsDir, { recursive: true });
    const agentFile = path.join(agentsDir, 'conflict-smoke.md');
    fs.writeFileSync(agentFile, '# a\n', 'utf8');
    const prevAiox = process.env.AIOX_CORE_PATH;
    const prevEdit = process.env.MISSION_AGENT_EDIT;
    process.env.AIOX_CORE_PATH = tmpRoot;
    delete process.env.MISSION_AGENT_EDIT;
    const editApp = await createBridgeApp(MISSION_ROOT, bridgeOpts);
    try {
      const res = await request(editApp)
        .put('/api/aiox/agents/conflict-smoke')
        .send({ content: '# b\n', revision: '0:1' });
      expect(res.status).toBe(409);
      expect(res.body.conflict).toBe(true);
      expect(res.body).toHaveProperty('revision');
    } finally {
      process.env.AIOX_CORE_PATH = prevAiox;
      process.env.MISSION_AGENT_EDIT = prevEdit;
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it('POST /api/aiox/agents cria .md no aiox-core', async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ma-aiox-'));
    const prevAiox = process.env.AIOX_CORE_PATH;
    const prevEdit = process.env.MISSION_AGENT_EDIT;
    process.env.AIOX_CORE_PATH = tmpRoot;
    delete process.env.MISSION_AGENT_EDIT;
    const postApp = await createBridgeApp(MISSION_ROOT, bridgeOpts);
    try {
      const res = await request(postApp)
        .post('/api/aiox/agents')
        .send({ id: 'create-smoke-agent' });
      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      const f = path.join(tmpRoot, '.aiox-core', 'development', 'agents', 'create-smoke-agent.md');
      expect(fs.existsSync(f)).toBe(true);
      expect(fs.readFileSync(f, 'utf8')).toContain('create-smoke-agent');
    } finally {
      process.env.AIOX_CORE_PATH = prevAiox;
      process.env.MISSION_AGENT_EDIT = prevEdit;
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it('POST /api/aiox/agents 409 quando o id já existe', async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ma-aiox-'));
    const agentsDir = path.join(tmpRoot, '.aiox-core', 'development', 'agents');
    fs.mkdirSync(agentsDir, { recursive: true });
    fs.writeFileSync(path.join(agentsDir, 'dup-agent.md'), '# dup\n', 'utf8');
    const prevAiox = process.env.AIOX_CORE_PATH;
    const prevEdit = process.env.MISSION_AGENT_EDIT;
    delete process.env.MISSION_AGENT_EDIT;
    process.env.AIOX_CORE_PATH = tmpRoot;
    const dupApp = await createBridgeApp(MISSION_ROOT, bridgeOpts);
    try {
      const res = await request(dupApp).post('/api/aiox/agents').send({ id: 'dup-agent' });
      expect(res.status).toBe(409);
      expect(res.body.ok).toBe(false);
    } finally {
      process.env.AIOX_CORE_PATH = prevAiox;
      if (prevEdit !== undefined) process.env.MISSION_AGENT_EDIT = prevEdit;
      else delete process.env.MISSION_AGENT_EDIT;
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it('DELETE /api/aiox/agents/:id remove o ficheiro', async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ma-aiox-'));
    const agentsDir = path.join(tmpRoot, '.aiox-core', 'development', 'agents');
    fs.mkdirSync(agentsDir, { recursive: true });
    const fp = path.join(agentsDir, 'delete-smoke.md');
    fs.writeFileSync(fp, '# delete-smoke\n', 'utf8');
    const prevAiox = process.env.AIOX_CORE_PATH;
    const prevEdit = process.env.MISSION_AGENT_EDIT;
    process.env.AIOX_CORE_PATH = tmpRoot;
    delete process.env.MISSION_AGENT_EDIT;
    const delApp = await createBridgeApp(MISSION_ROOT, bridgeOpts);
    try {
      const res = await request(delApp).delete('/api/aiox/agents/delete-smoke');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(fs.existsSync(fp)).toBe(false);
    } finally {
      process.env.AIOX_CORE_PATH = prevAiox;
      process.env.MISSION_AGENT_EDIT = prevEdit;
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it('PUT /api/aiox/agents/:id 403 quando MISSION_AGENT_EDIT=0', async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ma-aiox-'));
    const agentsDir = path.join(tmpRoot, '.aiox-core', 'development', 'agents');
    fs.mkdirSync(agentsDir, { recursive: true });
    fs.writeFileSync(path.join(agentsDir, 'edit-off.md'), '# x\n', 'utf8');
    const prevAiox = process.env.AIOX_CORE_PATH;
    const prevEdit = process.env.MISSION_AGENT_EDIT;
    process.env.AIOX_CORE_PATH = tmpRoot;
    process.env.MISSION_AGENT_EDIT = '0';
    const editApp = await createBridgeApp(MISSION_ROOT, bridgeOpts);
    try {
      const res = await request(editApp)
        .put('/api/aiox/agents/edit-off')
        .send({ content: '# y\n' });
      expect(res.status).toBe(403);
    } finally {
      process.env.AIOX_CORE_PATH = prevAiox;
      process.env.MISSION_AGENT_EDIT = prevEdit;
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it('GET /api/aiox/info pode mascarar caminhos', async () => {
    const maskedApp = await createBridgeApp(MISSION_ROOT, {
      ...bridgeOpts,
      maskPathsInUi: true,
    });
    const res = await request(maskedApp).get('/api/aiox/info').expect(200);
    expect(res.body.pathsMasked).toBe(true);
    expect(String(res.body.aioxRoot)).toMatch(/^…\//);
  });

  it('agentsDir segue resource_locations.agents_dir no YAML (projeto mínimo)', async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ma-aiox-yaml-'));
    const prevAiox = process.env.AIOX_CORE_PATH;
    const customRel = '.aiox-core/agents-custom';
    try {
      fs.mkdirSync(path.join(tmpRoot, '.aiox-core'), { recursive: true });
      fs.writeFileSync(
        path.join(tmpRoot, '.aiox-core', 'framework-config.yaml'),
        [
          'metadata:',
          '  name: "mission-smoke"',
          '  framework_version: "1.0.0"',
          'resource_locations:',
          `  agents_dir: "${customRel}"`,
          '',
        ].join('\n'),
        'utf8'
      );
      const agentsDir = path.join(tmpRoot, '.aiox-core', 'agents-custom');
      fs.mkdirSync(agentsDir, { recursive: true });
      fs.writeFileSync(path.join(agentsDir, 'yaml-smoke-agent.md'), '# YAML smoke\n', 'utf8');

      process.env.AIOX_CORE_PATH = tmpRoot;
      const yamlApp = await createBridgeApp(MISSION_ROOT, bridgeOpts);
      const res = await request(yamlApp).get('/api/aiox/info').expect(200);
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

  it('feed persistido: nova instância lê o mesmo ficheiro', async () => {
    const persistPath = path.join(
      os.tmpdir(),
      `ma-persist-${Date.now()}-${Math.random().toString(36).slice(2)}.json`
    );
    const tbPath = path.join(os.tmpdir(), `ma-tb-persist-${Date.now()}.json`);
    try {
      const app1 = await createBridgeApp(MISSION_ROOT, {
        activityLogPath: persistPath,
        taskBoardPath: tbPath,
      });
      await request(app1)
        .post('/api/aiox/command')
        .send({ command: 'persist-smoke-unique' })
        .expect(200);
      const app2 = await createBridgeApp(MISSION_ROOT, {
        activityLogPath: persistPath,
        taskBoardPath: tbPath,
      });
      const res = await request(app2).get('/api/aiox/activity').expect(200);
      const hit = res.body.logs.some(
        (l) => typeof l.action === 'string' && l.action.includes('persist-smoke-unique')
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
