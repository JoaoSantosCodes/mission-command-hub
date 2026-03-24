import crypto from 'node:crypto';
import fs from 'fs';
import path from 'path';

import { logger } from './logger.mjs';

const TASK_RUNS_MAX_ITEMS = 1000;

function isRunEntry(x) {
  return (
    x &&
    typeof x.taskId === 'string' &&
    typeof x.runId === 'string' &&
    typeof x.status === 'string' &&
    typeof x.startedAt === 'string' &&
    typeof x.updatedAt === 'string' &&
    (x.finishedAt == null || typeof x.finishedAt === 'string') &&
    typeof x.assigneeAgentId === 'string' &&
    typeof x.message === 'string' &&
    typeof x.suggestedColumn === 'string' &&
    typeof x.blocked === 'boolean'
  );
}

function loadRuns(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    const runs = Array.isArray(parsed?.runs) ? parsed.runs : Array.isArray(parsed) ? parsed : [];
    return runs.filter(isRunEntry).slice(0, TASK_RUNS_MAX_ITEMS);
  } catch {
    return [];
  }
}

function saveRuns(filePath, runs) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const payload = JSON.stringify({ version: 1, runs: runs.slice(0, TASK_RUNS_MAX_ITEMS) }, null, 0);
  const tmp = path.join(dir, `.task-runs-${crypto.randomBytes(8).toString('hex')}.tmp`);
  fs.writeFileSync(tmp, payload, 'utf8');
  fs.renameSync(tmp, filePath);
}

export function createTaskRunStoreFile(filePath) {
  let runs = loadRuns(filePath);
  /** @type {Map<string, any>} */
  let byTask = new Map(runs.map((r) => [r.taskId, r]));

  function persist() {
    try {
      runs = [...byTask.values()].slice(0, TASK_RUNS_MAX_ITEMS);
      saveRuns(filePath, runs);
    } catch (e) {
      logger.warn({ err: String(e?.message || e) }, 'task runs file persist failed');
    }
  }

  async function upsertRun(run) {
    byTask.set(run.taskId, run);
    persist();
    return run;
  }

  async function getRun(taskId) {
    return byTask.get(taskId) ?? null;
  }

  async function listRuns(limit = 120) {
    return [...byTask.values()]
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
      .slice(0, Math.max(1, Math.min(limit, TASK_RUNS_MAX_ITEMS)));
  }

  return {
    backend: 'file',
    upsertRun,
    getRun,
    listRuns,
    _filePath: filePath,
  };
}
