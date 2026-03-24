import { logger } from './logger.mjs';

const TABLE = 'mission_task_runs';

export async function createTaskRunStorePg(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      task_id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      assignee_agent_id TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL,
      started_at TIMESTAMPTZ NOT NULL,
      finished_at TIMESTAMPTZ NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      message TEXT NOT NULL DEFAULT '',
      suggested_column TEXT NOT NULL DEFAULT 'manter',
      blocked BOOLEAN NOT NULL DEFAULT FALSE,
      signature TEXT NOT NULL DEFAULT ''
    )
  `);

  async function upsertRun(run) {
    await pool.query(
      `
      INSERT INTO ${TABLE}
        (task_id, run_id, assignee_agent_id, status, started_at, finished_at, updated_at, message, suggested_column, blocked, signature)
      VALUES
        ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz, $7::timestamptz, $8, $9, $10, $11)
      ON CONFLICT (task_id) DO UPDATE SET
        run_id = EXCLUDED.run_id,
        assignee_agent_id = EXCLUDED.assignee_agent_id,
        status = EXCLUDED.status,
        started_at = EXCLUDED.started_at,
        finished_at = EXCLUDED.finished_at,
        updated_at = EXCLUDED.updated_at,
        message = EXCLUDED.message,
        suggested_column = EXCLUDED.suggested_column,
        blocked = EXCLUDED.blocked,
        signature = EXCLUDED.signature
      `,
      [
        run.taskId,
        run.runId,
        run.assigneeAgentId || '',
        run.status,
        run.startedAt,
        run.finishedAt ?? null,
        run.updatedAt,
        run.message || '',
        run.suggestedColumn || 'manter',
        run.blocked === true,
        run.signature || '',
      ]
    );
    return run;
  }

  async function getRun(taskId) {
    const q = await pool.query(
      `SELECT task_id, run_id, assignee_agent_id, status, started_at, finished_at, updated_at, message, suggested_column, blocked, signature
       FROM ${TABLE}
       WHERE task_id = $1
       LIMIT 1`,
      [taskId]
    );
    const r = q.rows?.[0];
    if (!r) return null;
    return {
      taskId: r.task_id,
      runId: r.run_id,
      assigneeAgentId: r.assignee_agent_id || '',
      status: r.status,
      startedAt: new Date(r.started_at).toISOString(),
      finishedAt: r.finished_at ? new Date(r.finished_at).toISOString() : null,
      updatedAt: new Date(r.updated_at).toISOString(),
      message: r.message || '',
      suggestedColumn: r.suggested_column || 'manter',
      blocked: r.blocked === true,
      signature: r.signature || '',
    };
  }

  async function listRuns(limit = 120) {
    const lim = Math.max(1, Math.min(limit, 1000));
    const q = await pool.query(
      `SELECT task_id, run_id, assignee_agent_id, status, started_at, finished_at, updated_at, message, suggested_column, blocked, signature
       FROM ${TABLE}
       ORDER BY updated_at DESC
       LIMIT $1`,
      [lim]
    );
    return (q.rows || []).map((r) => ({
      taskId: r.task_id,
      runId: r.run_id,
      assigneeAgentId: r.assignee_agent_id || '',
      status: r.status,
      startedAt: new Date(r.started_at).toISOString(),
      finishedAt: r.finished_at ? new Date(r.finished_at).toISOString() : null,
      updatedAt: new Date(r.updated_at).toISOString(),
      message: r.message || '',
      suggestedColumn: r.suggested_column || 'manter',
      blocked: r.blocked === true,
      signature: r.signature || '',
    }));
  }

  return {
    backend: 'postgres',
    upsertRun,
    getRun,
    listRuns,
  };
}

export async function createTaskRunStorePgSafe(pool) {
  try {
    return await createTaskRunStorePg(pool);
  } catch (e) {
    logger.warn({ err: String(e?.message || e) }, 'task run pg store unavailable');
    throw e;
  }
}
