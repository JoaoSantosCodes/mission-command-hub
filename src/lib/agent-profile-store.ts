export const AGENT_PROFILE_KEY = 'mission-agent-profile-v1';
export const AGENT_PROFILE_CHANGED_EVENT = 'mission-agent-profile-changed';

export type AgentProfile = {
  displayName?: string;
  avatarIndex?: number;
  avatarOffsetX?: number;
  avatarOffsetY?: number;
  accentColor?: string;
};

function clampInt(v: unknown, min: number, max: number): number | undefined {
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
  return Math.max(min, Math.min(max, Math.round(v)));
}

function sanitizeProfile(v: AgentProfile): AgentProfile {
  return {
    displayName: (v.displayName || '').trim() || undefined,
    avatarIndex: clampInt(v.avatarIndex, 0, 5),
    avatarOffsetX: clampInt(v.avatarOffsetX, -6, 6),
    avatarOffsetY: clampInt(v.avatarOffsetY, -6, 6),
    accentColor: (v.accentColor || '').trim() || undefined,
  };
}

function loadProfilesMap(): Record<string, AgentProfile> {
  try {
    const raw = localStorage.getItem(AGENT_PROFILE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, AgentProfile>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveProfilesMap(next: Record<string, AgentProfile>): void {
  localStorage.setItem(AGENT_PROFILE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(AGENT_PROFILE_CHANGED_EVENT));
}

export function readAgentProfile(agentId: string): AgentProfile {
  return sanitizeProfile(loadProfilesMap()[agentId] ?? {});
}

export function writeAgentProfile(agentId: string, next: AgentProfile): void {
  const all = loadProfilesMap();
  all[agentId] = sanitizeProfile(next);
  saveProfilesMap(all);
}

export function readAllAgentProfiles(): Record<string, AgentProfile> {
  const raw = loadProfilesMap();
  const out: Record<string, AgentProfile> = {};
  for (const [k, v] of Object.entries(raw)) out[k] = sanitizeProfile(v || {});
  return out;
}

export function replaceAllAgentProfiles(
  next: Record<string, AgentProfile>,
  opts?: { emit?: boolean }
): void {
  const cleaned: Record<string, AgentProfile> = {};
  for (const [k, v] of Object.entries(next || {})) cleaned[k] = sanitizeProfile(v || {});
  localStorage.setItem(AGENT_PROFILE_KEY, JSON.stringify(cleaned));
  if (opts?.emit !== false) {
    window.dispatchEvent(new CustomEvent(AGENT_PROFILE_CHANGED_EVENT));
  }
}

export function pickDisplayName(agentId: string, title?: string): string {
  const p = readAgentProfile(agentId);
  return (p.displayName || title || agentId).trim();
}
