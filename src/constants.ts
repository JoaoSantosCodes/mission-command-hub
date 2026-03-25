/** Alinhado a `MAX_COMMAND_LEN` em `server/lib/aiox-data.mjs` */
export const MAX_COMMAND_CHARS = 4000;

/** Polling da API quando o separador está visível (ms). `VITE_POLL_INTERVAL_MS` no .env */
export const POLL_INTERVAL_MS = (() => {
  const n = Number(import.meta.env.VITE_POLL_INTERVAL_MS);
  return Number.isFinite(n) && n >= 5000 ? Math.min(n, 300_000) : 12_000;
})();

/** Polling de fallback quando SSE está conectado (ms). `VITE_SSE_FALLBACK_POLL_MS` no .env */
export const SSE_FALLBACK_POLL_MS = (() => {
  const n = Number(import.meta.env.VITE_SSE_FALLBACK_POLL_MS);
  return Number.isFinite(n) && n >= 10_000 ? Math.min(n, 600_000) : 60_000;
})();
