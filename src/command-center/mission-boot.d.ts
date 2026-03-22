export function stopMissionCommandCenter(): void;

export function startMissionCommandCenter(opts: {
  agentRows?: Array<{ id: string; title: string }>;
  onSelectAgent?: (id: string) => void;
}): void;

export const terminal: {
  log: (text: string, type?: string, animate?: boolean) => void;
  clear: () => void;
};
