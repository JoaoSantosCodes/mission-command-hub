/**
 * express-rate-limit com resposta JSON consistente com o resto da API (`{ ok, error }`).
 */
import rateLimit from 'express-rate-limit';

/** @param {Record<string, unknown>} partial */
export function rateLimitJson(partial) {
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    ...partial,
    handler: (req, res, _next, opts) => {
      const rl = req.rateLimit;
      const retryAfterSec =
        rl?.resetTime != null
          ? Math.max(0, Math.ceil((rl.resetTime.getTime() - Date.now()) / 1000))
          : undefined;
      res.status(opts.statusCode ?? 429).json({
        ok: false,
        error: 'Demasiados pedidos; tenta novamente dentro de instantes.',
        ...(retryAfterSec !== undefined ? { retryAfterSec } : {}),
      });
    },
  });
}
