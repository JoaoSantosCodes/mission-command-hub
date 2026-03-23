/**
 * Resolve a pasta de agentes `.md` alinhada ao AIOX (framework-config.yaml § resource_locations).
 * Ordem: L1 framework → L2 project → L4 local (último ficheiro presente ganha em `agents_dir`).
 * Override absoluto: `AIOX_AGENTS_DIR`.
 */
import fs from "fs";
import path from "path";
import yaml from "js-yaml";

const DEFAULT_AGENTS_REL = ".aiox-core/development/agents";

function isPathUnderProject(projectRoot, candidatePath) {
  const root = path.resolve(projectRoot);
  const cand = path.resolve(candidatePath);
  const prefix = root.endsWith(path.sep) ? root : root + path.sep;
  return cand === root || cand.startsWith(prefix);
}

const CONFIG_LAYERS = [
  path.join(".aiox-core", "framework-config.yaml"),
  path.join(".aiox-core", "project-config.yaml"),
  path.join(".aiox-core", "local-config.yaml"),
];

/**
 * @param {string} aioxProjectRoot Raiz do projeto AIOX (pasta que contém `.aiox-core`)
 * @returns {string} Caminho absoluto da pasta de agentes
 */
export function resolveAioxAgentsDir(aioxProjectRoot) {
  const envAbs = process.env.AIOX_AGENTS_DIR?.trim();
  if (envAbs) return path.resolve(envAbs);

  const root = path.resolve(aioxProjectRoot);
  let rel = DEFAULT_AGENTS_REL;

  for (const relPath of CONFIG_LAYERS) {
    const fp = path.join(root, relPath);
    if (!fs.existsSync(fp)) continue;
    let doc;
    try {
      doc = yaml.load(fs.readFileSync(fp, "utf8"));
    } catch {
      continue;
    }
    const next = doc?.resource_locations?.agents_dir;
    if (typeof next === "string" && next.trim()) rel = next.trim();
  }

  const normalized = rel.replace(/\//g, path.sep);
  const resolved = path.isAbsolute(normalized)
    ? path.normalize(normalized)
    : path.resolve(root, normalized);
  if (!isPathUnderProject(root, resolved)) {
    return path.resolve(root, ...DEFAULT_AGENTS_REL.split("/"));
  }
  return resolved;
}
