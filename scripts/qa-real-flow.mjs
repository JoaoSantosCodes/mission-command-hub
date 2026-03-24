#!/usr/bin/env node
/**
 * Cenário de validação contra API **real** (Express a correr).
 *
 * Uso:
 *   1. Noutro terminal: `npm run dev` ou só `node server/index.mjs` (porta 8787).
 *   2. `npm run qa:real`
 *
 * Opcional: `MISSION_QA_BASE_URL=http://127.0.0.1:9999 npm run qa:real`
 */
const BASE = String(process.env.MISSION_QA_BASE_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');

async function req(method, path, { json, headers: extraHeaders } = {}) {
  const headers = { Accept: 'application/json', ...extraHeaders };
  let body;
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  }
  const r = await fetch(`${BASE}${path}`, { method, headers, body });
  const text = await r.text();
  let data = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* manter texto */
  }
  return { ok: r.ok, status: r.status, data, text };
}

function fail(msg) {
  console.error(`\x1b[31mFALHA\x1b[0m: ${msg}`);
  process.exit(1);
}

function pass(msg) {
  console.log(`\x1b[32mOK\x1b[0m   ${msg}`);
}

async function main() {
  console.log(`Cenário QA — base \x1b[36m${BASE}\x1b[0m\n`);

  const h = await req('GET', '/api/health');
  if (!h.ok || !h.data?.ok) {
    fail(
      `Servidor não respondeu em ${BASE}. Corre \`npm run dev\` (Express :8787) ou define MISSION_QA_BASE_URL. (${h.status})`
    );
  }
  pass('GET /api/health');

  const act0 = await req('GET', '/api/aiox/activity');
  if (!act0.ok || !Array.isArray(act0.data?.logs)) {
    fail(`GET /api/aiox/activity inválido (${act0.status})`);
  }
  const n0 = act0.data.logs.length;
  pass(`GET /api/aiox/activity (${n0} entradas)`);

  const marker = `QA-REAL-${Date.now()}`;
  const ev1 = await req('POST', '/api/aiox/activity/event', {
    json: {
      agent: '@task-canvas',
      action: `Cenário real — registo único ${marker}`,
      type: 'output',
      kind: 'bridge',
    },
  });
  if (!ev1.ok || !ev1.data?.ok) {
    fail(`POST /api/aiox/activity/event falhou (${ev1.status}): ${ev1.text?.slice(0, 200)}`);
  }
  pass('POST /api/aiox/activity/event (@task-canvas)');

  const act1 = await req('GET', '/api/aiox/activity');
  const found = act1.data?.logs?.some((e) => String(e.action || '').includes(marker));
  if (!found) {
    fail('A nova linha não apareceu em GET /api/aiox/activity (persistência ou cache).');
  }
  pass('Feed contém o marcador (persistência confirmada)');

  const ev2 = await req('POST', '/api/aiox/activity/event', {
    json: {
      agent: 'dev-agent-qa',
      action: `Linha atribuída (simula agente) ${marker}-B`,
      type: 'output',
      kind: 'bridge',
    },
  });
  if (!ev2.ok) {
    fail(`Segundo POST activity/event falhou (${ev2.status})`);
  }
  pass('POST /api/aiox/activity/event (agente fictício)');

  const tb0 = await req('GET', '/api/aiox/task-board');
  if (!tb0.ok || typeof tb0.data?.revision !== 'string') {
    fail(`GET /api/aiox/task-board inválido (${tb0.status})`);
  }
  pass('GET /api/aiox/task-board');

  const taskId = `qa-task-${Date.now()}`;
  const putBody = {
    tasks: [
      {
        id: taskId,
        title: 'Tarefa cenário real QA',
        columnId: 'doing',
        order: 0,
        createdAt: Date.now(),
        assigneeAgentId: 'dev-agent-qa',
      },
    ],
  };
  const tbPut = await req('PUT', '/api/aiox/task-board', {
    json: putBody,
    headers: { 'If-Match': tb0.data.revision },
  });
  if (!tbPut.ok) {
    fail(`PUT /api/aiox/task-board falhou (${tbPut.status}): ${JSON.stringify(tbPut.data)}`);
  }
  pass('PUT /api/aiox/task-board (tarefa + assigneeAgentId)');

  const tb1 = await req('GET', '/api/aiox/task-board');
  const t = tb1.data?.tasks?.find((x) => x.id === taskId);
  if (!t) {
    fail(`GET /api/aiox/task-board não contém a tarefa ${taskId} após PUT.`);
  }
  if (t.assigneeAgentId !== 'dev-agent-qa') {
    console.error(
      '\nDica: o Node que escuta :8787 pode ser uma build antiga (sem suporte a assigneeAgentId no task-board).\n' +
        '   Para todos os `node server/index.mjs` / `npm run dev` e volta a subir o servidor, depois `npm run qa:real`.\n'
    );
    fail(
      `assigneeAgentId esperado "dev-agent-qa", obtido ${JSON.stringify(t.assigneeAgentId)} — ver código em server/lib/task-board-store.mjs`
    );
  }
  pass('GET /api/aiox/task-board relê assigneeAgentId');

  const ov = await req('GET', '/api/aiox/overview');
  if (!ov.ok || !Array.isArray(ov.data?.logs)) {
    fail(`GET /api/aiox/overview inválido (${ov.status})`);
  }
  const inOverview = ov.data.logs.some((e) => String(e.action || '').includes(marker));
  if (!inOverview) {
    fail('Overview não inclui o marcador no array logs (esperado após POST activity).');
  }
  pass('GET /api/aiox/overview inclui actividade recente');

  console.log(`\n\x1b[32mCenário API concluído com sucesso.\x1b[0m`);
  console.log('Segue o guia em docs/QA-CENARIO-CANVAS-REAL.md para validar a UI no browser.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
