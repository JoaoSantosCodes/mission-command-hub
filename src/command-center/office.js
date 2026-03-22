// Canvas — escritório Architecture Agents Hub / ponte aiox-core (agentes .md no disco)
// Features: wandering, huddles, tempo, métricas do host, kanban, celebrações

const PALETTE = {
  floor: '#1A1E2E', floorLine: '#222840', wall: '#12182A', wallAccent: '#1E3A5F',
  desk: '#3A2A1A', deskTop: '#4A3A2A', deskLeg: '#2A1A0A',
  monitorFrame: '#2A3A4E', monitorScreen: '#0A1520', monitorGlow: '#38BDF8',
  chair: '#2A2A3A', chairSeat: '#3A3A4A',
  plant: '#1A4A2A', plantPot: '#5A3A1A', plantLeaf: '#2A8A3A',
  whiteboard: '#E8E8E8', whiteboardFrame: '#8A8A9A',
  coolerBody: '#88AACC', coolerWater: '#44AAFF',
  bookshelfWood: '#5A3A1A', serverRack: '#2A3040',
  filingCabinet: '#4A4A5A', filingHandle: '#8A8A9A',
  coffeeMachine: '#3A3A3A', coffeeLight: '#FF4422',
  roundTable: '#5A4A3A', roundTableTop: '#6A5A4A',
  sofa: '#4A3A5A', sofaCushion: '#5A4A6A', sofaArm: '#3A2A4A',
};

const PX = 5;

let canvas, ctx;
let agents = [];
let tick = 0;
let highlightedAgent = null;
let officeResizeHandler = null;

/** Valores por defeito (Architecture Agents Hub) — merge em init() */
const DEFAULT_OFFICE_BRAND = {
  whiteboardTitle: 'PONTE HUB',
  boardCols: ['LIVRE', 'ATIVO', 'FEITO'],
  bossDeskLabel: 'HUB',
  wallTagline: 'ARCH. AGENTS HUB',
  wallSub: 'aiox-core · agentes .md',
  sofaLabel: 'PAUSA',
  rackLabel: 'HOST',
  statsSession: 'sessão',
  statsDoneSuffix: 'feitos',
};

/** @type {typeof DEFAULT_OFFICE_BRAND} */
let OFFICE_BRAND = { ...DEFAULT_OFFICE_BRAND };

// External data
let weather = { temp_c: '--', desc: 'Loading...', code: 0 };
let health = { cpu_pct: 0, mem_pct: 0, disk_pct: 0, temp_c: 0, uptime: 0 };
let weatherFetchTimer = 0;
let healthFetchTimer = 0;

// Clock chime
let lastChimeHour = -1;
let chimeFlashTimer = 0;

// Voice reaction
let voiceReactionTimer = 0;
let voiceReactionTarget = null;

// Post-task celebration
let celebrationAgent = null;
let celebrationTimer = 0;

// Whiteboard kanban tracking
let kanbanTasks = { doing: [], done: [] };
let sessionStats = { exchanges: 0, tasksCompleted: 0, startTime: Date.now() };

// Ambient sound system
let audioCtx = null;
let soundCooldowns = { click: 0, ding: 0, chime: 0 };

// Furniture positions
const FURNITURE = {
  waterCooler:  { xPct: 0.07, yPct: 0.52 },
  bookshelf:    { xPct: 0.93, yPct: 0.48 },
  serverRack:   { xPct: 0.07, yPct: 0.78 },
  coffeeMachine:{ xPct: 0.93, yPct: 0.75 },
  roundTable:   { xPct: 0.50, yPct: 0.62 },
  sofa:         { xPct: 0.50, yPct: 0.88 },
};

// Per-agent wander preferences (personality)
/** @type {Record<string, { targets: string[]; checkDesks: boolean }>} */
let AGENT_WANDER_PREFS = {};

function defaultWanderPrefs(agentId, index, isBoss) {
  if (isBoss || isMasterAgent(agentId)) {
    return { targets: ['waterCooler', 'coffeeMachine', 'sofa'], checkDesks: true };
  }
  const sets = [
    { targets: ['serverRack', 'coffeeMachine', 'serverRack', 'sofa'], checkDesks: false },
    { targets: ['bookshelf', 'bookshelf', 'waterCooler', 'sofa'], checkDesks: false },
  ];
  return sets[index % sets.length];
}

const WANDER_THOUGHTS = {
  waterCooler: ['Pausa…', 'Hidratar', 'Água'],
  bookshelf: ['Ler .md', 'docs aiox', 'SYSTEM.md'],
  serverRack: ['/api/health', 'métricas', 'Node OK'],
  coffeeMachine: ['Café', 'Combustível', 'Break'],
  roundTable: ['Sync equipa', 'Ponte API', 'Alinhar'],
  sofa: ['Descanso', 'Respirar', 'Sesta'],
  checkDesk: ['Revê agente', 'Tudo OK?', 'Alinhamento'],
};

// Huddle
let huddleState = 'idle';
let huddleTimer = 15000 + Math.random() * 20000;
let huddleMeetingTimer = 0;
const huddleTopics = [
  ['npx aiox', 'agentes .md', 'bridge OK'],
  ['Cursor IDE', 'feed', 'PostgreSQL?'],
  ['CLI doctor', 'info', 'versão'],
  ['Architecture Agents Hub', 'hub', 'deploy'],
  ['OpenAPI', 'Notion', 'docs'],
];
let huddleTopicIndex = 0;

// --- Init & Data Fetching ---

/**
 * @param {string} canvasId
 * @param {{
 *   agents?: Array<{ id: string; title?: string }>;
 *   brand?: Partial<typeof DEFAULT_OFFICE_BRAND>;
 * }} [options]
 */
export function init(canvasId, options = {}) {
  canvas = document.getElementById(canvasId);
  ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  resize();
  officeResizeHandler = resize;
  window.addEventListener('resize', officeResizeHandler);

  const incoming = Array.isArray(options.agents) ? options.agents : [];
  const colors = ['#FFD700', '#00DDFF', '#AA66FF', '#FF8866', '#66FFAA', '#FF66AA', '#AAFF66', '#66AAFF'];

  if (incoming.length === 0) {
    const demoSeats = computeDeskSlots(3);
    agents = [
      createAgent('demo-1', demoSeats[0].x, demoSeats[0].y, colors[0], 'Orchestrator', true),
      createAgent('demo-2', demoSeats[1].x, demoSeats[1].y, colors[1], 'Agente A', false),
      createAgent('demo-3', demoSeats[2].x, demoSeats[2].y, colors[2], 'Agente B', false),
    ];
  } else {
    const rawSlots = computeDeskSlots(incoming.length);
    const slots = repositionMasterSlot(incoming, rawSlots);
    agents = incoming.map((a, i) => {
      const label = (a.title || a.id || `agent-${i}`).slice(0, 14);
      const boss = isMasterAgent(a.id);
      const c = boss ? '#FFD700' : colors[i % colors.length];
      const s = slots[i];
      return createAgent(a.id, s.x, s.y, c, label, boss);
    });
  }

  AGENT_WANDER_PREFS = {};
  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    AGENT_WANDER_PREFS[a.id] = defaultWanderPrefs(a.id, i, a.isBoss);
  }

  OFFICE_BRAND = {
    ...DEFAULT_OFFICE_BRAND,
    ...(options.brand || {}),
  };
  const boss = agents.find((a) => a.isBoss);
  if (boss?.label) {
    OFFICE_BRAND.bossDeskLabel = String(boss.label).slice(0, 10).toUpperCase();
  }

  fetchWeather();
  fetchHealth();
}

export function destroy() {
  if (officeResizeHandler) {
    window.removeEventListener('resize', officeResizeHandler);
    officeResizeHandler = null;
  }
  canvas = null;
  ctx = null;
  agents = [];
  OFFICE_BRAND = { ...DEFAULT_OFFICE_BRAND };
}

function resize() {
  const rect = canvas.parentElement.getBoundingClientRect();
  const headerH = canvas.parentElement.querySelector('.zone-header')?.offsetHeight || 24;
  canvas.width = rect.width;
  canvas.height = rect.height - headerH;
}

