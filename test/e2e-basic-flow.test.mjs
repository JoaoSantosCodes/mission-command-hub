import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { createBridgeApp } from '../server/create-app.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MISSION_ROOT = path.resolve(__dirname, '..');

describe('E2E basic flow', () => {
  const tmpActivity = path.join(os.tmpdir(), `ma-e2e-activity-${Date.now()}.json`);
  const tmpTaskBoard = path.join(os.tmpdir(), `ma-e2e-board-${Date.now()}.json`);
  const tmpHistory = path.join(os.tmpdir(), `ma-e2e-int-history-${Date.now()}.json`);
  let app;

  beforeAll(async () => {
    app = await createBridgeApp(MISSION_ROOT, {
      activityLogPath: tmpActivity,
      taskBoardPath: tmpTaskBoard,
      integrationsHistoryPath: tmpHistory,
    });
  });

  afterAll(() => {
    for (const p of [tmpActivity, tmpTaskBoard, tmpHistory]) {
      try {
        fs.unlinkSync(p);
      } catch {
        /* ignore */
      }
    }
  });

  it('publica atividade e reflete no overview', async () => {
    const action = `e2e-flow-${Date.now()}`;
    await request(app)
      .post('/api/aiox/activity/event')
      .send({ agent: '@task-canvas', action, type: 'output', kind: 'bridge' })
      .expect(200);

    const overview = await request(app).get('/api/aiox/overview').expect(200);
    expect(overview.body.ok).toBe(true);
    expect(Array.isArray(overview.body.logs)).toBe(true);
    expect(overview.body.logs.some((entry) => entry.action === action)).toBe(true);
  });

  it('valida integrações e gera snapshot de saúde', async () => {
    const res = await request(app).get('/api/aiox/integrations-status?validate=1').expect(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.summary).toMatchObject({
      healthScore: expect.any(Number),
      okCount: expect.any(Number),
      total: expect.any(Number),
    });
    expect(Array.isArray(res.body.history)).toBe(true);
    expect(res.body.history.length).toBeGreaterThan(0);
  });
});
