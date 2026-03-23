/**
 * Cria `MissionAgent/.env` a partir de `.env.ready` se `.env` ainda não existir.
 * Uso: npm run env:init (também em predev/prestart).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const target = path.join(root, ".env");
const src = path.join(root, ".env.ready");

if (fs.existsSync(target)) {
  process.exit(0);
}
if (!fs.existsSync(src)) {
  console.warn("[mission-agent] .env.ready não encontrado — ignora init-env.");
  process.exit(0);
}
fs.copyFileSync(src, target);
console.log(
  "[mission-agent] Criado .env a partir de .env.ready — edita e cola OPENAI_API_KEY ou MISSION_LLM_API_KEY; opcionalmente MISSION_LLM_BASE_URL / MISSION_LLM_MODEL."
);
