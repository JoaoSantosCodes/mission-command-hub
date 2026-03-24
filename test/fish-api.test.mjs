import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

import request from 'supertest';
import { describe, it, expect, afterAll, beforeAll } from 'vitest';

import { createBridgeApp } from '../server/create-app.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MISSION_ROOT = path.resolve(__dirname, '..');

describe('Aquário — API fish', () => {
  const tmpFish = path.join(os.tmpdir(), `ma-fish-${process.pid}-${Date.now()}.json`);
  const bridgeOpts = {
    activityLogPath: path.join(os.tmpdir(), `ma-act-${process.pid}-${Date.now()}.json`),
    taskBoardPath: path.join(os.tmpdir(), `ma-tb-${process.pid}-${Date.now()}.json`),
  };

  /** @type {import('express').Express} */
  let app;
  const prevFishPath = process.env.MISSION_FISH_PATH;

  beforeAll(async () => {
    process.env.MISSION_FISH_PATH = tmpFish;
    app = await createBridgeApp(MISSION_ROOT, bridgeOpts);
  });

  afterAll(() => {
    process.env.MISSION_FISH_PATH = prevFishPath;
    try {
      fs.unlinkSync(tmpFish);
    } catch {
      /* ignore */
    }
  });

  it('GET /api/aiox/fish retorna food/maxFood/mood', async () => {
    const res = await request(app).get('/api/aiox/fish').expect(200);
    expect(res.body.ok).toBe(true);
    expect(res.body).toHaveProperty('food');
    expect(res.body).toHaveProperty('maxFood');
    expect(res.body).toHaveProperty('updatedAt');
    expect(['feliz', 'fome', 'critico', 'normal']).toContain(res.body.mood);
  });

  it('POST /api/aiox/fish/consume reduz food e ajusta mood', async () => {
    const r0 = await request(app).get('/api/aiox/fish').expect(200);
    const startFood = r0.body.food;
    const consume = await request(app)
      .post('/api/aiox/fish/consume')
      .set('Content-Type', 'application/json')
      .send({ amount: 10, source: 'test' })
      .expect(200);
    expect(consume.body.food).toBeLessThanOrEqual(startFood);
    expect(['feliz', 'fome', 'critico', 'normal']).toContain(consume.body.mood);
  });

  it('POST /api/aiox/fish/feed aumenta food', async () => {
    const r0 = await request(app).get('/api/aiox/fish').expect(200);
    const startFood = r0.body.food;
    const next = await request(app)
      .post('/api/aiox/fish/feed')
      .set('Content-Type', 'application/json')
      .send({ amount: 12 })
      .expect(200);
    expect(next.body.food).toBeGreaterThanOrEqual(startFood);
    expect(['feliz', 'fome', 'critico', 'normal']).toContain(next.body.mood);
  });
});
