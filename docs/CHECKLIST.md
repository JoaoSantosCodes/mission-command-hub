# Architecture Agents Hub — melhorias e pendências

Checklist vivo: marca com `[x]` quando concluído. **Última revisão:** 2026-03-23 — Integrações com alertas ativos + histórico de saúde (`integrations-status?validate=1`), sincronização entre abas via **`POST /api/aiox/activity/event`**, e fluxo E2E básico coberto; **`npm test` 39/39**, `npm run build` OK. Índice monorepo: **[../../docs/PROJETO-E-CHECKLIST.md](../../docs/PROJETO-E-CHECKLIST.md)**; **[CHECKLIST-OPERACIONAL.md](./CHECKLIST-OPERACIONAL.md)**, **[CHECKLIST-VALIDATION.md](./CHECKLIST-VALIDATION.md)**.

---

## Concluído (baseline)

- [x] API Express: `health`, `info`, `agents` (lista + **POST** criar + GET por id + **PUT** + **DELETE** `.md`), `activity`, `command`, `metrics`, `weather`, `exec` (opt-in), **`doubts`** + **`doubts/chat`** (LLM opt-in)
- [x] Leitura de agentes `.md` em `aiox-core/.aiox-core/development/agents/`
- [x] Versão CLI via `bin/aiox.js --version`
- [x] UI 3 colunas + feed + barra de comando; vistas **Central** (canvas + terminal) e **Canvas de tarefas** (Kanban local)
- [x] **Dev/preview:** ponte Express **embebida** no Vite em `/api` (`mission-api-plugin.mjs`); com `MISSION_EMBED_API=0`, proxy `/api` → **8787**
- [x] **Produção:** `npm run build` + `npm start` — `dist` + `/api/*` no mesmo processo Express

### Refinamentos recentes

