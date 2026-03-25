// Canvas — escritório Architecture Agents Hub / ponte aiox-core (agentes .md no disco)
// Features: wandering, huddles, tempo, métricas do host, kanban, celebrações
/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unused-expressions, no-empty */

const PALETTE = {
  floor: '#1A1E2E',
  floorLine: '#222840',
  wall: '#12182A',
  wallAccent: '#1E3A5F',
  desk: '#3A2A1A',
  deskTop: '#4A3A2A',
  deskLeg: '#2A1A0A',
  monitorFrame: '#2A3A4E',
  monitorScreen: '#0A1520',
  monitorGlow: '#38BDF8',
  chair: '#2A2A3A',
  chairSeat: '#3A3A4A',
  plant: '#1A4A2A',
  plantPot: '#5A3A1A',
  plantLeaf: '#2A8A3A',
  whiteboard: '#E8E8E8',
  whiteboardFrame: '#8A8A9A',
  coolerBody: '#88AACC',
  coolerWater: '#44AAFF',
  bookshelfWood: '#5A3A1A',
  serverRack: '#2A3040',
  filingCabinet: '#4A4A5A',
  filingHandle: '#8A8A9A',
  coffeeMachine: '#3A3A3A',
  coffeeLight: '#FF4422',
  roundTable: '#5A4A3A',
  roundTableTop: '#6A5A4A',
  sofa: '#4A3A5A',
  sofaCushion: '#5A4A6A',
  sofaArm: '#3A2A4A',
};

const PX = 5;

/** Folhas de personagem Pixel Agents: 7×16×32, linhas down / up / right */
const CHAR_FRAME_W = 16;
const CHAR_FRAME_H = 32;
const CHAR_FRAME_COUNT = 7;
const FLOOR_TILE_NATURAL = 16;

/**
 * Arte pixel (MIT, Pixel Agents) servida de /public/pixel-assets — ver NOTICE.txt.
 * @type {{
 *   tried: boolean;
 *   floor: HTMLImageElement | null;
 *   chars: HTMLImageElement[];
 *   desk: HTMLImageElement | null;
 *   coffee: HTMLImageElement | null;
 *   bookshelf: HTMLImageElement | null;
 *   sofa: HTMLImageElement | null;
 *   table: HTMLImageElement | null;
 *   whiteboard: HTMLImageElement | null;
 *   plant: HTMLImageElement | null;
 *   bin: HTMLImageElement | null;
 *   pot: HTMLImageElement | null;
 *   cactus: HTMLImageElement | null;
 * }}
 */
const pixelOffice = {
  tried: false,
  floor: null,
  chars: [],
  desk: null,
  coffee: null,
  bookshelf: null,
  sofa: null,
  table: null,
  whiteboard: null,
  plant: null,
  bin: null,
  pot: null,
  cactus: null,
};

function pixelAssetsBase() {
  const b = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL;
  return `${b == null ? '/' : b}pixel-assets/`;
}

function loadPixelImage(url) {
  return new Promise((resolve) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => resolve(im.naturalWidth > 0 ? im : null);
    im.onerror = () => resolve(null);
    im.src = url;
  });
}

async function loadPixelOfficeAssets() {
  const base = pixelAssetsBase();
  const [
    floor,
    desk,
    coffee,
    bookshelf,
    sofa,
    table,
    whiteboard,
    plant,
    bin,
    pot,
    cactus,
    c0,
    c1,
    c2,
    c3,
    c4,
    c5,
  ] = await Promise.all([
    loadPixelImage(`${base}floors/floor_6.png`),
    loadPixelImage(`${base}furniture/DESK/DESK_FRONT.png`),
    loadPixelImage(`${base}furniture/COFFEE/COFFEE.png`),
    loadPixelImage(`${base}furniture/BOOKSHELF/BOOKSHELF.png`),
    loadPixelImage(`${base}furniture/SOFA/SOFA_FRONT.png`),
    loadPixelImage(`${base}furniture/COFFEE_TABLE/COFFEE_TABLE.png`),
    loadPixelImage(`${base}furniture/WHITEBOARD/WHITEBOARD.png`),
    loadPixelImage(`${base}furniture/PLANT/PLANT.png`),
    loadPixelImage(`${base}furniture/BIN/BIN.png`),
    loadPixelImage(`${base}furniture/POT/POT.png`),
    loadPixelImage(`${base}furniture/CACTUS/CACTUS.png`),
    loadPixelImage(`${base}characters/char_0.png`),
    loadPixelImage(`${base}characters/char_1.png`),
    loadPixelImage(`${base}characters/char_2.png`),
    loadPixelImage(`${base}characters/char_3.png`),
    loadPixelImage(`${base}characters/char_4.png`),
    loadPixelImage(`${base}characters/char_5.png`),
  ]);
  pixelOffice.floor = floor;
  pixelOffice.desk = desk;
  pixelOffice.coffee = coffee;
  pixelOffice.bookshelf = bookshelf;
  pixelOffice.sofa = sofa;
  pixelOffice.table = table;
  pixelOffice.whiteboard = whiteboard;
  pixelOffice.plant = plant;
  pixelOffice.bin = bin;
  pixelOffice.pot = pot;
  pixelOffice.cactus = cactus;
  pixelOffice.chars = [c0, c1, c2, c3, c4, c5].filter(Boolean);
  pixelOffice.tried = true;
}

function resetPixelOfficeAssets() {
  pixelOffice.tried = false;
  pixelOffice.floor = null;
  pixelOffice.chars = [];
  pixelOffice.desk = null;
  pixelOffice.coffee = null;
  pixelOffice.bookshelf = null;
  pixelOffice.sofa = null;
  pixelOffice.table = null;
  pixelOffice.whiteboard = null;
  pixelOffice.plant = null;
  pixelOffice.bin = null;
  pixelOffice.pot = null;
  pixelOffice.cactus = null;
}

/** Ancoragem: centro horizontal, base em `cyBottom`. */
function drawSpriteBottom(img, cx, cyBottom, maxW) {
  if (!img?.naturalWidth) return false;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  const w = Math.min(maxW, Math.max(nw * 2.5, PX * 8));
  const h = w * (nh / nw);
  ctx.drawImage(img, cx - w / 2, cyBottom - h, w, h);
  ctx.restore();
  return true;
}

function drawTiledPixelFloor(wallH) {
  const img = pixelOffice.floor;
  if (!img?.naturalWidth) return false;
  const ts = FLOOR_TILE_NATURAL * 2;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  for (let ty = wallH; ty < canvas.height; ty += ts) {
    for (let tx = 0; tx < canvas.width; tx += ts) {
      ctx.drawImage(img, 0, 0, FLOOR_TILE_NATURAL, FLOOR_TILE_NATURAL, tx, ty, ts, ts);
    }
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(18, 24, 46, 0.42)';
  ctx.fillRect(0, wallH, canvas.width, canvas.height - wallH);
  return true;
}

let canvas, ctx;
let agents = [];
let tick = 0;
let highlightedAgent = null;
let officeResizeHandler = null;
/** @type {Record<string, string>} */
let agentAccentOverrides = {};

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

/** Espelho das tarefas do canvas modular (React) — quadro branco no escritório. */
let canvasBoardTasks = [];
/** @type {Array<{ id: string, title?: string }>} */
let canvasSyncAgentRows = [];

// Aquário (visual) - estado vem da UI (fish food / tokens).
// Por defeito, alinha com fish-store.mjs (100/100).
let fishFoodState = { food: 100, maxFood: 100, mood: 'feliz' };
let fishTank = { xPct: 0.82, yPct: 0.62 };

// Visual do aquário (cena/bolhas/caranguejo) — coordenadas no sistema base 160x140.
let aqBubbles = [];
let crabX = 70;
let crabY = 78;
let aqTargetX = 70;
let aqTargetY = 78;
let lastCrabTargetAt = 0;
let fishVisualInitialized = false;
let lastFishFoodForBurst = 50;

// Ambient sound system
let audioCtx = null;
let soundCooldowns = { click: 0, ding: 0, chime: 0 };

/** Posições por defeito do mobiliário (mutável em runtime; persistência em localStorage). */
const DEFAULT_FURNITURE = {
  waterCooler: { xPct: 0.07, yPct: 0.52 },
  bookshelf: { xPct: 0.93, yPct: 0.48 },
  serverRack: { xPct: 0.07, yPct: 0.78 },
  coffeeMachine: { xPct: 0.93, yPct: 0.75 },
  roundTable: { xPct: 0.5, yPct: 0.62 },
  sofa: { xPct: 0.5, yPct: 0.88 },
  filingCabinet: { xPct: 0.38, yPct: 0.42 },
  plantLeft: { xPct: 0.16, yPct: 0.28 },
  plantRight: { xPct: 0.84, yPct: 0.28 },
  // scalePct é um multiplicador do “s” interno do aquário (tamanho do desenho base).
  aquariumTank: { xPct: 0.82, yPct: 0.62, scalePct: 1.0 },
};

/** @type {Record<string, { xPct: number; yPct: number }>} */
let furniture = {};

function cloneDefaultFurniture() {
  /** @type {Record<string, { xPct: number; yPct: number }>} */
  const o = {};
  for (const k of Object.keys(DEFAULT_FURNITURE)) {
    const dk = DEFAULT_FURNITURE[k];
    o[k] = {
      xPct: dk.xPct,
      yPct: dk.yPct,
      ...(typeof dk.scalePct === 'number' ? { scalePct: dk.scalePct } : {}),
    };
  }
  return o;
}

/** Raio de clique (px) para arrastar mobiliário com Shift+Alt. */
const FURNITURE_HIT_R = {
  sofa: 95,
  roundTable: 78,
  bookshelf: 72,
  coffeeMachine: 58,
  waterCooler: 52,
  serverRack: 62,
  filingCabinet: 48,
  plantLeft: 44,
  plantRight: 44,
  aquariumTank: 68,
};

/** v5: inclui posições de mobiliário + agentes; Shift+Alt arrastar objetos. */
const OFFICE_LAYOUT_KEY = 'mission-agent-office-layout-v5';
/** Primeiras N entradas do feed (mais recentes primeiro) contam como “sessão ativa” — timestamps do feed são só HH:MM:SS. */
const FEED_LOG_WINDOW = 48;
let layoutSaveTimer = null;
/** @type {{ kind: 'agent'; id: string; pointerId: number; moved: boolean } | { kind: 'furniture'; key: string; pointerId: number; moved: boolean } | { kind: 'furnitureScale'; key: string; pointerId: number; moved: boolean } | null} */
let layoutPointer = null;
let suppressOfficeClick = false;
let officePointerDown = null;
let officePointerMove = null;
let officePointerUp = null;
let officePointerCancel = null;

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
  const colors = [
    '#FFD700',
    '#00DDFF',
    '#AA66FF',
    '#FF8866',
    '#66FFAA',
    '#FF66AA',
    '#AAFF66',
    '#66AAFF',
  ];

  if (incoming.length === 0) {
    const demoSeats = computeDeskSlots(3);
    agents = [
      createAgent('demo-1', demoSeats[0].x, demoSeats[0].y, colors[0], 'Orchestrator', true, 0),
      createAgent('demo-2', demoSeats[1].x, demoSeats[1].y, colors[1], 'Agente A', false, 1),
      createAgent('demo-3', demoSeats[2].x, demoSeats[2].y, colors[2], 'Agente B', false, 2),
    ];
  } else {
    const rawSlots = computeDeskSlots(incoming.length);
    const slots = repositionMasterSlot(incoming, rawSlots);
    agents = incoming.map((a, i) => {
      const label = (a.title || a.id || `agent-${i}`).slice(0, 14);
      const boss = isMasterAgent(a.id);
      const c = boss ? '#FFD700' : colors[i % colors.length];
      const s = slots[i];
      return createAgent(a.id, s.x, s.y, c, label, boss, i);
    });
  }
  applyAgentAccentOverridesToRuntime();

  AGENT_WANDER_PREFS = {};
  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    AGENT_WANDER_PREFS[a.id] = defaultWanderPrefs(a.id, i, a.isBoss);
  }

  for (const a of agents) {
    a._defaultHomeX = a.homeX;
    a._defaultHomeY = a.homeY;
  }
  furniture = cloneDefaultFurniture();
  applyStoredLayout();
  attachOfficeLayoutPointerHandlers();

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
  void loadPixelOfficeAssets();
}

