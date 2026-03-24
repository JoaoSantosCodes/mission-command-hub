export const OFFICE_THEME_KEY = 'mission-agent-office-theme-v1';
export const OFFICE_THEME_CHANGED_EVENT = 'mission-agent-office-theme-changed';

export type OfficeTheme = 'default' | 'neon';

export function readOfficeTheme(): OfficeTheme {
  const raw = localStorage.getItem(OFFICE_THEME_KEY);
  return raw === 'neon' ? 'neon' : 'default';
}

export function writeOfficeTheme(next: OfficeTheme, opts?: { emit?: boolean }): void {
  localStorage.setItem(OFFICE_THEME_KEY, next === 'neon' ? 'neon' : 'default');
  if (opts?.emit !== false) {
    window.dispatchEvent(new CustomEvent(OFFICE_THEME_CHANGED_EVENT));
  }
}
