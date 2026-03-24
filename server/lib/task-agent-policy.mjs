/**
 * Policy de capacidades por agente para execução de tarefas.
 *
 * Formato env `MISSION_TASK_AGENT_ALLOWLIST`:
 *   "*:agentStep; aiox-master:agentStep,exec:doctor"
 *
 * Regras:
 * - ids de agente sem `@` (normalizado automaticamente)
 * - `*` define default
 * - capacidades válidas (MVP): `agentStep`, `exec:doctor`, `exec:info`, `*`
 */

const VALID_CAPS = new Set(['agentStep', 'exec:doctor', 'exec:info', '*']);

function normalizeAgentId(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  return s.replace(/^@+/, '');
}

function parseCaps(raw) {
  const out = new Set();
  const parts = String(raw || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  for (const p of parts) {
    if (VALID_CAPS.has(p)) out.add(p);
  }
  return out;
}

export function createTaskAgentPolicyFromEnv() {
  const raw = String(process.env.MISSION_TASK_AGENT_ALLOWLIST || '').trim();
  const rules = new Map();
  /** Default seguro e funcional: permite apenas `agentStep` (sem exec CLI). */
  let defaultCaps = new Set(['agentStep']);

  if (raw) {
    defaultCaps = new Set();
    const entries = raw
      .split(';')
      .map((x) => x.trim())
      .filter(Boolean);
    for (const entry of entries) {
      const idx = entry.indexOf(':');
      if (idx <= 0) continue;
      const who = normalizeAgentId(entry.slice(0, idx));
      const caps = parseCaps(entry.slice(idx + 1));
      if (who === '*') {
        defaultCaps = caps;
        continue;
      }
      if (!who) continue;
      rules.set(who, caps);
    }
  }

  return {
    raw,
    rules,
    defaultCaps,
  };
}

export function isTaskAgentCapabilityAllowed(policy, assigneeAgentId, capability) {
  const cap = String(capability || '').trim();
  if (!cap) return false;
  const who = normalizeAgentId(assigneeAgentId);
  const caps = (who && policy.rules.get(who)) || policy.defaultCaps;
  if (!caps || caps.size === 0) return false;
  if (caps.has('*')) return true;
  return caps.has(cap);
}

export function describeTaskAgentPolicy(policy) {
  const rows = [];
  for (const [agent, caps] of policy.rules.entries()) {
    rows.push(`${agent}:${[...caps].join(',')}`);
  }
  return {
    raw: policy.raw,
    defaults: [...(policy.defaultCaps || [])],
    rules: rows,
  };
}