function createAgent(id, xPct, yPct, color, label, isBoss) {
  return {
    id, homeX: xPct, homeY: yPct, xPct, yPct, color, label, isBoss,
    state: 'idle', wanderState: 'at_desk', wanderTarget: null,
    wanderTimer: randomWanderDelay(), wanderIdleTimer: 0,
    stateTimer: 0, animFrame: 0, thoughtText: '', typingDots: 0,
    walkPhase: 0, facingRight: true, lookUp: false, celebrating: false,
  };
}

function randomWanderDelay() { return 8000 + Math.random() * 7000; }

/** Agente orquestrador (destaque visual) — id típico: aiox-master */
function isMasterAgent(id) {
  const s = String(id || '')
    .toLowerCase()
    .replace(/\.md$/i, '');
  return s === 'aiox-master' || s.endsWith('aiox-master') || /^aiox[-_]master$/.test(s);
}

/**
 * Coloca o master no centro da 1.ª fila (mais visível que canto esquerdo).
 * @template T
 * @param {Array<{ id: string }>} incoming
 * @param {T[]} slots
 * @returns {T[]}
 */
function repositionMasterSlot(incoming, slots) {
  const mi = incoming.findIndex((a) => isMasterAgent(a.id));
  if (mi < 0) return slots;
  const n = incoming.length;
  const inRow0 = Math.min(4, n);
  const centerIdx = Math.floor((inRow0 - 1) / 2);
  if (mi === centerIdx) return slots;
  const out = slots.slice();
  [out[mi], out[centerIdx]] = [out[centerIdx], out[mi]];
  return out;
}

/** Até 4 secretárias por fila; filas empilhadas em Y para caber todos os .md do disco */
function computeDeskSlots(n) {
  if (n <= 0) return [];
  const MAX_COLS = 4;
  const slots = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / MAX_COLS);
    const col = i % MAX_COLS;
    const inRow = Math.min(MAX_COLS, n - row * MAX_COLS);
    const t = inRow === 1 ? 0.5 : (col + 1) / (inRow + 1);
    const x = 0.08 + t * 0.84;
    const y = 0.13 + row * 0.21;
    slots.push({ x, y, boss: i === 0 });
  }
  return slots;
}

/** Posições à volta da mesa redonda (reunião) para N agentes */
function huddleSeatPositions(n) {
  if (n <= 0) return [];
  const cx = FURNITURE.roundTable.xPct;
  const cy = FURNITURE.roundTable.yPct;
  const rx = 0.085;
  const ry = 0.052;
  const seats = [];
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    seats.push({
      x: cx + Math.cos(angle) * rx,
      y: cy + Math.sin(angle) * ry + 0.02,
    });
  }
  return seats;
}

async function fetchWeather() {
  try {
    const r = await fetch('/api/aiox/weather');
    if (r.ok) weather = await r.json();
  } catch (e) {}
}
async function fetchHealth() {
  try {
    const r = await fetch('/api/aiox/metrics');
    if (r.ok) health = await r.json();
  } catch (e) {}
}

// --- Public API ---

export function setAgentState(agentId, state, data = {}) {
  const agent = agents.find(a => a.id === agentId);
  if (!agent) return;
  agent.state = state;
  agent.stateTimer = 0;
  agent.thoughtText = data.status || data.message || data.tool || '';
  if (state === 'thinking' || state === 'working') {
    // Kanban: add to doing
    if (!kanbanTasks.doing.find(t => t.agentId === agentId)) {
      kanbanTasks.doing.push({ agentId, label: agent.label, text: agent.thoughtText || state, time: Date.now() });
    }
    if (agent.wanderState !== 'at_desk') { agent.wanderState = 'walking_back'; agent.wanderTarget = null; }
    if (huddleState === 'meeting' || huddleState === 'gathering') huddleState = 'dispersing';
  } else if (state === 'talking') {
    // Kanban: move from doing to done
    const idx = kanbanTasks.doing.findIndex(t => t.agentId === agentId);
    if (idx !== -1) {
      const task = kanbanTasks.doing.splice(idx, 1)[0];
      kanbanTasks.done.push({ ...task, text: truncate(agent.thoughtText || 'done', 8), doneTime: Date.now() });
      sessionStats.tasksCompleted++;
      playTaskDing();
    }
    sessionStats.exchanges++;
    if (kanbanTasks.done.length > 6) kanbanTasks.done.shift();
  }
}

export function getAgentAtPoint(canvasX, canvasY) {
  let bestId = null;
  let bestD = Infinity;
  for (const agent of agents) {
    const ax = agent.xPct * canvas.width;
    const ay = agent.yPct * canvas.height;
    const dx = canvasX - ax;
    const dy = canvasY - ay;
    const d = dx * dx + dy * dy;
    const hitR = agent.isBoss ? 62 : 52;
    if (d < hitR * hitR && d < bestD) {
      bestD = d;
      bestId = agent.id;
    }
  }
  return bestId;
}

export function setAgentHighlight(agentId, on) { highlightedAgent = on ? agentId : null; }

// All agents look up when voice recording starts
export function onVoiceStart(targetAgentId) {
  voiceReactionTimer = 1200; // look up for 1.2s
  voiceReactionTarget = targetAgentId;
  for (const a of agents) a.lookUp = true;
}

// Post-task celebration
export function onTaskComplete(agentId) {
  celebrationAgent = agentId;
  celebrationTimer = 2000; // 2s celebration
  const agent = agents.find(a => a.id === agentId);
  if (agent) agent.celebrating = true;
}

// --- Update ---

export function update(dt) {
  tick += dt;
  const t = tick / 1000;

  // Fetch timers
  weatherFetchTimer += dt;
  healthFetchTimer += dt;
  if (weatherFetchTimer > 300000) { weatherFetchTimer = 0; fetchWeather(); }
  if (healthFetchTimer > 10000) { healthFetchTimer = 0; fetchHealth(); } // every 10s

  // Sound cooldowns
  for (const key in soundCooldowns) { if (soundCooldowns[key] > 0) soundCooldowns[key] -= dt; }

  // Ambient keyboard clicks when agents are working
  if (agents.some(a => a.state === 'working')) playKeyClick();

  // Clock chime
  const curHour = new Date().getHours();
  if (curHour !== lastChimeHour) {
    lastChimeHour = curHour;
    chimeFlashTimer = 1500; // flash for 1.5s
    playHourChime();
  }
  if (chimeFlashTimer > 0) chimeFlashTimer -= dt;

  // Voice reaction decay
  if (voiceReactionTimer > 0) {
    voiceReactionTimer -= dt;
    if (voiceReactionTimer <= 0) { for (const a of agents) a.lookUp = false; }
  }

  // Celebration decay
  if (celebrationTimer > 0) {
    celebrationTimer -= dt;
    if (celebrationTimer <= 0) {
      for (const a of agents) a.celebrating = false;
      celebrationAgent = null;
    }
  }

  for (const agent of agents) {
    agent.stateTimer += dt;
    agent.animFrame = Math.floor(t * 4) % 4;
    if (agent.state === 'working') agent.typingDots = Math.floor(t * 8) % 4;
  }

  updateHuddle(dt);
  for (const agent of agents) {
    if (huddleState === 'idle' || huddleState === 'dispersing') updateWander(agent, dt);
  }
}

// --- Huddle ---

