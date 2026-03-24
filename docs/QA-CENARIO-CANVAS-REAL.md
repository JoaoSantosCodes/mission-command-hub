# Cenário real — Canvas, atividade e API

Objetivo: validar ponta-a-ponta o que um utilizador vê no hub e o que o servidor grava.

## Parte A — API (automático)

**Importante:** o processo Express tem de ser o da **versão actual do código** (com `assigneeAgentId` no task-board). Se actualizaste o repo, **para e volta a arrancar** `npm run dev:split` (ou `node server/index.mjs`) antes do `qa:real`.

1. Terminal 1 — na pasta `MissionAgent/`:

   ```bash
   npm run dev:split
   ```

   (Express em **:8787** e Vite em **:5179**.)

2. Terminal 2:

   ```bash
   npm run qa:real
   ```

**Esperado:** mensagens `OK` para health, activity, dois `POST …/activity/event`, `GET/PUT` task-board com `assigneeAgentId`, e `overview` com o marcador no feed.

**Se falhar “Servidor não respondeu”:** confirma que nada ocupa outra porta ou define `MISSION_QA_BASE_URL=http://127.0.0.1:PORTA`.

---

## Parte B — UI (manual, ~5 min)

Pré-requisito: `npm run dev` a correr; browser em `http://localhost:5179/`.

| Passo | Acção | O que verificar |
|------|--------|------------------|
| 1 | Abre **Canvas de tarefas** (vista Kanban no header). | Carrega colunas sem erro. |
| 2 | Adiciona uma tarefa na primeira coluna com título `Teste manual UI`. | Cartão aparece. |
| 3 | No cartão, escolhe um **Agente** no select (se a lista estiver vazia, há agentes em falta no aiox-core). | Nome aparece no chip do cartão. |
| 4 | Arrasta a tarefa para **Em curso** (ou equivalente do preset). | DevTools → Rede: **POST** `/api/aiox/activity/event` (1 ou 2 pedidos), depois **GET** `/api/aiox/overview` (~380 ms depois, debounce). |
| 5 | Volta ao **Hub** (vista três colunas) e abre **Atividade**. | Linhas com prefixo `Quadro:` e, se atribuíste agente, entrada com o **id** desse agente. |
| 6 | Abre **Central** (command center). | Quadro branco com colunas **FILA / CURSO / FEITO** e a tarefa listada (se ainda existir no canvas). |
| 7 | (Opcional) Com `VITE_TASK_BOARD_SYNC=1` no `.env` do Vite e rebuild/restart dev | Após mover tarefa, **PUT** `/api/aiox/task-board` aparece na rede. |

---

## Parte C — Checklist rápido de problemas

| Sintoma | Verificação |
|---------|-------------|
| Atividade atrasada | Após correção recente, o refresh corre **depois** dos `POST` e com debounce; espera ~0,5 s ou recarrega a página. |
| 404 em `/api` no browser | Usar `npm run dev` (proxy para :8787), não só `vite` isolado sem API. |
| Sem agentes no select | Pasta `aiox-core/.aiox-core/development/agents/` com `.md`; `AIOX_CORE_PATH` correcto. |

---

## Comandos úteis

```bash
npm run qa:real
MISSION_QA_BASE_URL=http://127.0.0.1:8787 npm run qa:real
```

Índice: [CHECKLIST-OPERACIONAL.md](./CHECKLIST-OPERACIONAL.md)
