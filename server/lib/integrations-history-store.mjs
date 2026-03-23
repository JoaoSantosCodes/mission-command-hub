import fs from "fs";
import path from "path";

const MAX_SNAPSHOTS = 240;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

function normalizeItems(raw) {
  if (!Array.isArray(raw)) return [];
  const now = Date.now();
  return raw
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const generatedAt = String(item.generatedAt || "");
      const healthScore = Number(item.healthScore);
      const okCount = Number(item.okCount);
      const total = Number(item.total);
      const alerts = Array.isArray(item.alerts)
        ? item.alerts
            .map((a) => String(a || "").trim())
            .filter(Boolean)
            .slice(0, 12)
        : [];
      return {
        generatedAt,
        healthScore: Number.isFinite(healthScore) ? Math.max(0, Math.min(100, Math.round(healthScore))) : 0,
        okCount: Number.isFinite(okCount) ? Math.max(0, Math.round(okCount)) : 0,
        total: Number.isFinite(total) ? Math.max(0, Math.round(total)) : 0,
        alerts,
      };
    })
    .filter((item) => {
      const ts = Date.parse(item.generatedAt);
      return Number.isFinite(ts) && now - ts <= MAX_AGE_MS;
    });
}

export function loadIntegrationsHistory(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return normalizeItems(parsed?.items);
  } catch {
    return [];
  }
}

export function appendIntegrationsSnapshot(filePath, snapshot) {
  const existing = loadIntegrationsHistory(filePath);
  const merged = [...existing, snapshot].slice(-MAX_SNAPSHOTS);
  ensureDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify({ items: merged }, null, 2), "utf8");
  return merged;
}
