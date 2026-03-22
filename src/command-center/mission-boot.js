/**
 * Arranque da central (canvas + terminal) inspirada no OpenClaw — sem WebSocket nem voz;
 * liga-se aos agentes reais do aiox-core e ao feed da API.
 */
import * as terminal from "./terminal.js";
import * as mascot from "./mascot.js";
import * as office from "./office.js";

let rafId = null;
let lastTime = performance.now();
let running = false;
/** @type {Array<() => void>} */
const cleanup = [];

function frame(now) {
  if (!running) return;
  const dt = Math.min(now - lastTime, 100);
  lastTime = now;
  mascot.update(dt);
  office.update(dt);
  mascot.draw();
  office.draw();
  rafId = requestAnimationFrame(frame);
}

export function stopMissionCommandCenter() {
  running = false;
  if (rafId != null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  while (cleanup.length) {
    const fn = cleanup.pop();
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
  mascot.destroy();
  office.destroy();
  terminal.clear();
}

/**
 * @param {{ agentRows?: Array<{ id: string; title: string }>; onSelectAgent?: (id: string) => void }} opts
 */
export function startMissionCommandCenter(opts) {
  stopMissionCommandCenter();
  const { agentRows = [], onSelectAgent } = opts;
  running = true;

  terminal.init("terminal-output");
  mascot.init("mascot-canvas");
  office.init("office-canvas", {
    agents: agentRows.map((a) => ({ id: a.id, title: a.title })),
  });

  const bootLines = [
    ["[mission] Architecture Agents Hub — central", "system"],
    ["[mission] Mascote + escritório: OK", "info"],
    ["[mission] Métricas + tempo: API /api/aiox/metrics", "info"],
    ["[mission] Toca num agente para abrir o Markdown", "agent"],
  ];
  let bi = 0;
  function bootStep() {
    if (!running) return;
    if (bi < bootLines.length) {
      const [t, ty] = bootLines[bi];
      terminal.log(t, ty, true);
      bi++;
      setTimeout(bootStep, 280);
    }
  }
  bootStep();

  const mascotZone = document.getElementById("zone-mascot");
  const onMascotClick = () => {
    mascot.setEmotion("happy");
    setTimeout(() => mascot.setEmotion("idle"), 1200);
    terminal.log("[dica] Regista comandos na barra superior.", "system");
  };
  mascotZone?.addEventListener("click", onMascotClick);
  cleanup.push(() => mascotZone?.removeEventListener("click", onMascotClick));

  const officeCanvas = document.getElementById("office-canvas");
  const onOfficeClick = (e) => {
    if (!officeCanvas) return;
    const rect = officeCanvas.getBoundingClientRect();
    const id = office.getAgentAtPoint(e.clientX - rect.left, e.clientY - rect.top);
    if (!id) return;
    if (String(id).startsWith("demo-")) {
      terminal.log("[demo] Coloca ficheiros .md em aiox-core/…/agents/", "info");
      return;
    }
    onSelectAgent?.(id);
  };
  officeCanvas?.addEventListener("click", onOfficeClick);
  cleanup.push(() => officeCanvas?.removeEventListener("click", onOfficeClick));

  lastTime = performance.now();
  rafId = requestAnimationFrame(frame);
}

export { terminal };
