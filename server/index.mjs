/**
 * API bridge: lê agentes do aiox-core no disco e expõe metadados + log de comandos.
 * Não substitui a CLI — espelha o que está instalado em AIOX_CORE_PATH.
 */
import "./load-env.mjs";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { resolveAioxPaths } from "./lib/aiox-data.mjs";
import { createBridgeApp } from "./create-app.mjs";
import { logger } from "./lib/logger.mjs";
import { closePool } from "./lib/pg-pool.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const { AIOX_ROOT } = resolveAioxPaths(ROOT);
const app = await createBridgeApp(ROOT);

const PORT = Number(process.env.PORT || 8787);
const isProd = process.env.NODE_ENV === "production";
const clientDist = path.join(ROOT, "dist");

if (isProd && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

const server = app.listen(PORT, () => {
  logger.info({ port: PORT, aioxRoot: AIOX_ROOT }, "mission-agent listening");
  if (!fs.existsSync(AIOX_ROOT)) {
    logger.warn(
      "AIOX project root not found; set AIOX_CORE_PATH to the folder that contains .aiox-core, or use MissionAgent/.aiox-core"
    );
  }
});

async function shutdown(signal) {
  logger.info({ signal }, "shutting down");
  await closePool();
  server.close(() => process.exit(0));
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
