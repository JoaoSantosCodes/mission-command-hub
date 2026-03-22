/**
 * Pool PostgreSQL partilhado (opcional — só com DATABASE_URL).
 */
import pg from "pg";

const { Pool } = pg;

/** @type {import("pg").Pool | null} */
let pool = null;

export function getPool() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL não definido");
  }
  if (!pool) {
    pool = new Pool({
      connectionString: url,
      max: Number(process.env.PG_POOL_MAX || 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
    pool.on("error", (err) => {
      console.error("[mission-agent] PostgreSQL pool error:", err?.message || err);
    });
  }
  return pool;
}

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