- [x] Limite de tamanho do comando no servidor (`MAX_COMMAND_LEN`)
- [x] Cliente: erros HTTP com corpo JSON parseável; toast após comando OK
- [x] Polling a cada **12s** por defeito (`VITE_POLL_INTERVAL_MS` entre 5s e 300s) **pausado** quando o separador está em segundo plano (`visibilitychange`)
- [x] Botão **Actualizar** + hora da última sincronização
- [x] **Saltar para o conteúdo** (`#conteudo-principal`) + foco visível
- [x] Landmarks: `main`, `aria-live` em erros / toasts; listas semânticas onde faz sentido
- [x] Sidebar + feed **ocultos em `<lg`** com bloco resumo móvel
- [x] `.env.example` + este **CHECKLIST.md** ligado no README
- [x] **Servidor MCP (stdio)** com `@modelcontextprotocol/sdk`: tools `mission_aiox_info`, `mission_list_agents`, `mission_register_command` + `docs/MCP.md` + script `npm run mcp`
- [x] **Refactor** `create-app.mjs` para testes sem `listen`; smoke Vitest; `docs/openapi.yaml`; erros HTTP no cliente
- [x] **Activity JSON** + rate limit + Helmet (prod) + CORS (`CORS_ORIGINS`) + CI GitHub Actions
- [x] **Pino** + `pino-http` (`LOG_LEVEL`); **Dockerfile** + `docker-compose.yml`; **componentes** (`HubHeader`, `AgentsSidebar`, `MainWorkspace`, `ActivityPanel`, `CommandCenterView`, `TaskCanvasView`, `DoubtsChatPanel`, `AioxCliPanel`, …); **GET agente** + modal; **Esc** fecha erro/modal; **MASK_PATHS_IN_UI**
- [x] **Tema** claro/escuro + **gavetas móveis** (`<lg`) para agentes e feed
- [x] **POST /api/aiox/exec** (`doctor` / `info`) + painel na área de trabalho
- [x] **Refinamentos UX**: polling silencioso (sem ícone a girar a cada ciclo); erro não apagado pelo auto-refresh até nova sincronização OK; avisos/toasts com fecho; **skip link** com foco no `main`; **scroll lock** com modal/gavetas; saída CLI com **copiar**; toasts longos com timeout maior
- [x] **Feed de atividade em PostgreSQL** opcional (`DATABASE_URL`, tabela `mission_activity_log`; fallback JSON; `activityBackend` em `/api/aiox/info`)
- [x] **Central de agentes** (layout OpenClaw): vista alternativa com canvas + terminal + `GET /api/aiox/metrics` e `GET /api/aiox/weather`
- [x] **Agentes `.md`**: `POST /api/aiox/agents` (criar), `PUT …/:id` (gravar), `DELETE …/:id` (eliminar); UI **Novo** na sidebar + modal de criação (`CreateAgentModal`); modal de detalhe com **Editar** / **Eliminar**; `MISSION_AGENT_EDIT=0` só leitura
- [x] **Marca Architecture Agents Hub**: copy na UI (header, sidebar, área de trabalho, Central), `index.html`, canvas/terminal (`office.js`, `mission-boot.js`), README, OpenAPI (`info.title`), MCP/CHECKLIST; **mantidos** por compatibilidade: rotas `/api/aiox/*`, env `AIOX_*`, nome do pacote npm `mission-agent`, campo `service` em `/api/health`
- [x] **Modal de agente** (`AgentDetailModal`): contexto "Architecture Agents Hub" + título **Definição do agente** + id do `.md` em mono; erros sem prefixo `Error:` (`formatUserFacingError`); barra de erro global idem
- [x] **Cliente / API**: se a resposta não for JSON (ex.: HTML `Cannot GET`), mensagem orientativa; **sem** prefixo "Pedido inválido" nesse caso; `vite.config.ts` com `preview.proxy` / `server.proxy` como fallback quando `MISSION_EMBED_API=0`
- [x] **`npm run dev` / `preview`**: plugin Vite (`mission-api-plugin.mjs`) **embebe** `createBridgeApp` em `/api` (sem precisar de :8787); `MISSION_EMBED_API=0` volta ao proxy → 8787; **`dev:split`** mantém `concurrently`; **header** com indicador API ligada/offline; **modal de agente** com aviso, retry e UI melhorada
- [x] **Canvas de tarefas modular** (`task-canvas/`): terceira vista no header (ícone Kanban); colunas fixas `todo`→`doing`→`review`→`done`; **presets** (Fluxo geral / Agentes / Entrega); drag-and-drop entre colunas + setas; **reordenar na coluna** por zonas entre cartões (só com ordenação **manual** e sem filtro; caso contrário `moveTask` sem índice / drop na coluna = fim da lista); persistência `localStorage` (`mission-agent-task-board-v1`) com **debounce** (~450 ms) e gravação em **`beforeunload`**; **filtro** por texto (título/nota); **ordenar** por coluna (manual / mais recentes / prioridade), preferência `mission-agent-task-canvas-sort`; **import/export JSON** + **limpar tudo** na barra
- [x] **Refinamentos API**: `rate-limit-json` (429 em JSON + `retryAfterSec`); **404** JSON para `/api` desconhecido; **erros de parse JSON** / payload; `GET /agents` 500 só `{ ok, error }`; `readAgentFiles` com try/catch; cliente (`api.ts`) mensagens para **429**; smoke + OpenAPI (`info.description`: Canvas local + opcional **`task-board`** REST)
- [x] **Ambiente local**: [`.env.ready`](../.env.ready) versionado; `npm run env:init` + `postinstall`; **`dotenv`** + [`server/load-env.mjs`](../server/load-env.mjs) (Express e Vite embebido); `.env` e `.env.local` no `.gitignore`
- [x] **`GET /api/aiox/overview`**: ponte + lista de agentes + logs + `activity.kindCounts` + `doubts.llmEnabled` num só pedido — o **polling** da app usa esta rota em vez de `info` + `agents` + `activity` em paralelo (`bridge.taskBoard` espelha `info`)
- [x] **Canvas no servidor (opt-in)**: **`GET`/`PUT /api/aiox/task-board`** — ficheiro JSON (`MISSION_TASK_BOARD_PATH`, por defeito `.mission-agent/task-board.json`); **`If-Match`** com `revision` (mtime:size) e **409** em conflito; resumo em **`GET /api/aiox/info`** (`taskBoard.revision` / `taskCount`); cliente com **`VITE_TASK_BOARD_SYNC=1`** sincroniza após carga inicial (servidor prevalece se tiver tarefas; senão envia quadro local)
- [x] **Painel Dúvidas — streaming LLM**: **`POST /api/aiox/doubts/chat/stream`** (`text/event-stream`, deltas SSE); **`GET /api/aiox/doubts`** inclui **`streamAvailable`**; UI (`DoubtsChatPanel`) consome stream e actualiza a bolha do assistente em tempo real; **`POST /api/aiox/doubts/chat`** (JSON completo) mantém-se para clientes que não usem stream
- [x] **Feed**: campo opcional **`kind`** (`command` | `bridge` | `agent` | `cli`); coluna PostgreSQL `kind`; persistência JSON com escrita **atómica** (ficheiro temp + rename); ícones no painel de atividade
- [x] **Agentes**: resposta GET com **`revision`** (`mtime:size`); PUT com **`If-Match`** / `revision` → **409** `conflict` se o `.md` mudou no disco
- [x] **Canvas de tarefas**: campos opcionais **`priority`** e **`blocked`** (import/export e UI com etiqueta e toggle *Bloqueio*)
- [x] **UI vista Hub**: cartão *Estado da ponte* (grelha de métricas, badge ponte OK/atenção, botão sincronizar); sidebar de agentes com ícone/cor; feed vazio com instruções; mascote no header/sidebar/modal (ficheiro em `public/`)
- [x] **Sincronização entre abas**: Task Canvas publica eventos de equipa em `POST /api/aiox/activity/event`; o Hub escuta `mission-team-activity` e força refresh silencioso para refletir atividade em Estado/Integrações/Feed
- [x] **Integrações com alertas e histórico**: `GET /api/aiox/integrations-status` devolve `alerts` + `history`; com `validate=1` persiste snapshots de saúde para tendência operacional

