/**
 * Leitura partilhada do aiox-core no disco (API Express + servidor MCP).
 */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { resolveAioxAgentsDir } from "./resolve-aiox-agents-dir.mjs";

/**
 * @param {string} missionRoot Raiz do pacote MissionAgent (pasta que contém server/)
 * @returns {{ AIOX_ROOT: string, AGENTS_DIR: string, AIOX_BIN: string }}
 * `AIOX_ROOT` — raiz do **projeto AIOX** (pasta com `.aiox-core`), não o pacote npm em si.
 */
export function resolveAioxPaths(missionRoot) {
  const AIOX_ROOT = process.env.AIOX_CORE_PATH
    ? path.resolve(process.env.AIOX_CORE_PATH)
    : path.resolve(missionRoot);
  const AGENTS_DIR = resolveAioxAgentsDir(AIOX_ROOT);
  const AIOX_BIN = path.join(AIOX_ROOT, "bin", "aiox.js");
  return { AIOX_ROOT, AGENTS_DIR, AIOX_BIN };
}

export function readAgentFiles(agentsDir) {
  try {
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
  } catch (e) {
    return {
      ok: false,
      error: `Erro ao ler pasta de agentes: ${String(e?.message || e)}`,
      agents: [],
    };
  }
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
  "Comando registado. O motor real é a CLI no aiox-core — usa `npx aiox-core doctor` no repositório ou activa um agente na IDE.";
