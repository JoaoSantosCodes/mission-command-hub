/**
 * Carrega variáveis de `MissionAgent/.env` e sobrescreve com `.env.local` (se existir).
 * Importar antes de `createBridgeApp` no Vite e no `server/index.mjs`.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const MISSION_ROOT = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(MISSION_ROOT, ".env"), quiet: true });
dotenv.config({ path: path.join(MISSION_ROOT, ".env.local"), override: true, quiet: true });