function updateHuddle(dt) {
  const allIdle = agents.every(a => a.state === 'idle');
  switch (huddleState) {
    case 'idle':
      if (!allIdle) { huddleTimer = 15000 + Math.random() * 20000; return; }
      huddleTimer -= dt;
      if (huddleTimer <= 0) {
        huddleState = 'gathering';
        huddleTopicIndex = (huddleTopicIndex + 1) % huddleTopics.length;
        const seats = huddleSeatPositions(agents.length);
        agents.forEach((a, i) => {
          a.wanderState = 'walking_to'; a.wanderTarget = '__huddle__'; a._huddleSeat = seats[i];
          a.thoughtText = WANDER_THOUGHTS.roundTable[Math.floor(Math.random() * WANDER_THOUGHTS.roundTable.length)];
        });
      }
      break;
    case 'gathering': {
      if (!allIdle) { huddleState = 'dispersing'; break; }
      let allArrived = true;
      for (const a of agents) {
        if (a.wanderTarget === '__huddle__' && a._huddleSeat) {
          if (!moveToward(a, a._huddleSeat.x, a._huddleSeat.y, 0.00018, dt)) allArrived = false;
          a.walkPhase += dt * 0.005;
        }
      }
      if (allArrived) {
        huddleState = 'meeting'; huddleMeetingTimer = 5000 + Math.random() * 4000;
        const topics = huddleTopics[huddleTopicIndex];
        agents.forEach((a, i) => { a.wanderState = 'idle_at_furniture'; a.thoughtText = topics[i % topics.length]; a.facingRight = a.xPct < FURNITURE.roundTable.xPct; });
      }
      break;
    }
    case 'meeting':
      if (!allIdle) { huddleState = 'dispersing'; break; }
      huddleMeetingTimer -= dt;
      if (huddleMeetingTimer > 0 && Math.floor(tick / 2000) % 2 === 0) {
        const topics = huddleTopics[huddleTopicIndex];
        agents.forEach((a, i) => { a.thoughtText = topics[(i + Math.floor(tick / 2000)) % topics.length]; });
      }
      if (huddleMeetingTimer <= 0) huddleState = 'dispersing';
      break;
    case 'dispersing':
      for (const a of agents) { if (a.wanderState !== 'at_desk') { a.wanderState = 'walking_back'; a.wanderTarget = null; a.thoughtText = ''; } }
      if (agents.every(a => a.wanderState === 'at_desk')) { huddleState = 'idle'; huddleTimer = 20000 + Math.random() * 25000; }
      for (const a of agents) {
        if (a.wanderState === 'walking_back') {
          if (moveToward(a, a.homeX, a.homeY, 0.00018, dt)) { a.wanderState = 'at_desk'; a.wanderTimer = randomWanderDelay(); a.thoughtText = ''; }
          a.walkPhase += dt * 0.005;
        }
      }
      break;
  }
}

// --- Personality Wandering ---

function updateWander(agent, dt) {
  if (agent.state !== 'idle') {
    if (agent.wanderState === 'at_desk') return;
    if (agent.wanderState === 'walking_to' || agent.wanderState === 'idle_at_furniture') agent.wanderState = 'walking_back';
  }
  const speed = agent.wanderState === 'walking_back' && agent.state !== 'idle' ? 0.00025 : 0.00012;

  switch (agent.wanderState) {
    case 'at_desk':
      if (agent.state !== 'idle') { agent.wanderTimer = randomWanderDelay(); return; }
      agent.wanderTimer -= dt;
      if (agent.wanderTimer <= 0) {
        const prefs = AGENT_WANDER_PREFS[agent.id] ?? {
          targets: ['waterCooler', 'coffeeMachine'],
          checkDesks: false,
        };
        const hour = new Date().getHours();

        // Time-aware behavior: morning coffee, afternoon slump, late night
        if (hour >= 7 && hour < 9 && Math.random() < 0.5) {
          agent.wanderTarget = 'coffeeMachine';
          agent.wanderState = 'walking_to';
          agent.thoughtText = ['Café da manhã', 'Bica!', 'Primeiro café', 'Combustível'][Math.floor(Math.random() * 4)];
          break;
        }
        if (hour >= 14 && hour < 16 && Math.random() < 0.35) {
          agent.wanderTarget = 'sofa';
          agent.wanderState = 'walking_to';
          agent.thoughtText = ['Bateria baixa…', 'Sesta rápida', 'Pausa', 'Pós-almoço'][Math.floor(Math.random() * 4)];
          break;
        }
        if ((hour >= 21 || hour < 7) && Math.random() < 0.6) {
          agent.wanderTimer = randomWanderDelay();
          agent.thoughtText = '';
          break; // Late night: stay at desk more often
        }

        // Chefe às vezes vai à secretária de outro agente
        if (prefs.checkDesks && Math.random() < 0.3) {
          const others = agents.filter((a) => a.id !== agent.id);
          if (others.length > 0) {
            const other = others[Math.floor(Math.random() * others.length)];
            agent.wanderTarget = '__desk_' + other.id;
            agent.wanderState = 'walking_to';
            agent._checkDeskTarget = { x: other.homeX + 0.04, y: other.homeY + 0.02 };
            agent.thoughtText = WANDER_THOUGHTS.checkDesk[Math.floor(Math.random() * WANDER_THOUGHTS.checkDesk.length)];
          } else {
            const target = prefs.targets[Math.floor(Math.random() * prefs.targets.length)];
            agent.wanderTarget = target;
            agent.wanderState = 'walking_to';
            const thoughts = WANDER_THOUGHTS[target] || ['...'];
            agent.thoughtText = thoughts[Math.floor(Math.random() * thoughts.length)];
          }
        } else {
          const target = prefs.targets[Math.floor(Math.random() * prefs.targets.length)];
          agent.wanderTarget = target;
          agent.wanderState = 'walking_to';
          const thoughts = WANDER_THOUGHTS[target] || ['...'];
          agent.thoughtText = thoughts[Math.floor(Math.random() * thoughts.length)];
        }
      }
      break;
    case 'walking_to': {
      let dest;
      if (agent.wanderTarget?.startsWith('__desk_')) {
        dest = agent._checkDeskTarget;
      } else {
        dest = FURNITURE[agent.wanderTarget];
      }
      if (!dest) { agent.wanderState = 'at_desk'; break; }
      const arrived = moveToward(agent, dest.xPct || dest.x, dest.yPct || dest.y, speed, dt);
      agent.walkPhase += dt * 0.005;
      if (arrived) { agent.wanderState = 'idle_at_furniture'; agent.wanderIdleTimer = 3000 + Math.random() * 4000; }
      break;
    }
    case 'idle_at_furniture':
      agent.wanderIdleTimer -= dt;
      if (agent.wanderIdleTimer <= 0) { agent.wanderState = 'walking_back'; agent.thoughtText = ''; }
      break;
    case 'walking_back': {
      const arrived = moveToward(agent, agent.homeX, agent.homeY, speed, dt);
      agent.walkPhase += dt * 0.005;
      if (arrived) { agent.wanderState = 'at_desk'; agent.wanderTimer = randomWanderDelay(); agent.thoughtText = ''; }
      break;
    }
  }
}

function moveToward(agent, targetX, targetY, speed, dt) {
  const dx = targetX - agent.xPct, dy = targetY - agent.yPct;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.005) { agent.xPct = targetX; agent.yPct = targetY; return true; }
  const step = speed * dt;
  if (step >= dist) { agent.xPct = targetX; agent.yPct = targetY; return true; }
  agent.xPct += (dx / dist) * step; agent.yPct += (dy / dist) * step;
  agent.facingRight = dx > 0;
  return false;
}

// --- Draw ---

export function draw() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const isNight = isNightTime();
  drawRoom(isNight);

  // Weather ambiance
  if (weather.code >= 300 && weather.code < 600) drawRainEffect();

  for (const a of agents) drawWorkstation(a);

  drawWaterCooler(); drawBookshelf(); drawServerRack(); drawCoffeeMachine();
  drawRoundTable(); drawFilingCabinet(); drawSofa();
  drawDigitalClock(); drawWeatherWidget(); drawWhiteboard();

  const sorted = [...agents].sort((a, b) => a.yPct - b.yPct);
  for (const a of sorted) {
    const isWalking = a.wanderState === 'walking_to' || a.wanderState === 'walking_back';
    isWalking ? drawWalkingAgent(a) : drawAgent(a);
    drawStateIndicator(a);
    if (highlightedAgent === a.id) drawHighlight(a);
  }

  // Night overlay
  if (isNight) {
    ctx.fillStyle = 'rgba(0, 0, 20, 0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function isNightTime() {
  const h = new Date().getHours();
  return h < 7 || h >= 21;
}

// --- Room ---

