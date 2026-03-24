import { logger } from './logger.mjs';
import { createActivityStore } from './activity-store.mjs';
import { hasDatabaseUrl, getPool } from './pg-pool.mjs';
import { createPgActivityStore } from './activity-store-pg.mjs';

/**
 * @param {string} filePath
 */
export async function createActivityStoreAuto(filePath) {
  if (hasDatabaseUrl()) {
    try {
      const pool = getPool();
      return await createPgActivityStore(pool);
    } catch (e) {
      logger.warn(
        { err: String(e?.message || e) },
        'PostgreSQL indisponível ou inválido — a usar ficheiro JSON para o feed'
      );
    }
  }
  return createActivityStore(filePath);
}
