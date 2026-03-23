export function init(canvasId: string): void;
export function destroy(): void;
export function update(dt: number): void;
export function draw(): void;
export function setEmotion(
  newEmotion: "idle" | "listening" | "thinking" | "working" | "happy" | "error" | "sleeping"
): void;
export function setSpriteSheet(sheet: HTMLImageElement | null): void;