---

## Melhorias técnicas (prioridade)

### Alta

- [x] **Testes automatizados**: Vitest + Supertest — **39** testes em 3 ficheiros (`test/api.smoke.test.mjs`, `test/fish-api.test.mjs`, `test/e2e-basic-flow.test.mjs`): cobertura de `health/info/overview`, `doubts` (JSON + SSE), `integrations-status` (incl. `alerts/history` e snapshot com `validate=1`), `task-board`, `activity/event`, CRUD de agentes, `exec`, fish API, e fluxo E2E básico (atividade + integrações) (`npm test`)
- [x] **Validação de entrada**: limite no servidor + `maxLength` no input e mensagens de erro alinhadas
- [x] **Tratamento de erro HTTP** no cliente: rede (`TypeError`) vs 4xx/5xx com prefixos legíveis
- [x] **Persistência do feed**: JSON em `MissionAgent/.mission-agent/activity.json` ou `MISSION_ACTIVITY_PATH`

### Média

- [x] **OpenAPI / contrato**: `docs/openapi.yaml` (OpenAPI 3.0)
- [x] **Rate limiting** no `POST /api/aiox/command` (`express-rate-limit`, configurável via `COMMAND_RATE_MAX`); **PUT** agentes com `AGENT_EDIT_RATE_MAX` por agente/IP
- [x] **Logs estruturados** no servidor (pino + pino-http; `LOG_LEVEL`)
- [x] **Dockerfile** + `docker-compose.yml` (montagem do aiox-core; sem nginx por defeito)

### Baixa

- [x] **CI** (GitHub Actions): workflow `Mission Agent CI` em `.github/workflows/mission-agent-ci.yml` — `npm ci`, `npm test`, `npm run build`. **Repo só com esta pasta:** workflow na raiz do clone (ver `MissionAgent/.github/...`). **Monorepo** `AgentesMissao` (pasta pai): cópia alternativa em `AgentesMissao/.github/...` com `working-directory: MissionAgent` e paths `MissionAgent/**`
- [x] **Separar** `App.tsx` em componentes (`HubHeader`, `AgentsSidebar`, `MainWorkspace`, `ActivityPanel`, `MobileSummary`, `AgentDetailModal`, `CommandCenterView`, `TaskCanvasView`, `DoubtsChatPanel`, …)

