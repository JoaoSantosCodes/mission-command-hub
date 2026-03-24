import { logger } from "./logger.mjs";
import { hasDatabaseUrl, getPool } from "./pg-pool.mjs";
import { createTaskRunStoreFile } from "./task-run-store-file.mjs";
import { createTaskRunStorePgSafe } from "./task-run-store-pg.mjs";

export async function createTaskRunStoreAuto(filePath) {
  if (hasDatabaseUrl()) {
    try {
      const pool = getPool();
      return await createTaskRunStorePgSafe(pool);
    } catch (e) {
      logger.warn(
        { err: String(e?.message || e) },
        "PostgreSQL indisponível para task-runs — a usar ficheiro JSON"
      );
    }
  }
  return createTaskRunStoreFile(filePath);
}
