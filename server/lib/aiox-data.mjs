/**
 * Leitura partilhada do aiox-core no disco (API Express + servidor MCP).
 */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

/** @param {string} missionRoot Raiz do pacote MissionAgent (pasta que contém server/) */
export function resolveAioxPaths(missionRoot) {
  const AIOX_ROOT = process.env.AIOX_CORE_PATH
    ? path.resolve(process.env.AIOX_CORE_PATH)
    : path.resolve(missionRoot, "..", "aiox-core");
  const AGENTS_DIR = path.join(AIOX_ROOT, ".aiox-core", "development", "agents");
  const AIOX_BIN = path.join(AIOX_ROOT, "bin", "aiox.js");
  return { AIOX_ROOT, AGENTS_DIR, AIOX_BIN };
}

export function readAgentFiles(agentsDir) {
  if (!fs.existsSync(agentsDir)) {
    return { ok: false, error: `Pasta de agentes não encontrada: ${agentsDir}`, agents: [] };
  }
  const names = fs.readdirSync(agentsDir, { withFileTypes: true });
  const agents = [];
  for (const d of names) {
    if (!d.isFile() || !d.name.endsWith(".md")) continue;
    const id = d.name.replace(/\.md$/i, "");
    const full = path.join(agentsDir, d.name);
    let title = id;
    try {
      const raw = fs.readFileSync(full, "utf8");
      const first = raw.split(/\r?\n/).find((l) => l.trim().startsWith("#"));
      if (first) title = first.replace(/^#+\s*/, "").trim().slice(0, 80);
    } catch {
      /* ignore */
    }
    agents.push({ id, file: d.name, title });
  }
  agents.sort((a, b) => a.id.localeCompare(b.id));
  return { ok: true, agents };
}

export function getAioxVersion(aioxRoot, aioxBin) {
  if (!fs.existsSync(aioxBin)) {
    return { ok: false, error: `CLI não encontrado: ${aioxBin}` };
  }
  try {
    const out = execFileSync(process.execPath, [aioxBin, "--version"], {
      encoding: "utf8",
      timeout: 15000,
      cwd: aioxRoot,
      env: { ...process.env },
    });
    return { ok: true, version: out.trim() };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

export const MAX_COMMAND_LEN = 4000;

export const COMMAND_FORWARD_HINT =
  "Comando registado. O motor real é a CLI/IDE AIOX — use `npx aiox-core doctor` no repositório aiox-core ou active um agente na tua IDE.";
