import pino from "pino";

function resolveLevel() {
  if (process.env.LOG_LEVEL) return process.env.LOG_LEVEL;
  if (process.env.VITEST) return "silent";
  return "info";
}

export const logger = pino({
  level: resolveLevel(),
  base: { service: "mission-agent-bridge" },
});
