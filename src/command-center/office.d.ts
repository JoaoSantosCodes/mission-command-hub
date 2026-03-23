export function init(
  canvasId: string,
  options?: {
    agents?: Array<{ id: string; title?: string }>;
    brand?: Record<string, string>;
  }
): void;

export function destroy(): void;
export function update(dt: number): void;
export function draw(): void;

export function setAgentState(agentId: string, state: string, data?: Record<string, unknown>): void;
export function getAgentAtPoint(canvasX: number, canvasY: number): string | null;
export function setAgentHighlight(agentId: string | null | undefined, on: boolean): void;
export function setAgentSelectionCaption(agentId: string | null | undefined, text: string): void;
export function formatLatestFeedLineForAgent(
  agentId: string | null | undefined,
  logRows: Array<{ agent: string; action: string }>,
  agentRows: Array<{ id: string; title?: string }>
): string;
export function syncAgentsFromLogs(
  logRows: Array<{ agent: string; action: string; kind?: string; type?: string }>,
  agentRows: Array<{ id: string; title?: string }>
): void;
export function setAgentAccentOverrides(overridesMap: Record<string, string>): void;

export function setFishFoodState(state: {
  food: number;
  maxFood: number;
  mood: "feliz" | "normal" | "fome" | "critico" | string;
}): void;

export function getOfficeLayoutExportJSON(): string;
export function importOfficeLayoutFromJSON(jsonStr: string): boolean;
export function resetOfficeLayoutToDefaults(): void;
export function consumeSuppressOfficeClick(): boolean;

export function onVoiceStart(targetAgentId: string): void;
export function onTaskComplete(agentId: string): void;
