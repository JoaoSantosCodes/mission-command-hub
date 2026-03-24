import fs from 'fs';
import path from 'path';

/** @typedef {{ agents?: Record<string, any>, office?: Record<string, any> }} CustomizationPayload */

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

/** @param {string} filePath */
export function loadCustomizationFromFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { data: { agents: {}, office: {} }, revision: '0:0' };
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    const data = {
      agents: parsed?.agents && typeof parsed.agents === 'object' ? parsed.agents : {},
      office: parsed?.office && typeof parsed.office === 'object' ? parsed.office : {},
    };
    const st = fs.statSync(filePath);
    return { data, revision: `${st.mtimeMs}:${st.size}` };
  } catch {
    return { data: { agents: {}, office: {} }, revision: '0:0' };
  }
}

/** @param {string} filePath @param {CustomizationPayload} payload */
export function saveCustomizationAtomic(filePath, payload) {
  ensureDir(filePath);
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const normalized = {
    agents: payload?.agents && typeof payload.agents === 'object' ? payload.agents : {},
    office: payload?.office && typeof payload.office === 'object' ? payload.office : {},
  };
  fs.writeFileSync(tmp, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, filePath);
  const st = fs.statSync(filePath);
  return `${st.mtimeMs}:${st.size}`;
}
