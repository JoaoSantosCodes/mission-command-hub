# Architecture Agents Hub — melhorias e pendências

Checklist vivo: marca com `[x]` quando concluído. **Última revisão:** 2026-03-20 (revisão de conteúdo + alinhamento com código e testes).

---

## Concluído (baseline)

- [x] API Express: `health`, `info`, `agents` (lista + GET por id + **PUT** edição `.md`), `activity`, `command`, `metrics`, `weather`, `exec` (opt-in)
- [x] Leitura de agentes `.md` em `aiox-core/.aiox-core/development/agents/`
- [x] Versão CLI via `bin/aiox.js --version`
- [x] UI 3 colunas + feed + barra de comando; vista alternativa **Central** (canvas + terminal)
- [x] Proxy Vite `/api` → porta da API
- [x] Build produção: `dist` servido pelo Express

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
- [x] **Pino** + `pino-http` (`LOG_LEVEL`); **Dockerfile** + `docker-compose.yml`; **componentes** (`HubHeader`, `AgentsSidebar`, `MainWorkspace`, `ActivityPanel`, `CommandCenterView`, `AioxCliPanel`, …); **GET agente** + modal; **Esc** fecha erro/modal; **MASK_PATHS_IN_UI**
- [x] **Tema** claro/escuro + **gavetas móveis** (`<lg`) para agentes e feed
- [x] **POST /api/aiox/exec** (`doctor` / `info`) + painel na área de trabalho
- [x] **Refinamentos UX**: polling silencioso (sem ícone a girar a cada ciclo); erro não apagado pelo auto-refresh até nova sincronização OK; avisos/toasts com fecho; **skip link** com foco no `main`; **scroll lock** com modal/gavetas; saída CLI com **copiar**; toasts longos com timeout maior
- [x] **Feed de atividade em PostgreSQL** opcional (`DATABASE_URL`, tabela `mission_activity_log`; fallback JSON; `activityBackend` em `/api/aiox/info`)
- [x] **Central de agentes** (layout OpenClaw): vista alternativa com canvas + terminal + `GET /api/aiox/metrics` e `GET /api/aiox/weather`
- [x] **Editar agente**: `PUT /api/aiox/agents/:id` + modal com textarea (definição completa `.md`; skill/persona no YAML); `MISSION_AGENT_EDIT=0` só leitura
- [x] **Marca Architecture Agents Hub**: copy na UI (header, sidebar, área de trabalho, Central), `index.html`, canvas/terminal (`office.js`, `mission-boot.js`), README, OpenAPI (`info.title`), MCP/CHECKLIST; **mantidos** por compatibilidade: rotas `/api/aiox/*`, env `AIOX_*`, nome do pacote npm `mission-agent`, campo `service` em `/api/health`

---

## Melhorias técnicas (prioridade)

### Alta

- [x] **Testes automatizados**: Vitest + Supertest — **15** casos em `test/api.smoke.test.mjs`: `health`, métricas, tempo, `info` (incl. `activityBackend`, `agentEditAllowed`), lista de agentes, `exec` 503/403, validação de `command`, GET agente 404, **PUT** grava `.md` + 403 com `MISSION_AGENT_EDIT=0`, caminhos mascarados, persistência do feed entre instâncias (`npm test`)
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
- [x] **Separar** `App.tsx` em componentes (`HubHeader`, `AgentsSidebar`, `MainWorkspace`, `ActivityPanel`, `MobileSummary`, `AgentDetailModal`, `CommandCenterView`, …)

---

## Produto / UX

- [x] **Responsive**: em `<lg`, agentes e atividade em **gavetas** (`MobileDrawer`) + atalhos no header e no resumo móvel
- [x] **Tema claro/escuro**: toggle no header + `localStorage` (`mission-agent-theme`) + variáveis `:root` / `.dark`
- [x] **“Saltar para conteúdo”**: skip link com foco visível (outline) em `index.css`
- [x] **Detalhe do agente**: modal com preview `.md` (`GET /api/aiox/agents/:id`) + edição quando permitido
- [x] **Atalhos**: Esc fecha modal → gavetas → erro; Enter submete o comando
- [x] **Identidade visual**: produto apresentado como **Architecture Agents Hub** na UI e documentação (ver refinamentos)

---

## Integração `aiox-core`

- [x] **Comando real opcional**: `POST /api/aiox/exec` (`doctor` \| `info`), `ENABLE_AIOX_CLI_EXEC` + `AIOX_EXEC_SECRET`, rate limit, timeout; UI `AioxCliPanel` quando disponível
- [x] **Variável `AIOX_CORE_PATH`** documentada em `.env.example` na raiz do workspace e em `MissionAgent/.env.example`
- [x] **Sincronização com documentação** — link opcional via `VITE_AIOX_DOCS_URL` na área de trabalho

---

## Segurança e operações

- [x] **CORS** restrito em produção (`CORS_ORIGINS`; dev mantém `origin: true`)
- [x] **Helmet** no Express quando `NODE_ENV=production` (CSP desactivada para compatibilidade com o bundle Vite)
- [x] **Não expor** caminhos absolutos na UI/API quando `MASK_PATHS_IN_UI=1` (mostra `…/último-segmento`)

---

## Pendências conhecidas

| Item | Nota |
|------|------|
| Motor LLM | Fora de âmbito — hub não substitui IDE/CLI |
| Autenticação | Não implementada; não expor a internet sem reverse proxy + auth |
| Multi-utilizador | Feed persistido em ficheiro local; ainda sem isolamento por sessão/utilizador |
| Nome npm | Pacote continua `mission-agent` (pasta `MissionAgent/`); mudança só relevante se publicar no npm |

---

## Como usar este ficheiro

1. Ao fechar uma tarefa, marcar `[x]` e opcionalmente mover para **Concluído**.
2. Novas ideias: adicionar em **Melhorias** ou **Pendências** com uma linha de contexto.
3. Revisão periódica (ex.: sprint): arquivar itens obsoletos noutro ficheiro `CHECKLIST-ARCHIVE.md` se necessário.
4. **Processo de equipa:** novo projecto ou mudança de escopo → actualizar a base de conhecimento acordada (ex.: Notion / OpenAPI) **antes** de expandir código, para manter contrato e desenho alinhados.