function drawRoom(isNight) {
  const w = canvas.width, h = canvas.height, wallH = h * 0.32;

  ctx.fillStyle = PALETTE.wall; ctx.fillRect(0, 0, w, wallH);
  ctx.fillStyle = PALETTE.wallAccent; ctx.fillRect(0, wallH - PX, w, PX);
  ctx.fillStyle = PALETTE.floor; ctx.fillRect(0, wallH, w, h - wallH);
  ctx.fillStyle = PALETTE.floorLine;
  for (let y = wallH; y < h; y += PX * 8) ctx.fillRect(0, y, w, 1);
  for (let x = 0; x < w; x += PX * 12) ctx.fillRect(x, wallH, 1, h - wallH);

  // Whiteboard frame (content drawn by drawWhiteboard)
  const wbW = PX * 28, wbH = PX * 13, wbX = Math.floor(w * 0.50) - wbW / 2, wbY = PX * 2;
  ctx.fillStyle = PALETTE.whiteboardFrame; ctx.fillRect(wbX - PX, wbY - PX, wbW + PX * 2, wbH + PX * 2);
  ctx.fillStyle = PALETTE.whiteboard; ctx.fillRect(wbX, wbY, wbW, wbH);

  drawPlant(w * 0.16, wallH - PX); drawPlant(w * 0.84, wallH - PX);

  // Ceiling lights (dimmer at night)
  const lightAlpha = isNight ? 0.5 : 1;
  for (const lx of [w * 0.25, w * 0.50, w * 0.75]) {
    ctx.fillStyle = '#2A2E3A'; ctx.fillRect(lx - PX * 2, 0, PX * 4, PX * 2);
    ctx.save(); ctx.globalAlpha = lightAlpha;
    ctx.fillStyle = '#FFEE88'; ctx.fillRect(lx - PX, PX * 2, PX * 2, PX);
    ctx.fillStyle = `rgba(255, 238, 136, ${isNight ? 0.01 : 0.02})`;
    ctx.beginPath(); ctx.moveTo(lx - PX, PX * 3); ctx.lineTo(lx - PX * 12, wallH);
    ctx.lineTo(lx + PX * 12, wallH); ctx.lineTo(lx + PX, PX * 3); ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = '#3D5A80'; ctx.font = `bold ${PX * 2}px VT323`; ctx.textAlign = 'left';
  ctx.fillText(OFFICE_BRAND.wallTagline, PX * 2, wallH * 0.38);
  ctx.fillStyle = '#5A6580'; ctx.font = `${PX * 1.3}px VT323`;
  ctx.fillText(OFFICE_BRAND.wallSub, PX * 2, wallH * 0.55);
  ctx.textAlign = 'start';
}

function drawRainEffect() {
  ctx.fillStyle = 'rgba(100, 150, 200, 0.08)';
  const w = canvas.width, h = canvas.height * 0.32;
  for (let i = 0; i < 12; i++) {
    const rx = ((tick / 3 + i * 47) % w);
    const ry = ((tick / 2 + i * 31) % h);
    ctx.fillRect(rx, ry, 1, PX * 2);
  }
}

function drawPlant(x, groundY) {
  ctx.fillStyle = PALETTE.plantPot;
  for (let i = -1; i <= 1; i++) pixel(x + i * PX, groundY - PX * 3, PX);
  for (let i = -2; i <= 2; i++) pixel(x + i * PX, groundY - PX * 2, PX);
  ctx.fillStyle = PALETTE.plantLeaf;
  const sway = Math.sin(tick / 1000 * 0.5) * PX * 0.5;
  pixel(x + sway, groundY - PX * 5, PX); pixel(x - PX + sway, groundY - PX * 4, PX);
  pixel(x + PX + sway, groundY - PX * 4, PX); pixel(x - PX * 2 + sway, groundY - PX * 5, PX);
  pixel(x + PX * 2 + sway, groundY - PX * 5, PX);
  ctx.fillStyle = PALETTE.plant; pixel(x + sway, groundY - PX * 4, PX); pixel(x + sway, groundY - PX * 6, PX);
}

// --- Wall Widgets ---

function drawDigitalClock() {
  const w = canvas.width, x = Math.floor(w * 0.18), y = PX * 3;
  const boxW = PX * 14, boxH = PX * 7;

  ctx.fillStyle = '#1A1E2E'; ctx.fillRect(x - PX, y - PX, boxW + PX * 2, boxH + PX * 2);

  // Chime flash
  const isChiming = chimeFlashTimer > 0;
  ctx.fillStyle = isChiming ? '#002200' : '#0A0E1A';
  ctx.fillRect(x, y, boxW, boxH);

  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0'), m = String(now.getMinutes()).padStart(2, '0'), s = String(now.getSeconds()).padStart(2, '0');
  const blink = Math.floor(tick / 500) % 2 === 0;

  ctx.fillStyle = isChiming ? '#44FF88' : '#00FF66';
  ctx.font = `bold ${PX * 4.5}px VT323`; ctx.textAlign = 'center';
  ctx.fillText(`${h}${blink ? ':' : ' '}${m}`, x + boxW / 2, y + PX * 4.5);
  ctx.fillStyle = '#00CC52'; ctx.font = `${PX * 2}px VT323`;
  ctx.fillText(s, x + boxW / 2, y + PX * 6.2);

  const days = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
  const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  ctx.fillStyle = '#5A6580'; ctx.font = `${PX * 1.5}px VT323`;
  ctx.fillText(`${days[now.getDay()]} ${months[now.getMonth()]} ${now.getDate()}`, x + boxW / 2, y + boxH + PX * 1.5);
  ctx.textAlign = 'start';
}

function drawWeatherWidget() {
  const w = canvas.width, x = Math.floor(w * 0.82) - PX * 7, y = PX * 3;
  const boxW = PX * 14, boxH = PX * 7;

  ctx.fillStyle = '#1A1E2E'; ctx.fillRect(x - PX, y - PX, boxW + PX * 2, boxH + PX * 2);
  ctx.fillStyle = '#0A0E1A'; ctx.fillRect(x, y, boxW, boxH);

  const code = weather.code, cx = x + PX * 3, cy = y + PX * 3;
  if (code >= 200 && code < 300) { drawWeatherCloud(cx, cy, '#888'); ctx.fillStyle = '#FFCC00'; pixel(cx, cy + PX * 1.5, PX * 0.7); }
  else if (code >= 300 && code < 600) { drawWeatherCloud(cx, cy, '#88AACC'); ctx.fillStyle = '#44AAFF'; for (let i = 0; i < 3; i++) pixel(cx - PX + i * PX, cy + PX + ((tick / 300 + i * 0.7) % 2) * PX, PX * 0.5); }
  else if (code >= 800 && code <= 802) { ctx.fillStyle = '#FFCC44'; ctx.beginPath(); ctx.arc(cx, cy, PX * 1.5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#FFE066'; for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + tick / 3000; pixel(cx + Math.cos(a) * PX * 2.5, cy + Math.sin(a) * PX * 2.5, PX * 0.5); } }
  else { drawWeatherCloud(cx, cy, '#AABBCC'); }

  ctx.fillStyle = '#00DDFF'; ctx.font = `bold ${PX * 3.5}px VT323`; ctx.textAlign = 'center';
  ctx.fillText(`${weather.temp_c}\u00B0C`, x + boxW / 2 + PX * 2, y + PX * 4);
  ctx.fillStyle = '#5A6580'; ctx.font = `${PX * 1.5}px VT323`;
  ctx.fillText((weather.desc || '').slice(0, 10), x + boxW / 2, y + PX * 6);
  ctx.fillText(weather.location || 'Weather', x + boxW / 2, y + boxH + PX * 1.5);
  ctx.textAlign = 'start';
}

function drawWeatherCloud(cx, cy, color) {
  ctx.fillStyle = color;
  pixel(cx - PX, cy - PX * 0.5, PX); pixel(cx, cy - PX, PX); pixel(cx + PX, cy - PX * 0.5, PX);
  pixel(cx - PX * 1.5, cy, PX); pixel(cx - PX * 0.5, cy, PX); pixel(cx + PX * 0.5, cy, PX); pixel(cx + PX * 1.5, cy, PX);
}

function drawWhiteboard() {
  const w = canvas.width;
  const wbW = PX * 28, wbH = PX * 13;
  const wbX = Math.floor(w * 0.50) - wbW / 2, wbY = PX * 2;

  // Header
  ctx.fillStyle = '#555';
  ctx.font = `bold ${PX * 1.8}px VT323`; ctx.textAlign = 'center';
  ctx.fillText(OFFICE_BRAND.whiteboardTitle, wbX + wbW / 2, wbY + PX * 1.8);
  ctx.fillStyle = '#CCCCCC';
  ctx.fillRect(wbX + PX, wbY + PX * 2.2, wbW - PX * 2, 1);

  // 3 kanban columns
  const colW = Math.floor((wbW - PX * 2) / 3);
  const colY = wbY + PX * 3;
  const headers = OFFICE_BRAND.boardCols;
  const hColors = ['#2A8A3A', '#CC8800', '#3A3ADA'];
  const stateColors = { idle: '#00FF66', thinking: '#FFCC00', working: '#AA66FF', talking: '#00DDFF' };

  for (let c = 0; c < 3; c++) {
    const cx = wbX + PX + c * colW;
    if (c > 0) { ctx.fillStyle = '#CCCCCC'; ctx.fillRect(cx, colY - PX * 0.5, 1, PX * 7); }
    ctx.fillStyle = hColors[c]; ctx.font = `bold ${PX * 1.3}px VT323`; ctx.textAlign = 'center';
    ctx.fillText(headers[c], cx + colW / 2, colY + PX * 0.3);
  }

  const idleAgents = agents.filter((a) => a.state === 'idle');
  const busyAgents = agents.filter((a) => a.state !== 'idle');
  const maxKanbanRows = 6;
  const rowStep = agents.length > 8 ? PX * 1.25 : PX * 1.6;

  // Column 1: IDLE agents
  for (let i = 0; i < idleAgents.length && i < maxKanbanRows; i++) {
    const a = idleAgents[i], cx = wbX + PX + colW / 2, cy = colY + PX * 1.5 + i * rowStep;
    ctx.fillStyle = a.color;
    ctx.beginPath(); ctx.arc(cx - PX * 3, cy, PX * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#444'; ctx.font = `${PX * 1.2}px VT323`; ctx.textAlign = 'left';
    ctx.fillText(a.label, cx - PX * 2, cy + PX * 0.3);
  }

  // Column 2: BUSY agents
  for (let i = 0; i < busyAgents.length && i < maxKanbanRows; i++) {
    const a = busyAgents[i], cx = wbX + PX + colW + colW / 2, cy = colY + PX * 1.5 + i * rowStep;
    ctx.fillStyle = stateColors[a.state] || a.color;
    ctx.beginPath(); ctx.arc(cx - PX * 3, cy, PX * 0.4, 0, Math.PI * 2); ctx.fill();
    // Pulsing dot for active work
    if (a.state === 'working' || a.state === 'thinking') {
      const pulse = 0.3 + Math.sin(tick / 200) * 0.2;
      ctx.save(); ctx.globalAlpha = pulse;
      ctx.beginPath(); ctx.arc(cx - PX * 3, cy, PX * 0.8, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#444'; ctx.font = `${PX * 1.2}px VT323`; ctx.textAlign = 'left';
    ctx.fillText(a.label, cx - PX * 2, cy + PX * 0.3);
  }

  // Column 3: DONE (recent completed tasks)
  const recentDone = kanbanTasks.done.slice(-3);
  for (let i = 0; i < recentDone.length; i++) {
    const t = recentDone[i], a = agents.find(ag => ag.id === t.agentId);
    if (!a) continue;
    const cx = wbX + PX + colW * 2 + colW / 2, cy = colY + PX * 1.5 + i * PX * 1.6;
    ctx.fillStyle = a.color;
    ctx.beginPath(); ctx.arc(cx - PX * 3, cy, PX * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2A8A3A'; ctx.font = `bold ${PX * 1.2}px VT323`; ctx.textAlign = 'left';
    ctx.fillText('>', cx - PX * 2, cy + PX * 0.3);
    ctx.fillStyle = '#555'; ctx.font = `${PX * 1.1}px VT323`;
    ctx.fillText(a.label, cx - PX * 0.8, cy + PX * 0.3);
  }

  // Bottom stats bar
  ctx.fillStyle = '#CCCCCC';
  ctx.fillRect(wbX + PX, wbY + wbH - PX * 2.8, wbW - PX * 2, 1);
  const elapsed = Math.floor((Date.now() - sessionStats.startTime) / 60000);
  const hrs = Math.floor(elapsed / 60), mins = elapsed % 60;
  const timeStr = hrs > 0 ? `${hrs}h${String(mins).padStart(2, '0')}m` : `${mins}m`;
  ctx.fillStyle = '#777'; ctx.font = `${PX * 1.2}px VT323`;
  ctx.textAlign = 'left';
  ctx.fillText(`${OFFICE_BRAND.statsSession} ${timeStr}`, wbX + PX * 2, wbY + wbH - PX * 1.2);
  ctx.textAlign = 'right';
  ctx.fillText(`${sessionStats.tasksCompleted} ${OFFICE_BRAND.statsDoneSuffix}`, wbX + wbW - PX * 2, wbY + wbH - PX * 1.2);
  ctx.textAlign = 'start';
}

// --- Furniture ---

function drawWaterCooler() {
  const x = Math.floor(canvas.width * FURNITURE.waterCooler.xPct), y = Math.floor(canvas.height * FURNITURE.waterCooler.yPct);
  ctx.fillStyle = PALETTE.coolerBody; ctx.fillRect(x - PX * 2, y - PX * 5, PX * 4, PX * 7);
  ctx.fillStyle = PALETTE.coolerWater; ctx.fillRect(x - PX, y - PX * 8, PX * 2, PX * 3);
  ctx.fillStyle = '#6688AA'; pixel(x - PX, y - PX * 9, PX * 2);
  ctx.fillStyle = '#666'; pixel(x - PX * 2, y + PX * 2, PX); pixel(x + PX, y + PX * 2, PX);
}

function drawBookshelf() {
  const x = Math.floor(canvas.width * FURNITURE.bookshelf.xPct), y = Math.floor(canvas.height * FURNITURE.bookshelf.yPct);
  ctx.fillStyle = PALETTE.bookshelfWood; ctx.fillRect(x - PX * 4, y - PX * 7, PX * 8, PX * 11);
  ctx.fillStyle = '#6A4A2A'; for (let s = 0; s < 3; s++) ctx.fillRect(x - PX * 4, y - PX * 6 + s * PX * 3, PX * 8, PX);
  const bc = ['#FF4466','#44AA66','#4488FF','#FFAA22','#AA44FF','#44DDDD'];
  for (let s = 0; s < 2; s++) for (let b = 0; b < 3; b++) { ctx.fillStyle = bc[(s*3+b)%bc.length]; ctx.fillRect(x-PX*3+b*PX*2, y-PX*5+s*PX*3, PX*1.5, PX*2.5); }
  ctx.fillStyle = '#5A6580'; ctx.font = `${PX * 1.4}px VT323`; ctx.textAlign = 'center';
  ctx.fillText('DOCS', x, y - PX * 8.2);
  ctx.textAlign = 'start';
}

function drawServerRack() {
  const x = Math.floor(canvas.width * FURNITURE.serverRack.xPct), y = Math.floor(canvas.height * FURNITURE.serverRack.yPct);
  const rackW = PX * 8, rackH = PX * 14;
  ctx.fillStyle = '#5A6580'; ctx.font = `${PX * 1.5}px VT323`; ctx.textAlign = 'center';
  ctx.fillText(OFFICE_BRAND.rackLabel, x, y - rackH + PX * 0.5);
  ctx.textAlign = 'start';
  // Rack body
  ctx.fillStyle = PALETTE.serverRack;
  ctx.fillRect(x - rackW / 2, y - rackH + PX * 2, rackW, rackH);
  // Top trim
  ctx.fillStyle = '#3A4050';
  ctx.fillRect(x - rackW / 2, y - rackH + PX * 2, rackW, PX);

  // 3 server slots with real metrics
  const metrics = [health.cpu_pct, health.mem_pct, health.disk_pct];
  const labels = ['CPU', 'RAM', 'DSK'];
  const slotH = PX * 3.5;
  for (let s = 0; s < 3; s++) {
    const slotY = y - rackH + PX * 4 + s * (slotH + PX);
    // Slot background
    ctx.fillStyle = '#141828';
    ctx.fillRect(x - rackW / 2 + PX, slotY, rackW - PX * 2, slotH);

    const pct = metrics[s];
    const ledColor = pct > 85 ? '#FF4444' : pct > 60 ? '#FFAA00' : '#00FF44';

    // LED dot (blinks when critical)
    const blink = pct > 85 && Math.floor(tick / 300) % 2 === 0;
    ctx.fillStyle = blink ? '#441111' : ledColor;
    ctx.beginPath();
    ctx.arc(x - rackW / 2 + PX * 2, slotY + slotH / 2, PX * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Bar graph
    const barMaxW = rackW - PX * 5;
    const barW = (pct / 100) * barMaxW;
    ctx.fillStyle = ledColor + '44';
    ctx.fillRect(x - rackW / 2 + PX * 3, slotY + PX * 0.5, barMaxW, slotH - PX);
    ctx.fillStyle = ledColor;
    ctx.fillRect(x - rackW / 2 + PX * 3, slotY + PX * 0.5, barW, slotH - PX);

    // Label and percentage
    ctx.fillStyle = '#CCCCCC';
    ctx.font = `${PX * 1.5}px VT323`;
    ctx.fillText(labels[s], x - rackW / 2 + PX * 3.2, slotY + slotH - PX * 0.5);
    ctx.textAlign = 'right';
    ctx.fillStyle = ledColor;
    ctx.fillText(`${pct}%`, x + rackW / 2 - PX * 1.2, slotY + slotH - PX * 0.5);
    ctx.textAlign = 'start';
  }

  // Temperatura (placeholder 0°C) ou uptime Node
  ctx.fillStyle = health.temp_c > 70 ? '#FF4444' : '#5A8A5A';
  ctx.font = `${PX * 1.8}px VT323`; ctx.textAlign = 'center';
  const tempLabel = health.temp_c > 0 ? `${health.temp_c}\u00B0C` : 'NODE';
  ctx.fillText(tempLabel, x, y + PX * 3.5);
  const uptimeH = Math.floor(health.uptime / 3600);
  const uptimeM = Math.floor((health.uptime % 3600) / 60);
  ctx.fillStyle = '#5A6580'; ctx.font = `${PX * 1.3}px VT323`;
  ctx.fillText(`↑ ${uptimeH}h${String(uptimeM).padStart(2, '0')}m`, x, y + PX * 5);
  ctx.textAlign = 'start';
}

function drawCoffeeMachine() {
  const x = Math.floor(canvas.width * FURNITURE.coffeeMachine.xPct), y = Math.floor(canvas.height * FURNITURE.coffeeMachine.yPct);
  ctx.fillStyle = PALETTE.coffeeMachine; ctx.fillRect(x - PX * 2, y - PX * 5, PX * 4, PX * 6);
  ctx.fillStyle = '#4A4A4A'; ctx.fillRect(x - PX, y - PX * 7, PX * 2, PX * 2);
  ctx.fillStyle = PALETTE.coffeeLight; pixel(x + PX, y - PX * 4, PX * 0.6);
  ctx.fillStyle = '#222'; ctx.fillRect(x - PX, y - PX, PX * 2, PX * 2);
  if (tick % 3000 < 2000) { ctx.fillStyle = 'rgba(200,200,200,0.25)'; const sy = y - PX * 2 + Math.sin(tick / 200) * PX; pixel(x - PX * 0.5, sy, PX * 0.5); pixel(x + PX * 0.5, sy - PX, PX * 0.5); }
}

function drawFilingCabinet() {
  const x = Math.floor(canvas.width * 0.38), y = Math.floor(canvas.height * 0.42);
  ctx.fillStyle = PALETTE.filingCabinet; ctx.fillRect(x - PX * 2, y - PX * 4, PX * 4, PX * 7);
  for (let d = 0; d < 3; d++) { ctx.fillStyle = '#3A3A4A'; ctx.fillRect(x - PX * 2, y - PX * 3.5 + d * PX * 2, PX * 4, 1); ctx.fillStyle = PALETTE.filingHandle; ctx.fillRect(x - PX * 0.5, y - PX * 3 + d * PX * 2, PX, PX * 0.5); }
}

function drawSofa() {
  const x = Math.floor(canvas.width * FURNITURE.sofa.xPct), y = Math.floor(canvas.height * FURNITURE.sofa.yPct);
  const halfW = PX * 10; // wide enough for 3 agents
  // Arms
  ctx.fillStyle = PALETTE.sofaArm;
  ctx.fillRect(x - halfW - PX * 2, y - PX * 3, PX * 2, PX * 4);
  ctx.fillRect(x + halfW, y - PX * 3, PX * 2, PX * 4);
  // Seat
  ctx.fillStyle = PALETTE.sofa;
  ctx.fillRect(x - halfW, y - PX * 2, halfW * 2, PX * 3);
  // 3 cushions (one per agent)
  ctx.fillStyle = PALETTE.sofaCushion;
  for (let i = 0; i < 3; i++) {
    const cx = x - halfW + PX + i * (halfW * 2 / 3);
    ctx.fillRect(cx, y - PX * 3.5, halfW * 2 / 3 - PX, PX * 2);
  }
  // Back
  ctx.fillStyle = PALETTE.sofaArm;
  ctx.fillRect(x - halfW, y - PX * 4.5, halfW * 2, PX * 1.5);
  // Legs
  ctx.fillStyle = '#333';
  pixel(x - halfW - PX, y + PX, PX); pixel(x + halfW, y + PX, PX);
  // Label
  ctx.fillStyle = '#5A6580'; ctx.font = `${PX * 1.5}px VT323`; ctx.textAlign = 'center';
  ctx.fillText(OFFICE_BRAND.sofaLabel, x, y + PX * 3.5);
  ctx.textAlign = 'start';
}

function drawRoundTable() {
  const x = Math.floor(canvas.width * FURNITURE.roundTable.xPct), y = Math.floor(canvas.height * FURNITURE.roundTable.yPct);
  ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.ellipse(x, y + PX * 2, PX * 7, PX * 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PALETTE.roundTable; ctx.fillRect(x - PX, y - PX, PX * 2, PX * 3);
  ctx.fillStyle = PALETTE.roundTableTop; ctx.beginPath(); ctx.ellipse(x, y - PX, PX * 7, PX * 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = PALETTE.roundTable; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = '#EEEECC'; ctx.fillRect(x - PX * 2, y - PX * 2, PX * 2, PX * 1.5);
  ctx.fillStyle = '#E8D0B0'; pixel(x + PX * 2, y - PX * 2, PX * 0.8);
  if (huddleState === 'meeting') { const p = 0.4 + Math.sin(tick / 300) * 0.2; ctx.save(); ctx.globalAlpha = p; ctx.strokeStyle = '#FFCC00'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y - PX, PX * 8, PX * 4, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
}

// --- Workstation ---

function drawMasterPodiumGlow(x, dy, deskW, deskH) {
  const cy = dy + deskH + PX * 3;
  const rx = deskW * 0.55;
  const ry = PX * 5;
  const pulse = 0.12 + Math.sin(tick / 500) * 0.06;
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 215, 0, 0.08)';
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(40, 32, 18, 0.6)';
  ctx.beginPath();
  ctx.ellipse(x, cy + PX * 0.5, rx * 0.92, ry * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawMasterBadgeBar(x, yTop) {
  const bw = PX * 16;
  const bh = PX * 2.8;
  const bx = x - bw / 2;
  ctx.fillStyle = '#5C4600';
  ctx.fillRect(bx, yTop, bw, bh);
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx + 0.5, yTop + 0.5, bw - 1, bh - 1);
  ctx.fillStyle = '#FFF8DC';
  ctx.font = `bold ${PX * 2.2}px VT323`;
  ctx.textAlign = 'center';
  ctx.fillText('MASTER · HUB', x, yTop + bh - PX * 0.8);
  ctx.textAlign = 'start';
}

function drawWorkstation(agent) {
  const x = Math.floor(canvas.width * agent.homeX), y = Math.floor(canvas.height * agent.homeY);
  const isBoss = agent.isBoss;
  const deskW = isBoss ? PX * 22 : PX * 12;
  const deskH = isBoss ? PX * 5 : PX * 4;
  const dx = x - deskW / 2, dy = y - PX * 2;

  if (isBoss) {
    drawMasterPodiumGlow(x, dy, deskW, deskH);
    drawMasterBadgeBar(x, dy - PX * 19);
  }

  ctx.fillStyle = isBoss ? '#5A4A3A' : PALETTE.deskTop;
  ctx.fillRect(dx, dy, deskW, PX * 2);
  ctx.fillStyle = isBoss ? '#4A3A2A' : PALETTE.desk;
  ctx.fillRect(dx, dy + PX * 2, deskW, deskH - PX * 2);
  ctx.fillStyle = PALETTE.deskLeg;
  ctx.fillRect(dx + PX, dy + deskH, PX, PX * 2);
  ctx.fillRect(dx + deskW - PX * 2, dy + deskH, PX, PX * 2);
  if (isBoss) {
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 1;
    ctx.strokeRect(dx + 0.5, dy + 0.5, deskW - 1, deskH + PX * 2 - 1);
  }

  if (isBoss) {
    const mW = PX * 7;
    const mH = PX * 4.5;
    for (const offset of [-PX * 5, PX * 1.5]) {
      const mx = x + offset;
      const my = dy - mH - PX * 1.2;
      ctx.fillStyle = '#1A1E2E';
      ctx.fillRect(mx - PX, my - PX, mW + PX * 2, mH + PX * 2);
      ctx.strokeStyle = '#FFD700';
      ctx.strokeRect(mx - PX, my - PX, mW + PX * 2, mH + PX * 2);
      ctx.fillStyle = PALETTE.monitorScreen;
      ctx.fillRect(mx, my, mW, mH);
      drawScreenContent(mx, my, mW, mH, agent);
    }
    ctx.fillStyle = PALETTE.monitorFrame;
    ctx.fillRect(x - PX * 2, dy - PX, PX * 2, PX);
    ctx.fillRect(x + PX * 2, dy - PX, PX * 2, PX);
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(x - PX * 4, dy - PX * 9.2, PX * 8, PX * 2);
    ctx.strokeStyle = '#FFF8DC';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - PX * 4, dy - PX * 9.2, PX * 8, PX * 2);
    ctx.fillStyle = '#0A0E1A';
    ctx.font = `${PX * 1.5}px VT323`;
    ctx.textAlign = 'center';
    ctx.fillText(OFFICE_BRAND.bossDeskLabel, x, dy - PX * 7.6);
    ctx.textAlign = 'start';
  } else {
    const mW = PX * 7, mH = PX * 5, mx = x - mW / 2, my = dy - mH - PX;
    ctx.fillStyle = PALETTE.monitorFrame; ctx.fillRect(x - PX, dy - PX, PX * 2, PX); ctx.fillRect(mx - PX, my - PX, mW + PX * 2, mH + PX * 2);
    ctx.fillStyle = PALETTE.monitorScreen; ctx.fillRect(mx, my, mW, mH); drawScreenContent(mx, my, mW, mH, agent);
  }
  const cY = dy + deskH + PX;
  const cX = isBoss ? x - PX * 3.5 : x - PX * 2;
  const cW = isBoss ? PX * 8 : PX * 5;
  ctx.fillStyle = isBoss ? '#4A4035' : PALETTE.chairSeat;
  ctx.fillRect(cX, cY, cW, PX * 2);
  ctx.fillStyle = isBoss ? '#3A3530' : PALETTE.chair;
  ctx.fillRect(cX + PX, cY + PX * 2, cW - PX * 2, PX);
  ctx.fillRect(cX, cY - PX * 3, PX, PX * 3);
  ctx.fillRect(cX + cW - PX, cY - PX * 3, PX, PX * 3);
  ctx.fillRect(cX, cY - PX * 3, cW, PX);
  ctx.fillStyle = '#E8E0D0'; pixel(dx + deskW - PX * 3, dy - PX, PX); pixel(dx + deskW - PX * 3, dy - PX * 2, PX);
}

function drawScreenContent(mx, my, w, h, agent) {
  const t = tick / 1000;
  switch (agent.state) {
    case 'idle': if (Math.floor(t * 2) % 2 === 0) { ctx.fillStyle = PALETTE.monitorGlow; pixel(mx + PX, my + PX, PX); } break;
    case 'thinking': ctx.fillStyle = agent.color; for (let i = 0; i < 3; i++) pixel(mx + PX * (1 + i * 2), my + PX + ((Math.floor(t * 3) + i) % 4) * PX, PX); break;
    case 'working': ctx.fillStyle = PALETTE.monitorGlow; for (let r = 0; r < 3; r++) ctx.fillRect(mx + PX + (r % 2) * PX, my + PX * (r + 1), PX * (2 + ((r + Math.floor(t * 2)) % 3)), 1); break;
    case 'talking': ctx.fillStyle = agent.color; for (let i = 0; i < 4; i++) { const bH = PX * (1 + Math.abs(Math.sin(t * 6 + i)) * 2); ctx.fillRect(mx + PX * (1 + i), my + h - PX - bH, PX * 0.8, bH); } break;
  }
}

// --- Agent Drawing ---

function drawAgent(agent) {
  const x = Math.floor(canvas.width * agent.xPct), y = Math.floor(canvas.height * agent.yPct);
  const t = tick / 1000, color = agent.color, dark = darken(color, 0.4);
  const ax = x, ay = y + PX * 5;
  const bob = agent.state === 'idle' ? Math.sin(t * 1.5) * PX * 0.3 : 0;

  // Celebration: lean back
  const leanBack = agent.celebrating ? PX * 1.5 : 0;

  // Look up when voice starts
  const headYOff = agent.lookUp ? -PX * 1 : 0;

  if (agent.isBoss) {
    const pulse = 0.2 + Math.sin(tick / 450) * 0.1;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ax, ay + PX * 1.5, PX * 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 200, 100, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(ax, ay + PX * 1.5, PX * 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle = '#D4A574';
  drawPixelPattern([' XX ','XXXX','XXXX',' XX '], ax - PX * 2, ay - PX * 6 + bob + headYOff, PX);
  ctx.fillStyle = color;
  pixel(ax - PX, ay - PX * 7 + bob + headYOff, PX); pixel(ax, ay - PX * 7 + bob + headYOff, PX); pixel(ax + PX, ay - PX * 7 + bob + headYOff, PX);
  pixel(ax - PX * 2, ay - PX * 6 + bob + headYOff, PX); pixel(ax + PX * 2, ay - PX * 6 + bob + headYOff, PX);
  if (agent.isBoss) {
    ctx.fillStyle = '#FFD700';
    pixel(ax, ay - PX * 8 + bob + headYOff, PX);
    pixel(ax - PX * 2, ay - PX * 9 + bob + headYOff, PX * 0.8);
    pixel(ax + PX * 2, ay - PX * 9 + bob + headYOff, PX * 0.8);
  }

  // Eyes — look up if voice active
  ctx.fillStyle = '#111';
  const eyeY = ay - PX * 5 + bob + headYOff + (agent.lookUp ? -PX * 0.3 : 0);
  pixel(ax - PX, eyeY, PX * 0.7); pixel(ax + PX, eyeY, PX * 0.7);

  ctx.fillStyle = dark;
  drawPixelPattern([' XX ','XXXX','XXXX'], ax - PX * 2 + leanBack, ay - PX * 2 + bob, PX);
  ctx.fillStyle = '#D4A574';
  if (agent.state === 'working') {
    const armY = ay - PX + Math.sin(t * 8) * PX * 0.5;
    pixel(ax - PX * 3, armY, PX); pixel(ax + PX * 2, armY + Math.sin(t * 8 + 1) * PX * 0.5, PX);
  } else if (agent.celebrating) {
    // Arms up celebration
    pixel(ax - PX * 3, ay - PX * 4, PX); pixel(ax + PX * 3, ay - PX * 4, PX);
  } else { pixel(ax - PX * 3, ay - PX + bob, PX); pixel(ax + PX * 2, ay - PX + bob, PX); }

  const nameSize = agent.isBoss ? PX * 3.5 : PX * 3;
  ctx.fillStyle = color;
  ctx.font = `${nameSize}px VT323`;
  ctx.textAlign = 'center';
  ctx.shadowColor = agent.isBoss ? 'rgba(255, 215, 0, 0.85)' : 'transparent';
  ctx.shadowBlur = agent.isBoss ? 6 : 0;
  ctx.fillText(agent.label.toUpperCase(), ax, ay + PX * 4);
  ctx.shadowBlur = 0;
  ctx.textAlign = 'start';

  // Celebration sparkles
  if (agent.celebrating) {
    ctx.fillStyle = '#FFCC00';
    for (let i = 0; i < 4; i++) {
      const sparkX = ax + Math.sin(t * 4 + i * 1.5) * PX * 4;
      const sparkY = ay - PX * 6 + Math.cos(t * 3 + i * 2) * PX * 3;
      pixel(sparkX, sparkY, PX * 0.5);
    }
  }
}

function drawWalkingAgent(agent) {
  const x = Math.floor(canvas.width * agent.xPct), y = Math.floor(canvas.height * agent.yPct);
  const color = agent.color, dark = darken(color, 0.4);
  const bounce = Math.abs(Math.sin(agent.walkPhase * 3)) * PX * 1.5;
  const legSwing = Math.sin(agent.walkPhase * 6);
  const ax = x, ay = y - bounce;

  ctx.fillStyle = '#D4A574';
  drawPixelPattern([' XX ','XXXX','XXXX',' XX '], ax - PX * 2, ay - PX * 8, PX);
  ctx.fillStyle = color;
  pixel(ax - PX, ay - PX * 9, PX); pixel(ax, ay - PX * 9, PX); pixel(ax + PX, ay - PX * 9, PX);
  pixel(ax - PX * 2, ay - PX * 8, PX); pixel(ax + PX * 2, ay - PX * 8, PX);
  if (agent.isBoss) {
    ctx.fillStyle = '#FFD700';
    pixel(ax, ay - PX * 10, PX);
    pixel(ax - PX * 2, ay - PX * 10.5, PX * 0.8);
    pixel(ax + PX * 2, ay - PX * 10.5, PX * 0.8);
  }
  ctx.fillStyle = '#111';
  const eO = agent.facingRight ? PX * 0.3 : -PX * 0.3;
  pixel(ax - PX + eO, ay - PX * 7, PX * 0.7); pixel(ax + PX + eO, ay - PX * 7, PX * 0.7);
  ctx.fillStyle = dark;
  drawPixelPattern([' XX ','XXXX','XXXX'], ax - PX * 2, ay - PX * 4, PX);
  ctx.fillStyle = '#D4A574';
  const aS = Math.sin(agent.walkPhase * 6) * PX;
  pixel(ax - PX * 3, ay - PX * 3 + aS, PX); pixel(ax + PX * 2, ay - PX * 3 - aS, PX);
  ctx.fillStyle = dark;
  const lx = ax - PX + legSwing * PX, rx = ax + legSwing * -PX;
  pixel(lx, ay - PX, PX); pixel(lx, ay, PX); pixel(rx, ay - PX, PX); pixel(rx, ay, PX);
  ctx.fillStyle = '#333'; pixel(lx, ay + PX, PX); pixel(rx, ay + PX, PX);
  ctx.fillStyle = color;
  ctx.font = `${agent.isBoss ? PX * 3.5 : PX * 3}px VT323`;
  ctx.textAlign = 'center';
  if (agent.isBoss) {
    ctx.shadowColor = 'rgba(255, 215, 0, 0.75)';
    ctx.shadowBlur = 5;
  }
  ctx.fillText(agent.label.toUpperCase(), ax, ay + PX * 4);
  ctx.shadowBlur = 0;
  ctx.textAlign = 'start';
}

function drawHighlight(agent) {
  const x = Math.floor(canvas.width * agent.xPct), y = Math.floor(canvas.height * agent.yPct);
  const p = 0.3 + Math.sin(tick / 200) * 0.15;
  const lw = agent.isBoss ? 3 : 2;
  ctx.save(); ctx.globalAlpha = p; ctx.strokeStyle = agent.color; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.arc(x, y, PX * (agent.isBoss ? 11 : 10), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
}

// --- State Indicators ---

function drawStateIndicator(agent) {
  const showBubble = agent.state !== 'idle' || ((agent.wanderState === 'idle_at_furniture' || huddleState === 'meeting') && agent.thoughtText);
  if (!showBubble) return;
  const x = Math.floor(canvas.width * agent.xPct), y = Math.floor(canvas.height * agent.yPct);
  const bX = x + PX * 5, bY = y - PX * 6, text = truncate(agent.thoughtText, 16);

  if ((agent.wanderState === 'idle_at_furniture' || huddleState === 'meeting') && agent.state === 'idle') {
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; pixel(x + PX * 3, y - PX * 8, PX); pixel(x + PX * 4, y - PX * 10, PX * 1.5);
    drawBubble(bX, bY - PX * 4, text, agent.color); return;
  }
  if (agent.state === 'thinking') { ctx.fillStyle = 'rgba(255,255,255,0.6)'; pixel(x + PX * 3, y + PX, PX); pixel(x + PX * 4, y - PX, PX * 1.5); drawBubble(bX, bY, text || '...', agent.color); }
  else if (agent.state === 'working') { drawBubble(bX, bY, (text || 'a trabalhar') + '.'.repeat(agent.typingDots), agent.color); }
  else if (agent.state === 'talking') { drawBubble(bX, bY, text || 'a falar…', agent.color); }
}

function drawBubble(x, y, text, color) {
  ctx.font = `${PX * 3}px VT323`;
  const w = ctx.measureText(text).width + PX * 4, h = PX * 5;
  ctx.fillStyle = 'rgba(10,14,26,0.9)'; ctx.strokeStyle = color; ctx.lineWidth = 1;
  roundRect(x, y - h, w, h, PX); ctx.fill(); ctx.stroke();
  ctx.fillStyle = color; ctx.fillText(text, x + PX * 2, y - PX * 1.5);
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

// --- Helpers ---
function pixel(x, y, size) { ctx.fillRect(Math.floor(x), Math.floor(y), size, size); }
function drawPixelPattern(p, sX, sY, sz) { for (let r=0;r<p.length;r++) for (let c=0;c<p[r].length;c++) if (p[r][c]==='X') pixel(sX+c*sz,sY+r*sz,sz); }
function darken(hex, amt) { const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16); return `rgb(${Math.floor(r*(1-amt))},${Math.floor(g*(1-amt))},${Math.floor(b*(1-amt))})`; }
function truncate(s, max) { if (!s) return ''; return s.length>max?s.slice(0,max-1)+'\u2026':s; }

// --- Ambient Sound System ---

function ensureAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { return null; }
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playKeyClick() {
  const ctx = ensureAudio();
  if (!ctx || soundCooldowns.click > 0) return;
  soundCooldowns.click = 200 + Math.random() * 500;
  const dur = 0.015 + Math.random() * 0.01;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.03;
  const src = ctx.createBufferSource();
  src.buffer = buf; src.connect(ctx.destination); src.start();
}

function playTaskDing() {
  const ctx = ensureAudio();
  if (!ctx || soundCooldowns.ding > 0) return;
  soundCooldowns.ding = 2000;
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.setValueAtTime(800, ctx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(); osc.stop(ctx.currentTime + 0.3);
}

function playHourChime() {
  const ctx = ensureAudio();
  if (!ctx || soundCooldowns.chime > 0) return;
  soundCooldowns.chime = 5000;
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(523, ctx.currentTime);
  osc.frequency.setValueAtTime(659, ctx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.06, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(); osc.stop(ctx.currentTime + 0.8);
}