export function destroy() {
  detachOfficeLayoutPointerHandlers();
  if (layoutSaveTimer) {
    clearTimeout(layoutSaveTimer);
    layoutSaveTimer = null;
  }
  layoutPointer = null;
  if (officeResizeHandler) {
    window.removeEventListener('resize', officeResizeHandler);
    officeResizeHandler = null;
  }
  canvas = null;
  ctx = null;
  agents = [];
  agentAccentOverrides = {};
  OFFICE_BRAND = { ...DEFAULT_OFFICE_BRAND };
  resetPixelOfficeAssets();
}

function resize() {
  const parent = canvas.parentElement;
  const rect = parent.getBoundingClientRect();
  const headerEl = parent.querySelector?.('.zone-header');
  const headerH = headerEl ? headerEl.offsetHeight : 0;
  canvas.width = Math.max(1, rect.width);
  canvas.height = Math.max(1, rect.height - headerH);
}

function createAgent(id, xPct, yPct, color, label, isBoss, charSheet = 0) {
  return {
    id,
    homeX: xPct,
    homeY: yPct,
    xPct,
    yPct,
    color,
    label,
    isBoss,
    baseColor: color,
    charSheet: charSheet % 6,
    _defaultHomeX: xPct,
    _defaultHomeY: yPct,
    state: 'idle',
    wanderState: 'at_desk',
    wanderTarget: null,
    wanderTimer: randomWanderDelay(),
    wanderIdleTimer: 0,
    stateTimer: 0,
    animFrame: 0,
    thoughtText: '',
    typingDots: 0,
    walkPhase: 0,
    facingRight: true,
    lookUp: false,
    celebrating: false,
    selectionCaption: '',
  };
}

function normalizeAccentColor(v) {
  const s = String(v || '').trim();
  if (!s) return null;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s)) return s;
  return null;
}

function applyAgentAccentOverridesToRuntime() {
  for (const a of agents) {
    const override = normalizeAccentColor(agentAccentOverrides[a.id]);
    a.color = override || a.baseColor || a.color;
  }
}

/**
 * Atualiza cores de destaque dos agentes no canvas (preview imediato).
 * @param {Record<string, string>} overridesMap { [agentId]: "#RRGGBB" }
 */
export function setAgentAccentOverrides(overridesMap) {
  agentAccentOverrides =
    overridesMap && typeof overridesMap === 'object' ? { ...overridesMap } : {};
  applyAgentAccentOverridesToRuntime();
}

/**
 * Actualiza o estado do aquário (fish food) para desenho visual.
 * @param {{ food: number; maxFood: number; mood: string }} state
 */
export function setFishFoodState(state) {
  if (!state || typeof state !== 'object') return;
  const prevFood = fishFoodState.food;
  const foodRaw = Number(state.food);
  const maxFoodRaw = Number(state.maxFood);
  const food = Number.isFinite(foodRaw) ? Math.max(0, Math.round(foodRaw)) : fishFoodState.food;
  const maxFood =
    Number.isFinite(maxFoodRaw) && maxFoodRaw > 0
      ? Math.max(10, Math.min(500, Math.round(maxFoodRaw)))
      : fishFoodState.maxFood;
  const moodRaw = String((state.mood ?? fishFoodState.mood) || '')
    .toLowerCase()
    .trim();
  const mood =
    moodRaw === 'feliz'
      ? 'feliz'
      : moodRaw === 'normal'
        ? 'normal'
        : moodRaw === 'fome'
          ? 'fome'
          : moodRaw === 'critico'
            ? 'critico'
            : fishFoodState.mood;
  fishFoodState = { food, maxFood, mood };

  // Visual: se aumentou a comida, adiciona bolhas (efeito “alimentar”).
  if (!fishVisualInitialized && aqBubbles.length === 0) {
    for (let i = 0; i < 10; i++) {
      aqBubbles.push({
        x: 22 + Math.random() * 116,
        y: 30 + Math.random() * 70,
        s: Math.random() * 1.5 + 0.5,
        sp: 0.3 + Math.random() * 0.4,
      });
    }
    fishVisualInitialized = true;
  }

  const delta = food - prevFood;
  if (delta >= 6) {
    const burst = Math.min(28, Math.max(10, Math.round(delta / 3) + 8));
    for (let i = 0; i < burst; i++) {
      aqBubbles.push({
        x: 22 + Math.random() * 116,
        y: 25 + Math.random() * 45,
        s: Math.random() * 1.0 + 0.6,
        sp: 0.5 + Math.random() * 0.5,
      });
    }
    // Evita crescimento infinito se o utilizador alimentar muitas vezes.
    if (aqBubbles.length > 140) aqBubbles = aqBubbles.slice(-140);
  }
}

function ensureFishVisualInit() {
  if (fishVisualInitialized) return;
  if (aqBubbles.length === 0) {
    for (let i = 0; i < 10; i++) {
      aqBubbles.push({
        x: 20 + Math.random() * 120,
        y: 30 + Math.random() * 70,
        s: Math.random() * 1.5 + 0.5,
        sp: 0.3 + Math.random() * 0.4,
      });
    }
  }
  crabX = 70;
  crabY = 78;
  aqTargetX = 70;
  aqTargetY = 78;
  lastCrabTargetAt = tick;
  fishVisualInitialized = true;
}

function updateFishAquariumVisual(dt) {
  ensureFishVisualInit();

  if (!fishVisualInitialized) return;

  const k = dt / 16.67; // normaliza ~60fps
  const t = tick;

  // Bubbles
  for (const b of aqBubbles) {
    b.y -= b.sp * k;
    b.x += Math.sin((t / 1000) * 1.0 + b.y) * 0.15 * k;
    if (b.y < 22) {
      b.y = 115 + Math.random() * 10;
      b.x = 22 + Math.random() * 116;
    }
  }

  // Crab movement
  const moveK = 0.015 * k;
  crabX += (aqTargetX - crabX) * moveK;
  crabY += (aqTargetY - crabY) * moveK;

  if (t - lastCrabTargetAt > 3000) {
    aqTargetX = 35 + Math.random() * 80;
    aqTargetY = 68 + Math.random() * 20;
    lastCrabTargetAt = t;
  }
}

function randomWanderDelay() {
  return 8000 + Math.random() * 7000;
}

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
  const maxCols = getMaxColsForAgentCount(n);
  const inRow0 = Math.min(maxCols, n);
  const centerIdx = Math.floor((inRow0 - 1) / 2);
  if (mi === centerIdx) return slots;
  const out = slots.slice();
  [out[mi], out[centerIdx]] = [out[centerIdx], out[mi]];
  return out;
}

/** Mais colunas com muitos agentes → menos filas e menos sobreposição visual (sprites pixel). */
function getMaxColsForAgentCount(n) {
  if (n <= 0) return 4;
  if (n <= 6) return 3;
  if (n <= 8) return 4;
  if (n <= 14) return 5;
  return 6;
}

/**
 * Grelha de secretárias: margens laterais amplas, espaçamento uniforme (bordas ~8%–94%).
 * Y: 1.ª fila junto à parede; filas seguintes com passo adaptado ao número de linhas.
 */
function computeDeskSlots(n) {
  if (n <= 0) return [];
  const maxCols = getMaxColsForAgentCount(n);
  const left = 0.06;
  const right = 0.94;
  const rows = Math.ceil(n / maxCols);
  const yFirst = 0.125;
  const yMax = 0.84;
  const ySpan = yMax - yFirst;
  const rowStep = rows <= 1 ? 0 : Math.min(0.24, Math.max(0.185, ySpan / rows));

  const slots = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / maxCols);
    const col = i % maxCols;
    const inRow = Math.min(maxCols, n - row * maxCols);
    let x;
    if (inRow === 1) x = (left + right) / 2;
    else {
      const span = right - left;
      x = left + (col / (inRow - 1)) * span;
    }
    const y = Math.min(yMax, yFirst + row * rowStep);
    slots.push({ x, y, boss: i === 0 });
  }
  return slots;
}

