/**
 * Feed de atividade em PostgreSQL (mesma forma que o JSON em memória).
 */
import { logger } from './logger.mjs';
import { ACTIVITY_MAX_ENTRIES, isDuplicateActivityHead } from './activity-store.mjs';

const TABLE = 'mission_activity_log';

/**
 * @param {import("pg").Pool} pool
 */
export async function ensureActivitySchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      id VARCHAR(160) PRIMARY KEY,
      ts_time VARCHAR(16) NOT NULL,
      agent VARCHAR(256) NOT NULL,
      action TEXT NOT NULL,
      type VARCHAR(32) NOT NULL DEFAULT 'output',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    ALTER TABLE ${TABLE}
    ADD COLUMN IF NOT EXISTS kind VARCHAR(32);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS mission_activity_log_created_at_idx
    ON ${TABLE} (created_at DESC);
  `);
}

function rowToEntry(row) {
  const e = {
    id: row.id,
    timestamp: row.ts_time,
    agent: row.agent,
    action: row.action,
    type: row.type,
  };
  if (row.kind) e.kind = row.kind;
  return e;
}

/**
 * @param {import("pg").Pool} pool
 */
export async function createPgActivityStore(pool) {
  await ensureActivitySchema(pool);

  const loadRes = await pool.query(
    `SELECT id, ts_time, agent, action, type, kind FROM ${TABLE} ORDER BY created_at DESC LIMIT $1`,
    [ACTIVITY_MAX_ENTRIES]
  );
  /** @type {{ id: string; timestamp: string; agent: string; action: string; type: string }[]} */
  let logs = loadRes.rows.map(rowToEntry);

  async function trimExcess() {
    await pool.query(
      `DELETE FROM ${TABLE} WHERE id IN (
        SELECT id FROM (
          SELECT id FROM ${TABLE} ORDER BY created_at DESC OFFSET $1
        ) sub
      )`,
      [ACTIVITY_MAX_ENTRIES]
    );
  }

  async function pushLog(agent, action, type = 'output', kind) {
    if (isDuplicateActivityHead(logs, agent, action, type, kind)) {
      return logs[0];
    }
    const now = new Date();
    const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const entry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp,
      agent,
      action,
      type,
      ...(kind ? { kind } : {}),
    };
    try {
      await pool.query(
        `INSERT INTO ${TABLE} (id, ts_time, agent, action, type, kind) VALUES ($1, $2, $3, $4, $5, $6)`,
        [entry.id, entry.timestamp, entry.agent, entry.action, entry.type, kind ?? null]
      );
      logs.unshift(entry);
      if (logs.length > ACTIVITY_MAX_ENTRIES) logs.length = ACTIVITY_MAX_ENTRIES;
      await trimExcess();
    } catch (e) {
      logger.warn({ err: String(e?.message || e) }, 'activity pg insert failed');
      throw e;
    }
    return entry;
  }

  function getLogs() {
    return logs;
  }

  return {
    pushLog,
    getLogs,
    backend: 'postgres',
  };
}