---

## Produto / UX

- [x] **Responsive**: em `<lg`, agentes e atividade em **gavetas** (`MobileDrawer`) + atalhos no header e no resumo móvel
- [x] **Tema claro/escuro**: toggle no header + `localStorage` (`mission-agent-theme`) + variáveis `:root` / `.dark`
- [x] **“Saltar para conteúdo”**: skip link → `#conteudo-principal` com foco visível; alvo presente no **Hub** (`MainWorkspace`), **Central** e **Canvas de tarefas** (`main` com `tabIndex={-1}`)
- [x] **Detalhe do agente**: modal com preview `.md` (`GET /api/aiox/agents/:id`) + edição quando permitido
- [x] **Atalhos**: Esc fecha painel **Dúvidas** → modais → gavetas → erro; Enter submete o comando
- [x] **Identidade visual**: produto apresentado como **Architecture Agents Hub** na UI e documentação (ver refinamentos)
- [x] **Dúvidas & ajuda**: botão no header (ícone mensagem) → painel lateral com **FAQ** + **chat** (`sessionStorage`); com **`MISSION_DOUBTS_LLM=1`** + chave, **POST** `/api/aiox/doubts/chat` e UI com resposta do modelo; **GET** `/api/aiox/doubts` + `MISSION_DOUBTS_HELP_URL`; **import** / **export** JSON, Markdown, **copiar**, **limpar**; atalho **Ctrl+/** ou **Cmd+/**; `DoubtsChatPanel`

---

## Melhorias (roadmap)

| Prioridade | Melhoria | Notas |
|------------|----------|--------|
| Média | **Chat com LLM no servidor** | **Parcial:** `POST /api/aiox/doubts/chat` (JSON) e **`POST /api/aiox/doubts/chat/stream`** (SSE / streaming na UI); `streamAvailable` em `GET /api/aiox/doubts`. Evoluir: **quotas/custos**, política de dados explícita; chaves só no servidor |
| Média | **Ligação opcional a base de conhecimento** | Indexar `docs/` ou Notion para respostas contextualizadas (MCP já cobre parte no IDE) |
| ~~Baixa~~ | ~~**Exportar histórico do painel Dúvidas**~~ | **Feito:** botões JSON + Markdown em `DoubtsChatPanel` |
| ~~Baixa~~ | ~~**Atalho de teclado** para Dúvidas~~ | **Feito:** `Ctrl+/` / `Cmd+/` toggle global (ignorado dentro de `input`/`textarea`/contenteditable) |
| ~~Baixa~~ | ~~**Importar histórico JSON** + copiar mensagem~~ | **Feito:** `Importar` (array ou `{ messages }`), botão copiar por bolha, `maxLength` na nota |
| ~~Baixa~~ | ~~**Canvas de tarefas: export/import JSON**~~ | **Feito:** botões Importar / Exportar / Limpar tudo em `TaskCanvasView`; formato `{ version, exportedAt, tasks }` ou array |
| ~~Baixa~~ | ~~**Canvas de tarefas: ordem dentro da coluna**~~ | **Feito:** zonas de inserção entre cartões com ordenação *Manual* e sem filtro; `moveTask(id, col, toIndex)` |
| ~~Baixa~~ | ~~**Canvas de tarefas: pesquisa / filtro**~~ | **Feito:** campo *Filtrar* (título/nota); ordenação opcional; dados em `localStorage` só pelo estado do quadro (não pelo filtro) |
| ~~Média~~ | ~~**Canvas de tarefas: persistência no servidor**~~ | **Feito:** `GET`/`PUT /api/aiox/task-board`, ficheiro no processo Node, UI `VITE_TASK_BOARD_SYNC`. *Ainda sem* auth nem isolamento por utilizador (ver Pendências) |

---

## Integração `aiox-core`

- [x] **Comando real opcional**: `POST /api/aiox/exec` (`doctor` \| `info`), `ENABLE_AIOX_CLI_EXEC` + `AIOX_EXEC_SECRET`, rate limit, timeout; UI `AioxCliPanel` quando disponível
- [x] **Variável `AIOX_CORE_PATH`** documentada em `.env.example` na raiz do workspace e em `MissionAgent/.env.example`
- [x] **Sincronização com documentação** — link opcional via `VITE_AIOX_DOCS_URL` na área de trabalho

## Integrações MCP / LLM / Notion / Figma

- [x] **Documentação**: [docs/INTEGRATIONS.md](./INTEGRATIONS.md) (MCP hub + Notion/Figma/LLM no Cursor, processo Notion/Figma, diagrama); exemplo [docs/cursor-mcp.stack.example.json](./docs/cursor-mcp.stack.example.json); `.env.example` com placeholders comentados para chaves futuras
- [x] **Painel Integrações**: `GET /api/aiox/integrations-status` (com `validate=1`) valida env keys no servidor via HTTP leve e mostra “OK/falhou” (OpenAI/Notion/Figma)
- [ ] **Operacional**: configurar no Cursor os servidores MCP Notion e Figma com tokens (fora do Git) e validar “connect”/leitura

---

## Segurança e operações

- [x] **CORS** restrito em produção (`CORS_ORIGINS`; dev mantém `origin: true`)
- [x] **Helmet** no Express quando `NODE_ENV=production` (CSP desactivada para compatibilidade com o bundle Vite)
- [x] **Não expor** caminhos absolutos na UI/API quando `MASK_PATHS_IN_UI=1` (mostra `…/último-segmento`)

---

## Pendências conhecidas

| Item | Nota |
|------|------|
| LLM | **Opcional** no painel Dúvidas (`POST /api/aiox/doubts/chat`, env); não substitui o modelo do **IDE** para edição — ver roadmap «Chat com LLM no servidor» (streaming, quotas em aberto) |
| Autenticação | Não implementada; não expor a internet sem reverse proxy + auth |
| Multi-utilizador | Feed persistido em ficheiro local; ainda sem isolamento por sessão/utilizador |
| Nome npm | Pacote continua `mission-agent` (pasta `MissionAgent/`); mudança só relevante se publicar no npm |
| Só UI sem API | Com API **embebida** no Vite, `/api` deve responder no **mesmo host/porta** do Vite. Se usares **`MISSION_EMBED_API=0`**, é preciso Express em **8787** (`preview:all`, `dev:split`, ou `build`+`start`) |
| Canvas de tarefas | Com **`VITE_TASK_BOARD_SYNC`**, o quadro sincroniza com ficheiro no servidor (mesma origem que a API). *Sem* utilizadores distintos nem quotas — não substitui backlog multi-equipa com auth |

---

## Validação periódica

- Registo de auditorias (datas, contagem de testes, lacunas): **[CHECKLIST-VALIDATION.md](./CHECKLIST-VALIDATION.md)**.
- Em cada revisão formal, actualizar a linha **Última revisão** no topo deste ficheiro e o registo em `CHECKLIST-VALIDATION.md`.
- Checklist **accionável** (arranque, PR, release, roadmap aberto): **[CHECKLIST-OPERACIONAL.md](./CHECKLIST-OPERACIONAL.md)**.

---

## Como usar este ficheiro

1. Ao fechar uma tarefa, marcar `[x]` e opcionalmente mover para **Concluído**.
2. Novas ideias: adicionar na tabela **Melhorias (roadmap)** ou em **Pendências** com uma linha de contexto.
3. Revisão periódica (ex.: sprint): arquivar itens obsoletos noutro ficheiro `CHECKLIST-ARCHIVE.md` se necessário.
4. **Processo de equipa:** novo projecto ou mudança de escopo → actualizar a base de conhecimento acordada (ex.: Notion / OpenAPI) **antes** de expandir código, para manter contrato e desenho alinhados.
5. **Validação vs. código:** seguir o passo-a-passo em [CHECKLIST-VALIDATION.md](./CHECKLIST-VALIDATION.md) e actualizar o registo após mudanças relevantes na API ou no painel Dúvidas.