/** Posições à volta da mesa redonda (reunião) para N agentes */
function huddleSeatPositions(n) {
  if (n <= 0) return [];
  const cx = furniture.roundTable.xPct;
  const cy = furniture.roundTable.yPct;
  const rx = n > 8 ? 0.11 : n > 5 ? 0.098 : 0.085;
  const ry = n > 8 ? 0.068 : n > 5 ? 0.06 : 0.052;
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

function round4(n) {
  return Math.round(Number(n) * 10000) / 10000;
}

function clampHome(x, y) {
  return {
    x: Math.min(0.92, Math.max(0.06, x)),
    y: Math.min(0.92, Math.max(0.08, y)),
  };
}

function normalizeAgentToken(s) {
  return String(s || '')
    .replace(/^@/, '')
    .trim()
    .toLowerCase()
    .replace(/\.md$/i, '');
}

/**
 * @param {string} logAgent
 * @param {Array<{ id: string; title?: string }>} agentRows
 * @returns {string|null}
 */
function matchLogAgentToRowId(logAgent, agentRows) {
  const key = normalizeAgentToken(logAgent);
  if (!key || key === 'mission-hub') return null;
  for (const row of agentRows) {
    const rid = normalizeAgentToken(row.id);
    if (rid === key) return row.id;
  }
  return null;
}

function applyPositionMapToAgents(map) {
  for (const a of agents) {
    const p = map[a.id];
    if (!p || typeof p.x !== 'number' || typeof p.y !== 'number') continue;
    const c = clampHome(p.x, p.y);
    a.homeX = c.x;
    a.homeY = c.y;
    if (a.wanderState === 'at_desk') {
      a.xPct = c.x;
      a.yPct = c.y;
    }
  }
}

function applyFurnitureMap(map) {
  for (const k of Object.keys(DEFAULT_FURNITURE)) {
    const p = map[k];
    if (!p || typeof p.xPct !== 'number' || typeof p.yPct !== 'number') continue;
    const next = {
      xPct: Math.min(0.97, Math.max(0.03, p.xPct)),
      yPct: Math.min(0.94, Math.max(0.06, p.yPct)),
    };
    if (typeof p.scalePct === 'number' && Number.isFinite(p.scalePct)) {
      next.scalePct = Math.min(2, Math.max(0.5, p.scalePct));
    }
    furniture[k] = next;
  }
}

function serializeFurniture() {
  const fur = {};
  for (const k of Object.keys(DEFAULT_FURNITURE)) {
    if (furniture[k]) {
      const o = { xPct: round4(furniture[k].xPct), yPct: round4(furniture[k].yPct) };
      if (typeof furniture[k].scalePct === 'number') o.scalePct = round4(furniture[k].scalePct);
      fur[k] = o;
    }
  }
  return fur;
}

function applyStoredLayout() {
  try {
    let raw = localStorage.getItem(OFFICE_LAYOUT_KEY);
    /** @type {string | null} */
    let fromLegacy = null;
    if (!raw) {
      for (const lk of ['mission-agent-office-layout-v3', 'mission-agent-office-layout-v1']) {
        raw = localStorage.getItem(lk);
        if (raw) {
          fromLegacy = lk;
          break;
        }
      }
    }
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data?.positions && typeof data.positions === 'object') {
      applyPositionMapToAgents(data.positions);
    }
    if (data?.furniture && typeof data.furniture === 'object') {
      applyFurnitureMap(data.furniture);
    }
    if (fromLegacy) {
      try {
        const positions = {};
        for (const a of agents) positions[a.id] = { x: round4(a.homeX), y: round4(a.homeY) };
        localStorage.setItem(
          OFFICE_LAYOUT_KEY,
          JSON.stringify({ version: 5, positions, furniture: serializeFurniture() })
        );
        localStorage.removeItem(fromLegacy);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
}

function persistLayoutDebounced() {
  if (layoutSaveTimer) clearTimeout(layoutSaveTimer);
  layoutSaveTimer = setTimeout(() => {
    layoutSaveTimer = null;
    const positions = {};
    for (const a of agents) positions[a.id] = { x: round4(a.homeX), y: round4(a.homeY) };
    try {
      localStorage.setItem(
        OFFICE_LAYOUT_KEY,
        JSON.stringify({ version: 5, positions, furniture: serializeFurniture() })
      );
    } catch {
      /* ignore */
    }
  }, 320);
}

export function getFurnitureKeyAt(canvasX, canvasY) {
  if (!canvas) return null;
  const wallH = canvas.height * 0.32;
  const keys = Object.keys(FURNITURE_HIT_R);
  let bestK = null;
  let bestD = Infinity;
  for (const k of keys) {
    const slot = furniture[k];
    if (!slot) continue;
    const cx = slot.xPct * canvas.width;
    const cy = k.startsWith('plant') ? wallH - PX * 5 : slot.yPct * canvas.height;
    const dx = canvasX - cx;
    const dy = canvasY - cy;
    const d = dx * dx + dy * dy;
    const r = FURNITURE_HIT_R[k];
    if (d < r * r && d < bestD) {
      bestD = d;
      bestK = k;
    }
  }
  return bestK;
}

/**
 * Verdadeiro se o ponto (canvasX, canvasY) cai sobre o quadro branco fixo na parede.
 * @param {number} canvasX
 * @param {number} canvasY
 */
export function isWallWhiteboardAt(canvasX, canvasY) {
  if (!canvas) return false;
  const w = canvas.width;
  const wbW = PX * 28;
  const wbH = PX * 13;
  const wbX = Math.floor(w * 0.5) - wbW / 2;
  const wbY = PX * 2;
  return canvasX >= wbX - PX && canvasX <= wbX + wbW + PX && canvasY >= wbY - PX && canvasY <= wbY + wbH + PX;
}

function onLayoutPointerDown(e) {
  if (!canvas) return;
  if (e.altKey && e.shiftKey) {
    const key = getFurnitureKeyAt(e.offsetX, e.offsetY);
    if (!key) return;
    e.preventDefault();
    const scaleMode = key === 'aquariumTank' && e.ctrlKey;
    layoutPointer = scaleMode
      ? { kind: 'furnitureScale', key, pointerId: e.pointerId, moved: false }
      : { kind: 'furniture', key, pointerId: e.pointerId, moved: false };
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    return;
  }
  if (!e.altKey) return;
  const id = getAgentAtPoint(e.offsetX, e.offsetY);
  if (!id || String(id).startsWith('demo-')) return;
  e.preventDefault();
  layoutPointer = { kind: 'agent', id, pointerId: e.pointerId, moved: false };
  try {
    canvas.setPointerCapture(e.pointerId);
  } catch {
    /* ignore */
  }
}

function onLayoutPointerMove(e) {
  if (!layoutPointer || e.pointerId !== layoutPointer.pointerId) return;
  const dx = e.movementX / canvas.width;
  const dy = e.movementY / canvas.height;
  if (Math.abs(dx) > 0.0001 || Math.abs(dy) > 0.0001) layoutPointer.moved = true;
  if (layoutPointer.kind === 'furniture') {
    const fp = furniture[layoutPointer.key];
    if (!fp) return;
    if (layoutPointer.key.startsWith('plant')) {
      fp.xPct = Math.min(0.97, Math.max(0.03, fp.xPct + dx));
      return;
    }
    fp.xPct = Math.min(0.97, Math.max(0.03, fp.xPct + dx));
    fp.yPct = Math.min(0.94, Math.max(0.06, fp.yPct + dy));
    return;
  }
  if (layoutPointer.kind === 'furnitureScale') {
    const fp = furniture[layoutPointer.key];
    if (!fp) return;
    const cur = typeof fp.scalePct === 'number' && Number.isFinite(fp.scalePct) ? fp.scalePct : 1;
    // Usa o movimento horizontal para ajustar escala (mais natural em canvas).
    const next = cur + dx * 2.2;
    fp.scalePct = Math.min(2, Math.max(0.5, next));
    return;
  }
  const a = agents.find((ag) => ag.id === layoutPointer.id);
  if (!a) return;
  const c = clampHome(a.homeX + dx, a.homeY + dy);
  a.homeX = c.x;
  a.homeY = c.y;
  a.xPct = c.x;
  a.yPct = c.y;
  a.wanderState = 'at_desk';
  a.wanderTarget = null;
}

function onLayoutPointerUp(e) {
  if (!layoutPointer || e.pointerId !== layoutPointer.pointerId) return;
  const moved = layoutPointer.moved;
  try {
    canvas.releasePointerCapture(e.pointerId);
  } catch {
    /* ignore */
  }
  layoutPointer = null;
  if (moved) {
    suppressOfficeClick = true;
    persistLayoutDebounced();
    setTimeout(() => {
      suppressOfficeClick = false;
    }, 100);
  }
}

function attachOfficeLayoutPointerHandlers() {
  detachOfficeLayoutPointerHandlers();
  if (!canvas) return;
  officePointerDown = onLayoutPointerDown;
  officePointerMove = onLayoutPointerMove;
  officePointerUp = onLayoutPointerUp;
  officePointerCancel = onLayoutPointerUp;
  canvas.addEventListener('pointerdown', officePointerDown);
  canvas.addEventListener('pointermove', officePointerMove);
  canvas.addEventListener('pointerup', officePointerUp);
  canvas.addEventListener('pointercancel', officePointerCancel);
}

function detachOfficeLayoutPointerHandlers() {
  if (!canvas || !officePointerDown) return;
  canvas.removeEventListener('pointerdown', officePointerDown);
  canvas.removeEventListener('pointermove', officePointerMove);
  canvas.removeEventListener('pointerup', officePointerUp);
  canvas.removeEventListener('pointercancel', officePointerCancel);
  officePointerDown = null;
  officePointerMove = null;
  officePointerUp = null;
  officePointerCancel = null;
}

/** Evita abrir o modal ao largar o arrasto de layout (Alt). */
export function consumeSuppressOfficeClick() {
  const v = suppressOfficeClick;
  suppressOfficeClick = false;
  return v;
}

// --- Public API ---

/**
 * Actualiza o espelho do quadro Kanban da UI no quadro branco (vista Central).
 * @param {unknown} tasks
 * @param {unknown} agentRows
 */
export function syncTaskBoardFromCanvas(tasks, agentRows) {
  canvasBoardTasks = Array.isArray(tasks) ? tasks.slice() : [];
  canvasSyncAgentRows = Array.isArray(agentRows) ? agentRows.slice() : [];

  if (!agents.length) return;

  // Derive agent animation states from Kanban column membership.
  const doingTasks = canvasBoardTasks.filter((t) => t.columnId === 'doing' && t.assigneeAgentId);
  const doneTasks = canvasBoardTasks.filter(
    (t) => (t.columnId === 'done' || t.columnId === 'review') && t.assigneeAgentId
  );
  const doingIds = new Set(doingTasks.map((t) => t.assigneeAgentId));
  const doneIds = new Set(doneTasks.map((t) => t.assigneeAgentId));

  for (const agent of agents) {
    if (doingIds.has(agent.id)) {
      const task = doingTasks.find((t) => t.assigneeAgentId === agent.id);
      if (agent.state !== 'working') {
        setAgentState(agent.id, 'working', { message: truncate(task?.title || 'a trabalhar', 28) });
      }
    } else if (doneIds.has(agent.id) && agent.state === 'idle') {
      // Walk to the wall whiteboard to celebrate completion.
      agent.wanderTarget = '__whiteboard__';
      agent.wanderState = 'walking_to';
      agent.thoughtText = ['Feito!', 'Concluído ✓', 'PR ready', 'Ship it!'][
        Math.floor(Math.random() * 4)
      ];
    }
  }
}

export function setAgentState(agentId, state, data = {}) {
  const agent = agents.find((a) => a.id === agentId);
  if (!agent) return;
  agent.state = state;
  agent.stateTimer = 0;
  agent.thoughtText = data.status || data.message || data.tool || '';
  if (state === 'thinking' || state === 'working') {
    // Kanban: add to doing
    if (!kanbanTasks.doing.find((t) => t.agentId === agentId)) {
      kanbanTasks.doing.push({
        agentId,
        label: agent.label,
        text: agent.thoughtText || state,
        time: Date.now(),
      });
    }
    if (agent.wanderState !== 'at_desk') {
      agent.wanderState = 'walking_back';
      agent.wanderTarget = null;
    }
    if (huddleState === 'meeting' || huddleState === 'gathering') huddleState = 'dispersing';
  } else if (state === 'talking') {
    // Kanban: move from doing to done
    const idx = kanbanTasks.doing.findIndex((t) => t.agentId === agentId);
    if (idx !== -1) {
      const task = kanbanTasks.doing.splice(idx, 1)[0];
      kanbanTasks.done.push({
        ...task,
        text: truncate(agent.thoughtText || 'done', 8),
        doneTime: Date.now(),
      });
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

export function setAgentHighlight(agentId, on) {
  highlightedAgent = on && agentId ? agentId : null;
}

/**
 * Texto curto no balão do agente em destaque (última linha do feed, etc.).
 * @param {string | null | undefined} agentId
 * @param {string} text
 */
export function setAgentSelectionCaption(agentId, text) {
  const id = agentId ? String(agentId) : '';
  const cap = String(text || '').slice(0, 200);
  for (const a of agents) {
    a.selectionCaption = id && a.id === id ? cap : '';
  }
}

/**
 * Primeira linha do feed (mais recente) que corresponde ao agente.
 * @param {string | null | undefined} agentId
 * @param {Array<{ agent: string; action: string }>} logRows
 * @param {Array<{ id: string; title?: string }>} agentRows
 */
export function formatLatestFeedLineForAgent(agentId, logRows, agentRows) {
  if (!agentId || !Array.isArray(logRows) || !Array.isArray(agentRows)) return '';
  for (const log of logRows) {
    if (matchLogAgentToRowId(log.agent, agentRows) === agentId) {
      const a = String(log.action || '')
        .replace(/\s+/g, ' ')
        .trim();
      return a ? a.slice(0, 160) : '';
    }
  }
  return '';
}

/**
 * Sincroniza estados do canvas com o feed (entradas recentes primeiro).
 * @param {Array<{ agent: string; action: string; kind?: string; type?: string }>} logRows
 * @param {Array<{ id: string; title?: string }>} agentRows
 */
export function syncAgentsFromLogs(logRows, agentRows) {
  if (!agents.length || !Array.isArray(logRows) || !Array.isArray(agentRows)) return;
  const matched = new Map();
  const n = Math.min(FEED_LOG_WINDOW, logRows.length);
  for (let i = 0; i < n; i++) {
    const log = logRows[i];
    const aid = matchLogAgentToRowId(log.agent, agentRows);
    if (!aid) continue;
    if (!matched.has(aid)) matched.set(aid, log);
  }
  for (const agent of agents) {
    const log = matched.get(agent.id);
    if (!log) {
      if (agent.state !== 'idle') setAgentState(agent.id, 'idle', {});
      continue;
    }
    const actionLower = String(log.action || '').toLowerCase();
    const isErr =
      actionLower.includes('erro') ||
      actionLower.includes('error') ||
      actionLower.includes('fail') ||
      log.type === 'error';
    const state = isErr ? 'thinking' : 'working';
    const msg = truncate(
      String(log.action || '')
        .replace(/\s+/g, ' ')
        .trim(),
      28
    );
    const nextThought = msg || state;
    if (agent.state === state && agent.thoughtText === nextThought) continue;
    setAgentState(agent.id, state, { message: nextThought });
  }
}

/**
 * Exporta posições das secretárias (JSON legível).
 */
export function getOfficeLayoutExportJSON() {
  const positions = {};
  for (const a of agents) positions[a.id] = { x: round4(a.homeX), y: round4(a.homeY) };
  return JSON.stringify({ version: 5, positions, furniture: serializeFurniture() }, null, 2);
}

/**
 * Aplica posições de agentes e/ou mobiliário e grava em localStorage.
 * @param {string} jsonStr
 */
export function importOfficeLayoutFromJSON(jsonStr) {
  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch {
    return false;
  }
  const map = data?.positions && typeof data.positions === 'object' ? data.positions : null;
  const fur = data?.furniture && typeof data.furniture === 'object' ? data.furniture : null;
  if (!map && !fur) return false;
  if (map) applyPositionMapToAgents(map);
  if (fur) applyFurnitureMap(fur);
  try {
    const positions = {};
    for (const a of agents) positions[a.id] = { x: round4(a.homeX), y: round4(a.homeY) };
    localStorage.setItem(
      OFFICE_LAYOUT_KEY,
      JSON.stringify({ version: 5, positions, furniture: serializeFurniture() })
    );
  } catch {
    /* ignore */
  }
  return true;
}

/** Remove layout guardado e repõe coordenadas por defeito (grelha + mobiliário). */
export function resetOfficeLayoutToDefaults() {
  try {
    localStorage.removeItem(OFFICE_LAYOUT_KEY);
  } catch {
    /* ignore */
  }
  furniture = cloneDefaultFurniture();
  for (const a of agents) {
    const dx = a._defaultHomeX ?? a.homeX;
    const dy = a._defaultHomeY ?? a.homeY;
    a.homeX = dx;
    a.homeY = dy;
    if (a.wanderState === 'at_desk') {
      a.xPct = dx;
      a.yPct = dy;
    }
  }
}

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
  const agent = agents.find((a) => a.id === agentId);
  if (agent) agent.celebrating = true;
}

// --- Update ---

export function update(dt) {
  tick += dt;
  const t = tick / 1000;

  updateFishAquariumVisual(dt);

  // Fetch timers
  weatherFetchTimer += dt;
  healthFetchTimer += dt;
  if (weatherFetchTimer > 300000) {
    weatherFetchTimer = 0;
    fetchWeather();
  }
  if (healthFetchTimer > 10000) {
    healthFetchTimer = 0;
    fetchHealth();
  } // every 10s

  // Sound cooldowns
  for (const key in soundCooldowns) {
    if (soundCooldowns[key] > 0) soundCooldowns[key] -= dt;
  }

  // Ambient keyboard clicks when agents are working
  if (agents.some((a) => a.state === 'working')) playKeyClick();

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
    if (voiceReactionTimer <= 0) {
      for (const a of agents) a.lookUp = false;
    }
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
  const allIdle = agents.every((a) => a.state === 'idle');
  switch (huddleState) {
    case 'idle':
      if (!allIdle) {
        huddleTimer = 15000 + Math.random() * 20000;
        return;
      }
      huddleTimer -= dt;
      if (huddleTimer <= 0) {
        huddleState = 'gathering';
        huddleTopicIndex = (huddleTopicIndex + 1) % huddleTopics.length;
        const seats = huddleSeatPositions(agents.length);
        agents.forEach((a, i) => {
          a.wanderState = 'walking_to';
          a.wanderTarget = '__huddle__';
          a._huddleSeat = seats[i];
          a.thoughtText =
            WANDER_THOUGHTS.roundTable[
              Math.floor(Math.random() * WANDER_THOUGHTS.roundTable.length)
            ];
        });
      }
      break;
    case 'gathering': {
      if (!allIdle) {
        huddleState = 'dispersing';
        break;
      }
      let allArrived = true;
      for (const a of agents) {
        if (a.wanderTarget === '__huddle__' && a._huddleSeat) {
          if (!moveToward(a, a._huddleSeat.x, a._huddleSeat.y, 0.00018, dt)) allArrived = false;
          a.walkPhase += dt * 0.005;
        }
      }
      if (allArrived) {
        huddleState = 'meeting';
        huddleMeetingTimer = 5000 + Math.random() * 4000;
        const topics = huddleTopics[huddleTopicIndex];
        agents.forEach((a, i) => {
          a.wanderState = 'idle_at_furniture';
          a.thoughtText = topics[i % topics.length];
          a.facingRight = a.xPct < furniture.roundTable.xPct;
        });
      }
      break;
    }
    case 'meeting':
      if (!allIdle) {
        huddleState = 'dispersing';
        break;
      }
      huddleMeetingTimer -= dt;
      if (huddleMeetingTimer > 0 && Math.floor(tick / 2000) % 2 === 0) {
        const topics = huddleTopics[huddleTopicIndex];
        agents.forEach((a, i) => {
          a.thoughtText = topics[(i + Math.floor(tick / 2000)) % topics.length];
        });
      }
      if (huddleMeetingTimer <= 0) huddleState = 'dispersing';
      break;
    case 'dispersing':
      for (const a of agents) {
        if (a.wanderState !== 'at_desk') {
          a.wanderState = 'walking_back';
          a.wanderTarget = null;
          a.thoughtText = '';
        }
      }
      if (agents.every((a) => a.wanderState === 'at_desk')) {
        huddleState = 'idle';
        huddleTimer = 20000 + Math.random() * 25000;
      }
      for (const a of agents) {
        if (a.wanderState === 'walking_back') {
          if (moveToward(a, a.homeX, a.homeY, 0.00018, dt)) {
            a.wanderState = 'at_desk';
            a.wanderTimer = randomWanderDelay();
            a.thoughtText = '';
          }
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
    if (agent.wanderState === 'walking_to' || agent.wanderState === 'idle_at_furniture')
      agent.wanderState = 'walking_back';
  }
  const speed = agent.wanderState === 'walking_back' && agent.state !== 'idle' ? 0.00025 : 0.00012;

  switch (agent.wanderState) {
    case 'at_desk':
      if (agent.state !== 'idle') {
        agent.wanderTimer = randomWanderDelay();
        return;
      }
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
          agent.thoughtText = ['Café da manhã', 'Bica!', 'Primeiro café', 'Combustível'][
            Math.floor(Math.random() * 4)
          ];
          break;
        }
        if (hour >= 14 && hour < 16 && Math.random() < 0.35) {
          agent.wanderTarget = 'sofa';
          agent.wanderState = 'walking_to';
          agent.thoughtText = ['Bateria baixa…', 'Sesta rápida', 'Pausa', 'Pós-almoço'][
            Math.floor(Math.random() * 4)
          ];
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
            agent.thoughtText =
              WANDER_THOUGHTS.checkDesk[
                Math.floor(Math.random() * WANDER_THOUGHTS.checkDesk.length)
              ];
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
      } else if (agent.wanderTarget === '__whiteboard__') {
        // Virtual destination: just below the wall whiteboard (floor line, centre).
        dest = { xPct: 0.5, yPct: 0.35 };
      } else {
        dest = furniture[agent.wanderTarget];
      }
      if (!dest) {
        agent.wanderState = 'at_desk';
        break;
      }
      const arrived = moveToward(agent, dest.xPct || dest.x, dest.yPct || dest.y, speed, dt);
      agent.walkPhase += dt * 0.005;
      if (arrived) {
        agent.wanderState = 'idle_at_furniture';
        agent.wanderIdleTimer = 3000 + Math.random() * 4000;
      }
      break;
    }
    case 'idle_at_furniture':
      agent.wanderIdleTimer -= dt;
      if (agent.wanderIdleTimer <= 0) {
        agent.wanderState = 'walking_back';
        agent.thoughtText = '';
      }
      break;
    case 'walking_back': {
      const arrived = moveToward(agent, agent.homeX, agent.homeY, speed, dt);
      agent.walkPhase += dt * 0.005;
      if (arrived) {
        agent.wanderState = 'at_desk';
        agent.wanderTimer = randomWanderDelay();
        agent.thoughtText = '';
      }
      break;
    }
  }
}

function moveToward(agent, targetX, targetY, speed, dt) {
  const dx = targetX - agent.xPct,
    dy = targetY - agent.yPct;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.005) {
    agent.xPct = targetX;
    agent.yPct = targetY;
    return true;
  }
  const step = speed * dt;
  if (step >= dist) {
    agent.xPct = targetX;
    agent.yPct = targetY;
    return true;
  }
  agent.xPct += (dx / dist) * step;
  agent.yPct += (dy / dist) * step;
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

  drawWaterCooler();
  drawAquariumTank();
  drawBookshelf();
  drawServerRack();
  drawCoffeeMachine();
  drawRoundTable();
  drawFilingCabinet();
  drawSofa();
  drawDigitalClock();
  drawWeatherWidget();
  drawWhiteboard();

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
  const w = canvas.width,
    h = canvas.height,
    wallH = h * 0.32;

  ctx.fillStyle = PALETTE.wall;
  ctx.fillRect(0, 0, w, wallH);
  ctx.fillStyle = PALETTE.wallAccent;
  ctx.fillRect(0, wallH - PX, w, PX);
  ctx.fillStyle = PALETTE.floor;
  ctx.fillRect(0, wallH, w, h - wallH);
  const tiled = drawTiledPixelFloor(wallH);
  if (!tiled) {
    ctx.fillStyle = PALETTE.floorLine;
    for (let y = wallH; y < h; y += PX * 8) ctx.fillRect(0, y, w, 1);
    for (let x = 0; x < w; x += PX * 12) ctx.fillRect(x, wallH, 1, h - wallH);
  } else {
    ctx.fillStyle = 'rgba(34, 40, 64, 0.35)';
    for (let y = wallH; y < h; y += PX * 16) ctx.fillRect(0, y, w, 1);
  }

  // Whiteboard frame (conteúdo kanban em drawWhiteboard)
  const wbW = PX * 28,
    wbH = PX * 13,
    wbX = Math.floor(w * 0.5) - wbW / 2,
    wbY = PX * 2;
  ctx.fillStyle = PALETTE.whiteboardFrame;
  ctx.fillRect(wbX - PX, wbY - PX, wbW + PX * 2, wbH + PX * 2);
  ctx.fillStyle = PALETTE.whiteboard;
  ctx.fillRect(wbX, wbY, wbW, wbH);
  if (pixelOffice.whiteboard?.naturalWidth) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(pixelOffice.whiteboard, wbX, wbY, wbW, wbH);
    ctx.restore();
    ctx.fillStyle = 'rgba(10, 14, 26, 0.25)';
    ctx.fillRect(wbX, wbY, wbW, wbH);
  }

  drawWallPlants(wallH);

  // Ceiling lights (dimmer at night)
  const lightAlpha = isNight ? 0.5 : 1;
  for (const lx of [w * 0.25, w * 0.5, w * 0.75]) {
    ctx.fillStyle = '#2A2E3A';
    ctx.fillRect(lx - PX * 2, 0, PX * 4, PX * 2);
    ctx.save();
    ctx.globalAlpha = lightAlpha;
    ctx.fillStyle = '#FFEE88';
    ctx.fillRect(lx - PX, PX * 2, PX * 2, PX);
    ctx.fillStyle = `rgba(255, 238, 136, ${isNight ? 0.01 : 0.02})`;
    ctx.beginPath();
    ctx.moveTo(lx - PX, PX * 3);
    ctx.lineTo(lx - PX * 12, wallH);
    ctx.lineTo(lx + PX * 12, wallH);
    ctx.lineTo(lx + PX, PX * 3);
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = '#3D5A80';
  ctx.font = `bold ${PX * 2}px VT323`;
  ctx.textAlign = 'left';
  ctx.fillText(OFFICE_BRAND.wallTagline, PX * 2, wallH * 0.38);
  ctx.fillStyle = '#5A6580';
  ctx.font = `${PX * 1.3}px VT323`;
  ctx.fillText(OFFICE_BRAND.wallSub, PX * 2, wallH * 0.55);
  ctx.textAlign = 'start';
}

function drawRainEffect() {
  ctx.fillStyle = 'rgba(100, 150, 200, 0.08)';
  const w = canvas.width,
    h = canvas.height * 0.32;
  for (let i = 0; i < 12; i++) {
    const rx = (tick / 3 + i * 47) % w;
    const ry = (tick / 2 + i * 31) % h;
    ctx.fillRect(rx, ry, 1, PX * 2);
  }
}

function drawWallPlants(wallH) {
  drawPlantSlot(furniture.plantLeft, wallH, pixelOffice.plant);
  drawPlantSlot(furniture.plantRight, wallH, pixelOffice.cactus || pixelOffice.plant);
}

function drawPlantSlot(slot, wallH, img) {
  const x = canvas.width * slot.xPct;
  const groundY = wallH - PX;
  if (img?.naturalWidth) {
    drawSpriteBottom(img, x, groundY + PX * 2, PX * 10);
    return;
  }
  drawPlant(x, groundY);
}

function drawPlant(x, groundY) {
  ctx.fillStyle = PALETTE.plantPot;
  for (let i = -1; i <= 1; i++) pixel(x + i * PX, groundY - PX * 3, PX);
  for (let i = -2; i <= 2; i++) pixel(x + i * PX, groundY - PX * 2, PX);
  ctx.fillStyle = PALETTE.plantLeaf;
  const sway = Math.sin((tick / 1000) * 0.5) * PX * 0.5;
  pixel(x + sway, groundY - PX * 5, PX);
  pixel(x - PX + sway, groundY - PX * 4, PX);
  pixel(x + PX + sway, groundY - PX * 4, PX);
  pixel(x - PX * 2 + sway, groundY - PX * 5, PX);
  pixel(x + PX * 2 + sway, groundY - PX * 5, PX);
  ctx.fillStyle = PALETTE.plant;
  pixel(x + sway, groundY - PX * 4, PX);
  pixel(x + sway, groundY - PX * 6, PX);
}

// --- Wall Widgets ---

function drawDigitalClock() {
  const w = canvas.width,
    x = Math.floor(w * 0.18),
    y = PX * 3;
  const boxW = PX * 14,
    boxH = PX * 7;

  ctx.fillStyle = '#1A1E2E';
  ctx.fillRect(x - PX, y - PX, boxW + PX * 2, boxH + PX * 2);

  // Chime flash
  const isChiming = chimeFlashTimer > 0;
  ctx.fillStyle = isChiming ? '#002200' : '#0A0E1A';
  ctx.fillRect(x, y, boxW, boxH);

  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0'),
    m = String(now.getMinutes()).padStart(2, '0'),
    s = String(now.getSeconds()).padStart(2, '0');
  const blink = Math.floor(tick / 500) % 2 === 0;

  ctx.fillStyle = isChiming ? '#44FF88' : '#00FF66';
  ctx.font = `bold ${PX * 4.5}px VT323`;
  ctx.textAlign = 'center';
  ctx.fillText(`${h}${blink ? ':' : ' '}${m}`, x + boxW / 2, y + PX * 4.5);
  ctx.fillStyle = '#00CC52';
  ctx.font = `${PX * 2}px VT323`;
  ctx.fillText(s, x + boxW / 2, y + PX * 6.2);

  const days = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
  const months = [
    'JAN',
    'FEV',
    'MAR',
    'ABR',
    'MAI',
    'JUN',
    'JUL',
    'AGO',
    'SET',
    'OUT',
    'NOV',
    'DEZ',
  ];
  ctx.fillStyle = '#5A6580';
  ctx.font = `${PX * 1.5}px VT323`;
  ctx.fillText(
    `${days[now.getDay()]} ${months[now.getMonth()]} ${now.getDate()}`,
    x + boxW / 2,
    y + boxH + PX * 1.5
  );
  ctx.textAlign = 'start';
}

function drawWeatherWidget() {
  const w = canvas.width,
    x = Math.floor(w * 0.82) - PX * 7,
    y = PX * 3;
  const boxW = PX * 14,
    boxH = PX * 7;

  ctx.fillStyle = '#1A1E2E';
  ctx.fillRect(x - PX, y - PX, boxW + PX * 2, boxH + PX * 2);
  ctx.fillStyle = '#0A0E1A';
  ctx.fillRect(x, y, boxW, boxH);

  const code = weather.code,
    cx = x + PX * 3,
    cy = y + PX * 3;
  if (code >= 200 && code < 300) {
    drawWeatherCloud(cx, cy, '#888');
    ctx.fillStyle = '#FFCC00';
    pixel(cx, cy + PX * 1.5, PX * 0.7);
  } else if (code >= 300 && code < 600) {
    drawWeatherCloud(cx, cy, '#88AACC');
    ctx.fillStyle = '#44AAFF';
    for (let i = 0; i < 3; i++)
      pixel(cx - PX + i * PX, cy + PX + ((tick / 300 + i * 0.7) % 2) * PX, PX * 0.5);
  } else if (code >= 800 && code <= 802) {
    ctx.fillStyle = '#FFCC44';
    ctx.beginPath();
    ctx.arc(cx, cy, PX * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFE066';
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + tick / 3000;
      pixel(cx + Math.cos(a) * PX * 2.5, cy + Math.sin(a) * PX * 2.5, PX * 0.5);
    }
  } else {
    drawWeatherCloud(cx, cy, '#AABBCC');
  }

  ctx.fillStyle = '#00DDFF';
  ctx.font = `bold ${PX * 3.5}px VT323`;
  ctx.textAlign = 'center';
  ctx.fillText(`${weather.temp_c}\u00B0C`, x + boxW / 2 + PX * 2, y + PX * 4);
  ctx.fillStyle = '#5A6580';
  ctx.font = `${PX * 1.5}px VT323`;
  ctx.fillText((weather.desc || '').slice(0, 10), x + boxW / 2, y + PX * 6);
  ctx.fillText(weather.location || 'Weather', x + boxW / 2, y + boxH + PX * 1.5);
  ctx.textAlign = 'start';
}

function drawWeatherCloud(cx, cy, color) {
  ctx.fillStyle = color;
  pixel(cx - PX, cy - PX * 0.5, PX);
  pixel(cx, cy - PX, PX);
  pixel(cx + PX, cy - PX * 0.5, PX);
  pixel(cx - PX * 1.5, cy, PX);
  pixel(cx - PX * 0.5, cy, PX);
  pixel(cx + PX * 0.5, cy, PX);
  pixel(cx + PX * 1.5, cy, PX);
}

/** Uma linha de tarefa do canvas para o quadro branco (truncate é hoisted). */
function canvasTaskLineForWhiteboard(t) {
  const title = truncate(String(t.title || '').replace(/\s+/g, ' '), 18);
  const aid = t.assigneeAgentId ? String(t.assigneeAgentId) : '';
  if (aid) {
    const row = canvasSyncAgentRows.find((r) => r.id === aid);
    const lab = row && row.title ? truncate(String(row.title), 7) : truncate(aid, 7);
    return truncate(`@${lab} ${title}`, 24);
  }
  return title;
}

function drawWhiteboard() {
  const w = canvas.width;
  const wbW = PX * 28,
    wbH = PX * 13;
  const wbX = Math.floor(w * 0.5) - wbW / 2,
    wbY = PX * 2;

  // Header
  ctx.fillStyle = '#555';
  ctx.font = `bold ${PX * 1.8}px VT323`;
  ctx.textAlign = 'center';
  ctx.fillText(OFFICE_BRAND.whiteboardTitle, wbX + wbW / 2, wbY + PX * 1.8);
  ctx.fillStyle = '#CCCCCC';
  ctx.fillRect(wbX + PX, wbY + PX * 2.2, wbW - PX * 2, 1);

  // 3 kanban columns
  const colW = Math.floor((wbW - PX * 2) / 3);
  const colY = wbY + PX * 3;
  const mirrorCanvas = canvasBoardTasks.length > 0;
  const headers = mirrorCanvas ? ['FILA', 'CURSO', 'FEITO'] : OFFICE_BRAND.boardCols;
  const hColors = ['#2A8A3A', '#CC8800', '#3A3ADA'];
  const stateColors = {
    idle: '#00FF66',
    thinking: '#FFCC00',
    working: '#AA66FF',
    talking: '#00DDFF',
  };

  for (let c = 0; c < 3; c++) {
    const cx = wbX + PX + c * colW;
    if (c > 0) {
      ctx.fillStyle = '#CCCCCC';
      ctx.fillRect(cx, colY - PX * 0.5, 1, PX * 7);
    }
    ctx.fillStyle = hColors[c];
    ctx.font = `bold ${PX * 1.3}px VT323`;
    ctx.textAlign = 'center';
    ctx.fillText(headers[c], cx + colW / 2, colY + PX * 0.3);
  }

  const maxKanbanRows = 6;
  const rowStep = agents.length > 8 ? PX * 1.25 : PX * 1.6;

  if (mirrorCanvas) {
    const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);
    const todoT = canvasBoardTasks.filter((t) => t.columnId === 'todo').sort(byOrder);
    const actT = canvasBoardTasks
      .filter((t) => t.columnId === 'doing' || t.columnId === 'review')
      .sort(byOrder);
    const doneT = canvasBoardTasks
      .filter((t) => t.columnId === 'done')
      .sort(byOrder)
      .slice(-4);
    const cols = [todoT, actT, doneT];
    const tStep = PX * 1.42;
    for (let c = 0; c < 3; c++) {
      const cx = wbX + PX + c * colW;
      const list = cols[c];
      for (let i = 0; i < list.length && i < maxKanbanRows; i++) {
        const cy = colY + PX * 1.5 + i * tStep;
        ctx.fillStyle = c === 2 ? '#3A9A5A' : '#666666';
        ctx.font = `${PX * 1.05}px VT323`;
        ctx.textAlign = 'left';
        ctx.fillText(
          `\u2022 ${canvasTaskLineForWhiteboard(list[i])}`,
          cx + PX * 0.35,
          cy + PX * 0.3
        );
      }
    }
  } else {
    const idleAgents = agents.filter((a) => a.state === 'idle');
    const busyAgents = agents.filter((a) => a.state !== 'idle');

    // Column 1: IDLE agents
    for (let i = 0; i < idleAgents.length && i < maxKanbanRows; i++) {
      const a = idleAgents[i],
        cx = wbX + PX + colW / 2,
        cy = colY + PX * 1.5 + i * rowStep;
      ctx.fillStyle = a.color;
      ctx.beginPath();
      ctx.arc(cx - PX * 3, cy, PX * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#444';
      ctx.font = `${PX * 1.2}px VT323`;
      ctx.textAlign = 'left';
      ctx.fillText(a.label, cx - PX * 2, cy + PX * 0.3);
    }

    // Column 2: BUSY agents
    for (let i = 0; i < busyAgents.length && i < maxKanbanRows; i++) {
      const a = busyAgents[i],
        cx = wbX + PX + colW + colW / 2,
        cy = colY + PX * 1.5 + i * rowStep;
      ctx.fillStyle = stateColors[a.state] || a.color;
      ctx.beginPath();
      ctx.arc(cx - PX * 3, cy, PX * 0.4, 0, Math.PI * 2);
      ctx.fill();
      if (a.state === 'working' || a.state === 'thinking') {
        const pulse = 0.3 + Math.sin(tick / 200) * 0.2;
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.beginPath();
        ctx.arc(cx - PX * 3, cy, PX * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#444';
      ctx.font = `${PX * 1.2}px VT323`;
      ctx.textAlign = 'left';
      ctx.fillText(a.label, cx - PX * 2, cy + PX * 0.3);
    }

    // Column 3: DONE (recent completed tasks)
    const recentDone = kanbanTasks.done.slice(-3);
    for (let i = 0; i < recentDone.length; i++) {
      const t = recentDone[i],
        a = agents.find((ag) => ag.id === t.agentId);
      if (!a) continue;
      const cx = wbX + PX + colW * 2 + colW / 2,
        cy = colY + PX * 1.5 + i * PX * 1.6;
      ctx.fillStyle = a.color;
      ctx.beginPath();
      ctx.arc(cx - PX * 3, cy, PX * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2A8A3A';
      ctx.font = `bold ${PX * 1.2}px VT323`;
      ctx.textAlign = 'left';
      ctx.fillText('>', cx - PX * 2, cy + PX * 0.3);
      ctx.fillStyle = '#555';
      ctx.font = `${PX * 1.1}px VT323`;
      ctx.fillText(a.label, cx - PX * 0.8, cy + PX * 0.3);
    }
  }

  // Bottom stats bar
  ctx.fillStyle = '#CCCCCC';
  ctx.fillRect(wbX + PX, wbY + wbH - PX * 2.8, wbW - PX * 2, 1);
  const elapsed = Math.floor((Date.now() - sessionStats.startTime) / 60000);
  const hrs = Math.floor(elapsed / 60),
    mins = elapsed % 60;
  const timeStr = hrs > 0 ? `${hrs}h${String(mins).padStart(2, '0')}m` : `${mins}m`;
  ctx.fillStyle = '#777';
  ctx.font = `${PX * 1.2}px VT323`;
  ctx.textAlign = 'left';
  ctx.fillText(`${OFFICE_BRAND.statsSession} ${timeStr}`, wbX + PX * 2, wbY + wbH - PX * 1.2);
  ctx.textAlign = 'right';
  ctx.fillText(
    `${sessionStats.tasksCompleted} ${OFFICE_BRAND.statsDoneSuffix}`,
    wbX + wbW - PX * 2,
    wbY + wbH - PX * 1.2
  );
  ctx.textAlign = 'start';
}

// --- Furniture ---

function drawWaterCooler() {
  const x = Math.floor(canvas.width * furniture.waterCooler.xPct),
    y = Math.floor(canvas.height * furniture.waterCooler.yPct);
  if (drawSpriteBottom(pixelOffice.pot, x, y + PX * 3, PX * 10)) return;
  if (drawSpriteBottom(pixelOffice.bin, x, y + PX * 3, PX * 9)) return;
  ctx.fillStyle = PALETTE.coolerBody;
  ctx.fillRect(x - PX * 2, y - PX * 5, PX * 4, PX * 7);
  ctx.fillStyle = PALETTE.coolerWater;
  ctx.fillRect(x - PX, y - PX * 8, PX * 2, PX * 3);
  ctx.fillStyle = '#6688AA';
  pixel(x - PX, y - PX * 9, PX * 2);
  ctx.fillStyle = '#666';
  pixel(x - PX * 2, y + PX * 2, PX);
  pixel(x + PX, y + PX * 2, PX);
}

function drawAquariumTank() {
  const slot = furniture && furniture.aquariumTank ? furniture.aquariumTank : fishTank;
  const cx = Math.floor(canvas.width * slot.xPct);
  const cy = Math.floor(canvas.height * slot.yPct);

  // Base da cena (referência do HTML) = 160x140
  const baseW = 160;
  const baseH = 140;
  const aquariumScale =
    typeof slot?.scalePct === 'number' && Number.isFinite(slot.scalePct) ? slot.scalePct : 1;
  // Diminuído vs antes (para ficar mais próximo do exemplo) + ajustável via scalePct do layout.
  const s = Math.max(1, Math.round(PX * 0.26 * aquariumScale)); // pixel size do aquário

  const tankW = baseW * s;
  const tankH = baseH * s;
  const tankX = Math.floor(cx - tankW / 2);
  const tankY = Math.floor(cy - tankH / 2);

  const maxFood = fishFoodState.maxFood > 0 ? fishFoodState.maxFood : 100;
  const pct100 = Math.max(0, Math.min(100, (fishFoodState.food / maxFood) * 100));
  const happyMouth = pct100 > 40;
  const labelText = pct100 > 70 ? 'HAPPY' : pct100 > 40 ? 'HUNGRY' : 'STARVING';
  const labelColor = pct100 > 70 ? '#4caf50' : pct100 > 40 ? '#ffc107' : '#f44336';

  const PAL = {
    bg: '#b8c8e8',
    frame: '#111111',
    glass: '#4a90d9',
    glassL: '#6aaee8',
    glassLL: '#a8d4f0',
    water1: '#2a6faa',
    water2: '#1e5a8a',
    water3: '#3a7fc0',
    sand1: '#c8a86a',
    sand2: '#b89050',
    sand3: '#d4b878',
    rock1: '#8a7a60',
    rock2: '#6a5e48',
    wood1: '#6b3e1e',
    wood2: '#4a2a0e',
    wood3: '#8a5228',
    coralP: '#e060a0',
    coralPL: '#f080c0',
    coralO: '#e08020',
    coralOL: '#f09830',
    coralV: '#8040c0',
    coralVL: '#a060e0',
    bubble: 'rgba(180,220,255,0.6)',
    cg1: '#2d8b2d',
    cg2: '#3cb54a',
    cg3: '#1a5c1a',
    cg4: '#4ecb4e',
    eye: '#0d1a0d',
    wh: '#c8f0c8',
  };

  const p = (x, y, w, h, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(tankX + x * s, tankY + y * s, w * s, h * s);
  };

  // Ligeiro fundo para a cena “existir” no escritório
  p(0, 0, baseW, baseH, 'rgba(184,200,232,0.10)');

  // Moldura / corpo do aquário
  p(18, 18, 124, 106, PAL.frame);
  p(18, 18, 2, 106, PAL.frame);
  p(140, 18, 2, 106, PAL.frame);
  p(18, 18, 124, 2, PAL.frame);
  p(18, 118, 124, 4, PAL.frame);

  // Água
  p(20, 20, 120, 100, PAL.water1);
  p(24, 22, 30, 3, PAL.glassLL);
  p(62, 22, 20, 3, PAL.glassLL);
  p(90, 24, 18, 2, PAL.glassLL);
  p(28, 27, 16, 2, PAL.glassL);
  p(52, 27, 28, 2, PAL.glassL);
  p(88, 27, 14, 2, PAL.glassL);
  p(22, 32, 10, 2, PAL.water3);
  p(44, 32, 22, 2, PAL.water3);
  p(76, 32, 24, 2, PAL.water3);
  p(30, 37, 14, 2, PAL.water2);
  p(58, 37, 18, 2, PAL.water2);
  p(86, 37, 16, 2, PAL.water2);

  // Tampa
  p(18, 16, 124, 4, 'rgba(100,180,240,0.40)');

  // Areia
  p(20, 94, 120, 26, PAL.sand1);
  p(20, 94, 120, 3, PAL.sand3);
  p(20, 97, 8, 2, PAL.sand2);
  p(36, 97, 12, 2, PAL.sand2);
  p(60, 97, 10, 2, PAL.sand2);
  p(82, 97, 14, 2, PAL.sand2);
  p(108, 97, 10, 2, PAL.sand2);

  // Rochas
  p(24, 90, 16, 8, PAL.rock1);
  p(24, 90, 16, 2, PAL.rock2);
  p(26, 88, 12, 4, PAL.rock1);
  p(24, 92, 4, 2, PAL.rock2);
  p(112, 88, 18, 10, PAL.rock1);
  p(112, 88, 18, 2, PAL.rock2);
  p(114, 86, 14, 4, PAL.rock1);
  p(68, 92, 12, 6, PAL.rock2);
  p(70, 90, 8, 4, PAL.rock1);

  // Corais (simplificado, igual ao layout de blocos do HTML)
  p(32, 80, 4, 14, PAL.coralP);
  p(30, 76, 4, 6, PAL.coralPL);
  p(34, 74, 4, 8, PAL.coralPL);
  p(28, 82, 4, 4, PAL.coralP);
  p(36, 78, 4, 4, PAL.coralPL);
  p(30, 72, 2, 4, PAL.coralPL);
  p(36, 70, 2, 6, PAL.coralPL);

  p(96, 82, 4, 12, PAL.coralO);
  p(94, 76, 4, 8, PAL.coralOL);
  p(98, 74, 4, 8, PAL.coralOL);
  p(92, 80, 4, 4, PAL.coralO);
  p(100, 78, 4, 4, PAL.coralOL);
  p(94, 70, 2, 6, PAL.coralOL);
  p(100, 68, 2, 8, PAL.coralOL);
  p(96, 66, 4, 4, PAL.coralOL);

  p(52, 88, 2, 6, PAL.coralV);
  p(50, 84, 2, 4, PAL.coralVL);
  p(54, 82, 2, 6, PAL.coralVL);
  p(48, 86, 2, 2, PAL.coralV);

  // Bolhas (animação persistente, como no HTML)
  ctx.fillStyle = PAL.bubble;
  for (const b of aqBubbles) {
    const bx = tankX + b.x * s;
    const by = tankY + b.y * s;
    const r = Math.max(1, b.s * s);
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCrab(cx0, cy0, claw, happy) {
    const co = claw ? -2 : 0;

    // Pernas esquerdas
    p(cx0 - 10, cy0 + 4, 10, 2, PAL.cg3);
    p(cx0 - 12, cy0 + 6, 4, 4, PAL.cg3);
    p(cx0 - 10, cy0 + 8, 10, 2, PAL.cg3);
    p(cx0 - 12, cy0 + 10, 4, 4, PAL.cg3);
    p(cx0 - 10, cy0 + 12, 10, 2, PAL.cg3);
    p(cx0 - 12, cy0 + 14, 4, 4, PAL.cg3);
    // Pernas direitas
    p(cx0 + 14, cy0 + 4, 10, 2, PAL.cg3);
    p(cx0 + 22, cy0 + 6, 4, 4, PAL.cg3);
    p(cx0 + 14, cy0 + 8, 10, 2, PAL.cg3);
    p(cx0 + 22, cy0 + 10, 4, 4, PAL.cg3);
    p(cx0 + 14, cy0 + 12, 10, 2, PAL.cg3);
    p(cx0 + 22, cy0 + 14, 4, 4, PAL.cg3);

    // Pinça esquerda
    p(cx0 - 14, cy0 + 1 + co, 6, 5, PAL.cg1);
    p(cx0 - 16, cy0 - 1 + co, 5, 4, PAL.cg2);
    p(cx0 - 15, cy0 - 3 + co, 4, 3, PAL.cg3);
    p(cx0 - 16, cy0 + 4 + co, 4, 2, PAL.wh);
    // Pinça direita
    p(cx0 + 22, cy0 + 1 + co, 6, 5, PAL.cg1);
    p(cx0 + 25, cy0 - 1 + co, 5, 4, PAL.cg2);
    p(cx0 + 25, cy0 - 3 + co, 4, 3, PAL.cg3);
    p(cx0 + 26, cy0 + 4 + co, 4, 2, PAL.wh);

    // Corpo
    p(cx0 - 8, cy0, 22, 18, PAL.cg1);
    p(cx0 - 6, cy0 - 2, 18, 20, PAL.cg2);
    p(cx0 - 4, cy0 - 4, 14, 20, PAL.cg1);
    p(cx0 - 2, cy0 - 2, 10, 14, PAL.cg2);

    // Detalhes carapaça
    p(cx0 - 2, cy0, 4, 2, PAL.cg3);
    p(cx0 + 6, cy0, 4, 2, PAL.cg3);
    p(cx0 - 4, cy0 + 4, 14, 2, PAL.cg3);
    p(cx0 - 2, cy0 + 8, 10, 2, PAL.cg4);

    // Olhos
    p(cx0 - 4, cy0 - 6, 4, 4, PAL.eye);
    p(cx0 - 3, cy0 - 5, 2, 2, PAL.wh);
    p(cx0 + 8, cy0 - 6, 4, 4, PAL.eye);
    p(cx0 + 9, cy0 - 5, 2, 2, PAL.wh);

    // Boca
    if (happy) {
      p(cx0 - 2, cy0 + 12, 2, 2, PAL.wh);
      p(cx0, cy0 + 14, 4, 2, PAL.wh);
      p(cx0 + 4, cy0 + 12, 2, 2, PAL.wh);
    } else {
      p(cx0 - 2, cy0 + 14, 8, 2, PAL.wh);
      p(cx0 - 4, cy0 + 12, 2, 2, PAL.wh);
      p(cx0 + 6, cy0 + 12, 2, 2, PAL.wh);
    }
  }

  const claw = Math.floor(tick / 500) % 2 === 0;
  drawCrab(Math.round(crabX), Math.round(crabY), claw, happyMouth);

  // Label do aquário (no canvas), como no teu screenshot
  ctx.fillStyle = labelColor;
  ctx.font = `bold ${Math.max(12, Math.floor(8 * s))}px VT323`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(labelText, tankX + (baseW / 2) * s, tankY + 110 * s);
  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
}

function drawBookshelf() {
  const x = Math.floor(canvas.width * furniture.bookshelf.xPct),
    y = Math.floor(canvas.height * furniture.bookshelf.yPct);
  if (drawSpriteBottom(pixelOffice.bookshelf, x, y + PX * 4, PX * 14)) {
    ctx.fillStyle = '#5A6580';
    ctx.font = `${PX * 1.4}px VT323`;
    ctx.textAlign = 'center';
    ctx.fillText('DOCS', x, y - PX * 10);
    ctx.textAlign = 'start';
    return;
  }
  ctx.fillStyle = PALETTE.bookshelfWood;
  ctx.fillRect(x - PX * 4, y - PX * 7, PX * 8, PX * 11);
  ctx.fillStyle = '#6A4A2A';
  for (let s = 0; s < 3; s++) ctx.fillRect(x - PX * 4, y - PX * 6 + s * PX * 3, PX * 8, PX);
  const bc = ['#FF4466', '#44AA66', '#4488FF', '#FFAA22', '#AA44FF', '#44DDDD'];
  for (let s = 0; s < 2; s++)
    for (let b = 0; b < 3; b++) {
      ctx.fillStyle = bc[(s * 3 + b) % bc.length];
      ctx.fillRect(x - PX * 3 + b * PX * 2, y - PX * 5 + s * PX * 3, PX * 1.5, PX * 2.5);
    }
  ctx.fillStyle = '#5A6580';
  ctx.font = `${PX * 1.4}px VT323`;
  ctx.textAlign = 'center';
  ctx.fillText('DOCS', x, y - PX * 8.2);
  ctx.textAlign = 'start';
}

function drawServerRack() {
  const x = Math.floor(canvas.width * furniture.serverRack.xPct),
    y = Math.floor(canvas.height * furniture.serverRack.yPct);
  const rackW = PX * 8,
    rackH = PX * 14;
  ctx.fillStyle = '#5A6580';
  ctx.font = `${PX * 1.5}px VT323`;
  ctx.textAlign = 'center';
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
  ctx.font = `${PX * 1.8}px VT323`;
  ctx.textAlign = 'center';
  const tempLabel = health.temp_c > 0 ? `${health.temp_c}\u00B0C` : 'NODE';
  ctx.fillText(tempLabel, x, y + PX * 3.5);
  const uptimeH = Math.floor(health.uptime / 3600);
  const uptimeM = Math.floor((health.uptime % 3600) / 60);
  ctx.fillStyle = '#5A6580';
  ctx.font = `${PX * 1.3}px VT323`;
  ctx.fillText(`↑ ${uptimeH}h${String(uptimeM).padStart(2, '0')}m`, x, y + PX * 5);
  ctx.textAlign = 'start';
}

function drawCoffeeMachine() {
  const x = Math.floor(canvas.width * furniture.coffeeMachine.xPct),
    y = Math.floor(canvas.height * furniture.coffeeMachine.yPct);
  if (drawSpriteBottom(pixelOffice.coffee, x, y + PX * 2, PX * 10)) return;
  ctx.fillStyle = PALETTE.coffeeMachine;
  ctx.fillRect(x - PX * 2, y - PX * 5, PX * 4, PX * 6);
  ctx.fillStyle = '#4A4A4A';
  ctx.fillRect(x - PX, y - PX * 7, PX * 2, PX * 2);
  ctx.fillStyle = PALETTE.coffeeLight;
  pixel(x + PX, y - PX * 4, PX * 0.6);
  ctx.fillStyle = '#222';
  ctx.fillRect(x - PX, y - PX, PX * 2, PX * 2);
  if (tick % 3000 < 2000) {
    ctx.fillStyle = 'rgba(200,200,200,0.25)';
    const sy = y - PX * 2 + Math.sin(tick / 200) * PX;
    pixel(x - PX * 0.5, sy, PX * 0.5);
    pixel(x + PX * 0.5, sy - PX, PX * 0.5);
  }
}

function drawFilingCabinet() {
  const x = Math.floor(canvas.width * furniture.filingCabinet.xPct),
    y = Math.floor(canvas.height * furniture.filingCabinet.yPct);
  if (drawSpriteBottom(pixelOffice.bin, x, y + PX * 3, PX * 7)) return;
  ctx.fillStyle = PALETTE.filingCabinet;
  ctx.fillRect(x - PX * 2, y - PX * 4, PX * 4, PX * 7);
  for (let d = 0; d < 3; d++) {
    ctx.fillStyle = '#3A3A4A';
    ctx.fillRect(x - PX * 2, y - PX * 3.5 + d * PX * 2, PX * 4, 1);
    ctx.fillStyle = PALETTE.filingHandle;
    ctx.fillRect(x - PX * 0.5, y - PX * 3 + d * PX * 2, PX, PX * 0.5);
  }
}

function drawSofa() {
  const x = Math.floor(canvas.width * furniture.sofa.xPct),
    y = Math.floor(canvas.height * furniture.sofa.yPct);
  if (drawSpriteBottom(pixelOffice.sofa, x, y + PX * 3, PX * 22)) {
    ctx.fillStyle = '#5A6580';
    ctx.font = `${PX * 1.5}px VT323`;
    ctx.textAlign = 'center';
    ctx.fillText(OFFICE_BRAND.sofaLabel, x, y + PX * 4);
    ctx.textAlign = 'start';
    return;
  }
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
    const cx = x - halfW + PX + i * ((halfW * 2) / 3);
    ctx.fillRect(cx, y - PX * 3.5, (halfW * 2) / 3 - PX, PX * 2);
  }
  // Back
  ctx.fillStyle = PALETTE.sofaArm;
  ctx.fillRect(x - halfW, y - PX * 4.5, halfW * 2, PX * 1.5);
  // Legs
  ctx.fillStyle = '#333';
  pixel(x - halfW - PX, y + PX, PX);
  pixel(x + halfW, y + PX, PX);
  // Label
  ctx.fillStyle = '#5A6580';
  ctx.font = `${PX * 1.5}px VT323`;
  ctx.textAlign = 'center';
  ctx.fillText(OFFICE_BRAND.sofaLabel, x, y + PX * 3.5);
  ctx.textAlign = 'start';
}

function drawRoundTable() {
  const x = Math.floor(canvas.width * furniture.roundTable.xPct),
    y = Math.floor(canvas.height * furniture.roundTable.yPct);
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(x, y + PX * 2, PX * 7, PX * 3, 0, 0, Math.PI * 2);
  ctx.fill();
  if (drawSpriteBottom(pixelOffice.table, x, y + PX * 2, PX * 16)) {
    if (huddleState === 'meeting') {
      const p = 0.4 + Math.sin(tick / 300) * 0.2;
      ctx.save();
      ctx.globalAlpha = p;
      ctx.strokeStyle = '#FFCC00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y - PX, PX * 10, PX * 5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    return;
  }
  ctx.fillStyle = PALETTE.roundTable;
  ctx.fillRect(x - PX, y - PX, PX * 2, PX * 3);
  ctx.fillStyle = PALETTE.roundTableTop;
  ctx.beginPath();
  ctx.ellipse(x, y - PX, PX * 7, PX * 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.roundTable;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#EEEECC';
  ctx.fillRect(x - PX * 2, y - PX * 2, PX * 2, PX * 1.5);
  ctx.fillStyle = '#E8D0B0';
  pixel(x + PX * 2, y - PX * 2, PX * 0.8);
  if (huddleState === 'meeting') {
    const p = 0.4 + Math.sin(tick / 300) * 0.2;
    ctx.save();
    ctx.globalAlpha = p;
    ctx.strokeStyle = '#FFCC00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y - PX, PX * 8, PX * 4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
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
  const x = Math.floor(canvas.width * agent.homeX),
    y = Math.floor(canvas.height * agent.homeY);
  const isBoss = agent.isBoss;
  const deskW = isBoss ? PX * 22 : PX * 12;
  const deskH = isBoss ? PX * 5 : PX * 4;
  const dx = x - deskW / 2,
    dy = y - PX * 2;

  if (isBoss) {
    drawMasterPodiumGlow(x, dy, deskW, deskH);
    drawMasterBadgeBar(x, dy - PX * 19);
  }

  const deskSprite = pixelOffice.desk?.naturalWidth ? pixelOffice.desk : null;
  let drewPixelDesk = false;
  if (deskSprite) {
    const maxDesk = isBoss ? PX * 26 : PX * 15;
    drewPixelDesk = drawSpriteBottom(deskSprite, x, y + PX * 3, maxDesk);
  }
  if (!drewPixelDesk) {
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
    const mW = PX * 7,
      mH = PX * 5,
      mx = x - mW / 2,
      my = dy - mH - PX;
    ctx.fillStyle = PALETTE.monitorFrame;
    ctx.fillRect(x - PX, dy - PX, PX * 2, PX);
    ctx.fillRect(mx - PX, my - PX, mW + PX * 2, mH + PX * 2);
    ctx.fillStyle = PALETTE.monitorScreen;
    ctx.fillRect(mx, my, mW, mH);
    drawScreenContent(mx, my, mW, mH, agent);
  }
  if (!drewPixelDesk) {
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
    ctx.fillStyle = '#E8E0D0';
    pixel(dx + deskW - PX * 3, dy - PX, PX);
    pixel(dx + deskW - PX * 3, dy - PX * 2, PX);
  }
}

function drawScreenContent(mx, my, w, h, agent) {
  const t = tick / 1000;
  switch (agent.state) {
    case 'idle':
      if (Math.floor(t * 2) % 2 === 0) {
        ctx.fillStyle = PALETTE.monitorGlow;
        pixel(mx + PX, my + PX, PX);
      }
      break;
    case 'thinking':
      ctx.fillStyle = agent.color;
      for (let i = 0; i < 3; i++)
        pixel(mx + PX * (1 + i * 2), my + PX + ((Math.floor(t * 3) + i) % 4) * PX, PX);
      break;
    case 'working':
      ctx.fillStyle = PALETTE.monitorGlow;
      for (let r = 0; r < 3; r++)
        ctx.fillRect(
          mx + PX + (r % 2) * PX,
          my + PX * (r + 1),
          PX * (2 + ((r + Math.floor(t * 2)) % 3)),
          1
        );
      break;
    case 'talking':
      ctx.fillStyle = agent.color;
      for (let i = 0; i < 4; i++) {
        const bH = PX * (1 + Math.abs(Math.sin(t * 6 + i)) * 2);
        ctx.fillRect(mx + PX * (1 + i), my + h - PX - bH, PX * 0.8, bH);
      }
      break;
  }
}

// --- Agent Drawing ---

/**
 * Personagem a partir da folha Pixel Agents (char_0…5).
 * @returns {boolean} true se desenhou sprite
 */
function drawAgentAsPixelSprite(agent, x, y, walking) {
  if (!pixelOffice.chars.length) return false;
  const sheet = pixelOffice.chars[agent.charSheet % pixelOffice.chars.length];
  if (!sheet?.naturalWidth) return false;

  const row = walking ? 2 : 0;
  const frame = walking
    ? Math.floor(agent.walkPhase * 8) % CHAR_FRAME_COUNT
    : agent.state === 'working' || agent.state === 'thinking'
      ? Math.floor(tick / 200) % CHAR_FRAME_COUNT
      : 0;
  const sx = frame * CHAR_FRAME_W;
  const sy = row * CHAR_FRAME_H;
  if (sy + CHAR_FRAME_H > sheet.naturalHeight || sx + CHAR_FRAME_W > sheet.naturalWidth)
    return false;

  const sc = 3;
  const dw = CHAR_FRAME_W * sc;
  const dh = CHAR_FRAME_H * sc;
  const bounce = walking ? Math.abs(Math.sin(agent.walkPhase * 3)) * PX * 1.2 : 0;
  const lookUpOff = agent.lookUp ? -PX * 2 : 0;
  const ax = x - dw / 2;
  const ay = y - dh + PX * (walking ? 7 : 9) - bounce + lookUpOff;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (walking && !agent.facingRight) {
    ctx.translate(x, 0);
    ctx.scale(-1, 1);
    ctx.translate(-x, 0);
  }
  ctx.drawImage(sheet, sx, sy, CHAR_FRAME_W, CHAR_FRAME_H, ax, ay, dw, dh);
  ctx.restore();

  const nameSize = agent.isBoss ? PX * 3.5 : PX * 3;
  ctx.fillStyle = agent.color;
  ctx.font = `${nameSize}px VT323`;
  ctx.textAlign = 'center';
  ctx.shadowColor = agent.isBoss ? 'rgba(255, 215, 0, 0.85)' : 'transparent';
  ctx.shadowBlur = agent.isBoss ? 6 : 0;
  ctx.fillText(agent.label.toUpperCase(), x, y + PX * 4);
  ctx.shadowBlur = 0;
  ctx.textAlign = 'start';
  return true;
}

function drawAgent(agent) {
  const x = Math.floor(canvas.width * agent.xPct),
    y = Math.floor(canvas.height * agent.yPct);
  const t = tick / 1000,
    color = agent.color,
    dark = darken(color, 0.4);
  const ax = x,
    ay = y + PX * 5;
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

  if (drawAgentAsPixelSprite(agent, x, y, false)) {
    if (agent.celebrating) {
      ctx.fillStyle = '#FFCC00';
      for (let i = 0; i < 4; i++) {
        const sparkX = x + Math.sin(t * 4 + i * 1.5) * PX * 4;
        const sparkY = y - PX * 8 + Math.cos(t * 3 + i * 2) * PX * 3;
        pixel(sparkX, sparkY, PX * 0.5);
      }
    }
    return;
  }

  ctx.fillStyle = '#D4A574';
  drawPixelPattern([' XX ', 'XXXX', 'XXXX', ' XX '], ax - PX * 2, ay - PX * 6 + bob + headYOff, PX);
  ctx.fillStyle = color;
  pixel(ax - PX, ay - PX * 7 + bob + headYOff, PX);
  pixel(ax, ay - PX * 7 + bob + headYOff, PX);
  pixel(ax + PX, ay - PX * 7 + bob + headYOff, PX);
  pixel(ax - PX * 2, ay - PX * 6 + bob + headYOff, PX);
  pixel(ax + PX * 2, ay - PX * 6 + bob + headYOff, PX);
  if (agent.isBoss) {
    ctx.fillStyle = '#FFD700';
    pixel(ax, ay - PX * 8 + bob + headYOff, PX);
    pixel(ax - PX * 2, ay - PX * 9 + bob + headYOff, PX * 0.8);
    pixel(ax + PX * 2, ay - PX * 9 + bob + headYOff, PX * 0.8);
  }

  // Eyes — look up if voice active
  ctx.fillStyle = '#111';
  const eyeY = ay - PX * 5 + bob + headYOff + (agent.lookUp ? -PX * 0.3 : 0);
  pixel(ax - PX, eyeY, PX * 0.7);
  pixel(ax + PX, eyeY, PX * 0.7);

  ctx.fillStyle = dark;
  drawPixelPattern([' XX ', 'XXXX', 'XXXX'], ax - PX * 2 + leanBack, ay - PX * 2 + bob, PX);
  ctx.fillStyle = '#D4A574';
  if (agent.state === 'working') {
    const armY = ay - PX + Math.sin(t * 8) * PX * 0.5;
    pixel(ax - PX * 3, armY, PX);
    pixel(ax + PX * 2, armY + Math.sin(t * 8 + 1) * PX * 0.5, PX);
  } else if (agent.celebrating) {
    // Arms up celebration
    pixel(ax - PX * 3, ay - PX * 4, PX);
    pixel(ax + PX * 3, ay - PX * 4, PX);
  } else {
    pixel(ax - PX * 3, ay - PX + bob, PX);
    pixel(ax + PX * 2, ay - PX + bob, PX);
  }

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
  const x = Math.floor(canvas.width * agent.xPct),
    y = Math.floor(canvas.height * agent.yPct);
  if (drawAgentAsPixelSprite(agent, x, y, true)) return;
  const color = agent.color,
    dark = darken(color, 0.4);
  const bounce = Math.abs(Math.sin(agent.walkPhase * 3)) * PX * 1.5;
  const legSwing = Math.sin(agent.walkPhase * 6);
  const ax = x,
    ay = y - bounce;

  ctx.fillStyle = '#D4A574';
  drawPixelPattern([' XX ', 'XXXX', 'XXXX', ' XX '], ax - PX * 2, ay - PX * 8, PX);
  ctx.fillStyle = color;
  pixel(ax - PX, ay - PX * 9, PX);
  pixel(ax, ay - PX * 9, PX);
  pixel(ax + PX, ay - PX * 9, PX);
  pixel(ax - PX * 2, ay - PX * 8, PX);
  pixel(ax + PX * 2, ay - PX * 8, PX);
  if (agent.isBoss) {
    ctx.fillStyle = '#FFD700';
    pixel(ax, ay - PX * 10, PX);
    pixel(ax - PX * 2, ay - PX * 10.5, PX * 0.8);
    pixel(ax + PX * 2, ay - PX * 10.5, PX * 0.8);
  }
  ctx.fillStyle = '#111';
  const eO = agent.facingRight ? PX * 0.3 : -PX * 0.3;
  pixel(ax - PX + eO, ay - PX * 7, PX * 0.7);
  pixel(ax + PX + eO, ay - PX * 7, PX * 0.7);
  ctx.fillStyle = dark;
  drawPixelPattern([' XX ', 'XXXX', 'XXXX'], ax - PX * 2, ay - PX * 4, PX);
  ctx.fillStyle = '#D4A574';
  const aS = Math.sin(agent.walkPhase * 6) * PX;
  pixel(ax - PX * 3, ay - PX * 3 + aS, PX);
  pixel(ax + PX * 2, ay - PX * 3 - aS, PX);
  ctx.fillStyle = dark;
  const lx = ax - PX + legSwing * PX,
    rx = ax + legSwing * -PX;
  pixel(lx, ay - PX, PX);
  pixel(lx, ay, PX);
  pixel(rx, ay - PX, PX);
  pixel(rx, ay, PX);
  ctx.fillStyle = '#333';
  pixel(lx, ay + PX, PX);
  pixel(rx, ay + PX, PX);
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
  const x = Math.floor(canvas.width * agent.xPct),
    y = Math.floor(canvas.height * agent.yPct);
  const p = 0.3 + Math.sin(tick / 200) * 0.15;
  const lw = agent.isBoss ? 3 : 2;
  const rMul = pixelOffice.chars.length ? 14 : agent.isBoss ? 11 : 10;
  ctx.save();
  ctx.globalAlpha = p;
  ctx.strokeStyle = agent.color;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(x, y, PX * rMul, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// --- State Indicators ---

function drawStateIndicator(agent) {
  const x = Math.floor(canvas.width * agent.xPct),
    y = Math.floor(canvas.height * agent.yPct);
  const bX = x + PX * 5;
  let bY = y - PX * 6;
  if (highlightedAgent === agent.id && agent.selectionCaption) {
    drawBubble(bX, bY - PX * 10, truncate(agent.selectionCaption, 38), agent.color);
    bY -= PX * 8;
  }
  const showBubble =
    agent.state !== 'idle' ||
    ((agent.wanderState === 'idle_at_furniture' || huddleState === 'meeting') && agent.thoughtText);
  if (!showBubble) return;
  const text = truncate(agent.thoughtText, 16);

  if (
    (agent.wanderState === 'idle_at_furniture' || huddleState === 'meeting') &&
    agent.state === 'idle'
  ) {
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    pixel(x + PX * 3, y - PX * 8, PX);
    pixel(x + PX * 4, y - PX * 10, PX * 1.5);
    drawBubble(bX, bY - PX * 4, text, agent.color);
    return;
  }
  if (agent.state === 'thinking') {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    pixel(x + PX * 3, y + PX, PX);
    pixel(x + PX * 4, y - PX, PX * 1.5);
    drawBubble(bX, bY, text || '...', agent.color);
  } else if (agent.state === 'working') {
    drawBubble(bX, bY, (text || 'a trabalhar') + '.'.repeat(agent.typingDots), agent.color);
  } else if (agent.state === 'talking') {
    drawBubble(bX, bY, text || 'a falar…', agent.color);
  }
}

function drawBubble(x, y, text, color) {
  ctx.font = `${PX * 3}px VT323`;
  const w = ctx.measureText(text).width + PX * 4,
    h = PX * 5;
  ctx.fillStyle = 'rgba(10,14,26,0.9)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  roundRect(x, y - h, w, h, PX);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fillText(text, x + PX * 2, y - PX * 1.5);
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// --- Helpers ---
function pixel(x, y, size) {
  ctx.fillRect(Math.floor(x), Math.floor(y), size, size);
}
function drawPixelPattern(p, sX, sY, sz) {
  for (let r = 0; r < p.length; r++)
    for (let c = 0; c < p[r].length; c++) if (p[r][c] === 'X') pixel(sX + c * sz, sY + r * sz, sz);
}
function darken(hex, amt) {
  const r = parseInt(hex.slice(1, 3), 16),
    g = parseInt(hex.slice(3, 5), 16),
    b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.floor(r * (1 - amt))},${Math.floor(g * (1 - amt))},${Math.floor(b * (1 - amt))})`;
}
function truncate(s, max) {
  if (!s) return '';
  return s.length > max ? s.slice(0, max - 1) + '\u2026' : s;
}

// --- Ambient Sound System ---

function ensureAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      return null;
    }
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
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start();
}

function playTaskDing() {
  const ctx = ensureAudio();
  if (!ctx || soundCooldowns.ding > 0) return;
  soundCooldowns.ding = 2000;
  const osc = ctx.createOscillator(),
    gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.setValueAtTime(800, ctx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
}

function playHourChime() {
  const ctx = ensureAudio();
  if (!ctx || soundCooldowns.chime > 0) return;
  soundCooldowns.chime = 5000;
  const osc = ctx.createOscillator(),
    gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(523, ctx.currentTime);
  osc.frequency.setValueAtTime(659, ctx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.06, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.8);
}
