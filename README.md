# Architecture Agents Hub

<p align="center">
  <img src="./@img/placeholder-readme.svg" width="160" height="160" alt="Mascote Architecture Agents Hub — placeholder" />
</p>

<p align="center">
  <a href="https://github.com/JoaoSantosCodes/mission-command-hub/actions/workflows/ci.yml">
    <img src="https://github.com/JoaoSantosCodes/mission-command-hub/actions/workflows/ci.yml/badge.svg" alt="CI/CD Status">
  </a>
  <a href="https://github.com/JoaoSantosCodes/mission-command-hub/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/JoaoSantosCodes/mission-command-hub" alt="License">
  </a>
  <a href="https://github.com/JoaoSantosCodes/mission-command-hub/issues">
    <img src="https://img.shields.io/github/issues/JoaoSantosCodes/mission-command-hub" alt="Issues">
  </a>
  <a href="https://github.com/JoaoSantosCodes/mission-command-hub/pulls">
    <img src="https://img.shields.io/github/issues-pr/JoaoSantosCodes/mission-command-hub" alt="Pull Requests">
  </a>
</p>

<p align="center">
  <strong>Hub funcional que combina UI inspirada no ai-orchestration-hub-main com ponte ao repositório aiox-core</strong>
</p>

## 🏗️ Arquitetura e Tecnologias

### **Frontend**
- **React 18** - Framework UI moderno com hooks
- **TypeScript** - Tipagem estática para maior confiabilidade
- **Vite** - Build tool rápido e moderno
- **Tailwind CSS** - Framework CSS utilitário
- **Framer Motion** - Animações fluidas
- **Lucide React** - Ícones consistentes

### **Backend**
- **Node.js ≥ 20** - Runtime JavaScript moderno
- **Express.js** - Framework web minimalista
- **PostgreSQL** - Banco de dados relacional (opcional)
- **MCP SDK** - Protocolo Model Context Protocol

### **Qualidade e DX**
- **ESLint v9** - Linting moderno
- **Prettier** - Formatação automática
- **Vitest** - Testes unitários e integração
- **Husky** - Git hooks automatizados
- **GitHub Actions** - CI/CD pipeline

### **Integrações**
- **OpenAI API** - LLM para dúvidas e assistentes
- **Figma API** - Contexto de design
- **Notion API** - Documentação e bases de conhecimento
- **Slack** - Notificações em tempo real

---

Hub funcional que combina a **UI** inspirada no `ai-orchestration-hub-main` com uma **ponte** ao repositório **`aiox-core`** no disco: lê definições de agentes (`.aiox-core/development/agents/*.md`), obtém a versão da CLI (`bin/aiox.js --version`) e regista comandos no feed de atividade (JSON no disco ou **PostgreSQL** opcional via `DATABASE_URL`, com fallback para ficheiro se a ligação falhar).

> Projeto autocontido em `MissionAgent/`: mantém docs, imagens (`@img/`) e scripts de validação aqui dentro.

---

## Estado atual (resumo)

- **Integrações em cards:** tab dedicada na sidebar com serviços por cartão e estados **OK/Pendente**.
- **Validação real no servidor:** `GET /api/aiox/integrations-status?validate=1` faz checks HTTP leves para o **LLM** (sondagem configurável; `MISSION_LLM_VALIDATE=0` para saltar), Notion e Figma.
- **Saúde das integrações:** score global (%) + `ok/total` + hora da última validação.
- **Alertas e histórico operacional:** o endpoint devolve `alerts` e `history` para destacar pendências ativas e tendência de saúde das integrações.
- **Sincronização entre abas:** ações no Task Canvas publicam eventos em `POST /api/aiox/activity/event` e atualizam feed/estado sem esperar só pelo polling.
- **Slack (opcional):** com `SLACK_WEBHOOK_URL` (Incoming Webhook), o feed da equipa é espelhado num canal Slack para acompanhamento em tempo quase real.
- **Aquário visual:** permanece na vista **Central de agentes** (Command Center), com persistência em ficheiro.
- **Contexto Figma no Canvas:** endpoint `POST /api/aiox/figma/context` para leitura de contexto de design (file/node/depth), com estado no cartão e guardrail no botão **Retorno** quando existe link Figma na tarefa.
- **Config de integrações resistente a updates parciais:** `PUT /api/aiox/integrations-config` agora faz **merge** com a configuração atual (evita perda de chaves já salvas como Notion/Slack ao atualizar só uma integração).

### Refinamentos recentes (2026-03-24)

- Task Canvas com fluxo Figma assistido:
  - botão `Figma` para ler contexto por tarefa;
  - badge `Figma OK` e resumo (`ficheiro`, `rootType`, `nós`);
  - popover de detalhes (`version`, `lastModified`, copiar valores);
  - bloqueio de `Retorno` até leitura do contexto quando houver URL Figma na nota.
- API nova de contexto:
  - `POST /api/aiox/figma/context` (documentada em `docs/openapi.yaml`);
  - erros explícitos para token ausente/configuração inválida.
- Persistência de integrações reforçada:
  - updates parciais preservam dados existentes;
  - teste automatizado cobrindo merge parcial sem perda.

---

## Tour pela interface

### Vista Hub — três colunas (agentes, área de trabalho, feed)

Barra superior com **mascote**, estado **API ligada** (`/api`), comando global **`@hub`**, alternador de vistas e tema. Sidebar com projecto, caminho do `aiox-core`, lista de agentes **`.md`** e botão **+ Novo**. A tab **Integrações** mostra cards por serviço com status **OK/Pendente**. Centro: cartão **Estado da ponte** (versão CLI, pasta de agentes, polling, feed). À direita: **Feed de atividade**. As abas partilham o mesmo feed e refletem eventos de equipa (ex.: mudanças no Task Canvas) quase em tempo real.

| Tema escuro | Tema claro |
|-------------|------------|
| ![Vista Hub — tema escuro: sidebar, estado da ponte, feed](./@img/placeholder-readme.svg) | ![Vista Hub — tema claro](./@img/placeholder-readme.svg) |

### Central de agentes — escritório isométrico

Vista **monitor** no header: sala com agentes em mesas, registo de actividade, métricas e tempo via API (`/api/aiox/metrics`), clique num agente para abrir o Markdown.

![Central de agentes — escritório pixel art, estado do hub e registo](./@img/placeholder-readme.svg)

### Definição do agente (modal)

Ao escolher um agente na lista, abre-se o modal com o conteúdo **`.md`**, caminho do ficheiro e acções **Editar** / **Eliminar** (quando `MISSION_AGENT_EDIT` permite).

![Modal Definição do agente — preview e edição do .md](./@img/placeholder-readme.svg)

### Canvas de tarefas (Kanban modular)

Vista **Kanban** no header: colunas **Backlog → Em curso → Revisão → Feito**, presets (ex.: Fluxo geral), **filtrar** por texto (título ou nota), **ordenar** cada coluna (ordem do quadro, data ou prioridade — a preferência de ordenação fica em `localStorage`). Com ordenação **manual** e sem filtro, aparecem **zonas entre cartões** para **reordenar dentro da coluna** (arrastar e largar). **Importar / exportar JSON**, persistência em `localStorage` com escrita **debounced** e gravação ao fechar o separador. Opcionalmente, com **`VITE_TASK_BOARD_SYNC=1`** no build, o quadro sincroniza com **`GET`/`PUT /api/aiox/task-board`** (ficheiro no servidor, cabeçalho `If-Match` / conflito **409**).

![Canvas modular — quatro colunas, módulo Fluxo geral](./@img/placeholder-readme.svg)

### Dúvidas & ajuda — Chat e FAQ

Painel lateral (**ícone mensagem** ou **Ctrl+/**): notas de sessão, export **JSON** / **Markdown**, separadores **Chat** e **FAQ**. Com **`MISSION_DOUBTS_LLM=1`** e chave no servidor, o chat usa **`POST /api/aiox/doubts/chat/stream`** (resposta em streaming); existe ainda **`POST /api/aiox/doubts/chat`** (JSON único) para integrações.

![Canvas de tarefas com painel Dúvidas — separador Chat](./@img/placeholder-readme.svg)

![Painel Dúvidas — separador FAQ (API, agentes, Notion/Figma, LLM)](./@img/placeholder-readme.svg)

---

## Requisitos

- Node.js ≥ 20
- Estrutura local `.aiox-core/` dentro de `MissionAgent/` (ou define `AIOX_CORE_PATH`)

## Arranque

```bash
cd MissionAgent
npm install
npm run dev
```

- **`npm install`** corre `postinstall` → **`npm run env:init`**: se ainda não existir **`.env`**, é criado a partir de **[`.env.ready`](./.env.ready)** — preenche **`MISSION_LLM_API_KEY`** (qualquer fornecedor compatível) ou **`OPENAI_API_KEY`** (legado), e opcionalmente **`MISSION_LLM_BASE_URL`** / **`MISSION_LLM_MODEL`**. O servidor carrega **`.env`** e **`.env.local`** via [`server/load-env.mjs`](./server/load-env.mjs).
- **LLM no painel Dúvidas:** edita **`.env`**, define **`MISSION_LLM_API_KEY`** (mín. 8 caracteres) e **`MISSION_DOUBTS_LLM=1`**, reinicia `npm run dev`. Se o host não tiver lista de modelos em `/v1/models`, usa **`MISSION_LLM_VALIDATE=0`**. Enquanto a chave faltar, `GET /api/aiox/doubts` reporta `llmEnabled: false`.
- **`npm run dev` (defeito):** um só processo **Vite** na porta **5179** com a ponte Express **embebida** em `/api` (sem processo separado na 8787) — evita API “antiga” na 8787 quando o código muda. UI: **http://localhost:5179/**; **`GET /api/health`** inclui `capabilities.taskBoardAgentStep` para confirmar rotas recentes.
- **`npm run dev:split`** — **Express** em **`http://127.0.0.1:8787`** + **Vite** com **`MISSION_EMBED_API=0`** e proxy `/api` → **8787** (paridade com dois processos; **reinicia o Express** após puxar código novo).
- **`npm run dev:embed`** — igual ao **`npm run dev`** (com `init-env` explícito antes do Vite).
- **`MISSION_EMBED_API=0`** — obrigatório no Vite quando corres Express à parte (o script `dev` já define isto no processo do Vite). Ver `.env.example`.

## Desenvolvimento

### 🛠️ Ferramentas e Qualidade de Código

Este projeto utiliza uma suíte completa de ferramentas para garantir qualidade e consistência:

#### **Linting e Formatação**
- **ESLint v9** - Regras modernas para TypeScript + React
- **Prettier** - Formatação automática consistente
- **Scripts disponíveis:**
  ```bash
  npm run lint          # Verificar código
  npm run lint:fix      # Corrigir problemas automaticamente
  npm run format        # Formatar arquivos
  npm run format:check  # Verificar formatação
  ```

#### **Testes**
- **Vitest** - Framework de testes rápido e moderno
- **Cobertura completa** - 51 testes passando (100%)
- ```bash
  npm test              # Executar todos os testes
  ```

#### **Git Hooks Automatizados**
- **Husky** + **lint-staged** - Pre-commit hooks que executam:
  - ESLint com correção automática
  - Prettier para formatação
  - Apenas nos arquivos modificados

#### **CI/CD**
- **GitHub Actions** - Pipeline automatizada que roda em push/PR:
  - ✅ Linting e formatação
  - ✅ Testes completos
  - ✅ Build de produção
  - ✅ Auditoria de segurança

#### **Configurações do Editor**
- **VS Code** - Settings otimizadas (`.vscode/settings.json`)
- **EditorConfig** - Consistência cross-editor
- **Extensões recomendadas** - TypeScript, ESLint, Prettier, Tailwind

### 📋 Contribuindo

1. **Clone e setup:**
   ```bash
   git clone https://github.com/JoaoSantosCodes/mission-command-hub.git
   cd MissionAgent
   npm install
   ```

2. **Desenvolvimento:**
   ```bash
   npm run dev          # Servidor de desenvolvimento
   ```

3. **Antes de commitar:**
   - Os git hooks executam automaticamente linting e formatação
   - Certifique-se que todos os testes passam: `npm test`

4. **Pull Request:**
   - O CI/CD validará automaticamente seu código
   - Verifique os status checks no GitHub

> 📖 Para instruções detalhadas, veja [CONTRIBUTING.md](./CONTRIBUTING.md)

### 🏗️ Build e Deploy

```bash
npm run build         # Build otimizado para produção
npm run preview       # Preview do build local
npm run start         # Servidor de produção
```

## 🚀 Roadmap

### **Próximas Features**
- [ ] **Deploy automatizado** - GitHub Actions para staging/production
- [ ] **Cobertura de testes** - Relatórios detalhados de cobertura
- [ ] **Performance monitoring** - Métricas e otimização
- [ ] **PWA Support** - Funcionalidades offline
- [ ] **Multi-tenancy** - Suporte a múltiplos usuários/equipes
- [ ] **API Rate limiting avançado** - Controle granular por endpoint
- [ ] **Backup automático** - Estratégia de backup para dados críticos

### **Melhorias Técnicas**
- [ ] **Code splitting** - Otimização de bundles
- [ ] **Service worker** - Cache inteligente
- [ ] **Error boundaries** - Tratamento robusto de erros
- [ ] **Accessibility** - Conformidade WCAG
- [ ] **Internationalization** - Suporte multi-idioma
- [ ] **Dark mode persistente** - Memória de preferência

### **Integrações Futuras**
- [ ] **GitHub Integration** - Sincronização com repositórios
- [ ] **Jira/Linear** - Gerenciamento de tarefas
- [ ] **Discord** - Alternativa ao Slack
- [ ] **Google Workspace** - Documentos e calendar
- [ ] **Miro/Figma avançado** - Colaboração visual

---

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `AIOX_CORE_PATH` | Raiz do **projeto AIOX** (pasta que contém `.aiox-core`). Por defeito o servidor usa a raiz do `MissionAgent/` |
| `AIOX_AGENTS_DIR` | (Opcional) Caminho absoluto à pasta dos `.md` dos agentes; quando definido, ignora `resource_locations.agents_dir` nos YAML |
| `PORT` | Porta em **`npm start`** / processo Express isolado (por defeito: `8787`) |
| `MISSION_EMBED_API` | `0` — Vite encaminha `/api` para Express **:8787** (usado pelo **`npm run dev:split`**). Omitir (defeito) com **`npm run dev`** / **`preview`** embebe a API no Vite |
| `MISSION_ACTIVITY_PATH` | Ficheiro JSON do feed (por defeito: `MissionAgent/.mission-agent/activity.json`) |
| `MISSION_TASK_BOARD_PATH` | Ficheiro JSON do quadro Kanban (por defeito: `MissionAgent/.mission-agent/task-board.json`; rotas `GET`/`PUT /api/aiox/task-board`) |
| `MISSION_TASK_RUNS_PATH` | Ficheiro JSON dos runs de execução automática (fallback quando não há PostgreSQL) |
| `MISSION_FISH_PATH` | Ficheiro JSON do aquário (por defeito: `MissionAgent/.mission-agent/fish-state.json`) |
| `TASK_BOARD_PUT_RATE_MAX` | Máximo de `PUT /api/aiox/task-board` por IP por minuto (por defeito `45`) |
| `MISSION_TASK_AUTORUN` | `1` (defeito) activa auto-run de tarefas em `todo` com `assigneeAgentId`; `0` desliga |
| `MISSION_TASK_AUTORUN_POLL_MS` | Intervalo de varrimento do auto-run (1500–60000 ms; por defeito `5500`) |
| `MISSION_TASK_AGENT_ALLOWLIST` | Policy por agente para capacidades do runner. Ex.: `*:agentStep;aiox-master:agentStep,exec:doctor` |
| `DATABASE_URL` | (Opcional) URI PostgreSQL; activa persistência do feed na tabela `mission_activity_log` |
| `PG_POOL_MAX` | (Opcional) Máximo de ligações no pool `pg` (por defeito: `10`) |
| `NOTION_TOKEN` | (Opcional) Token para validar integração Notion no endpoint `integrations-status` |
| `FIGMA_ACCESS_TOKEN` | (Opcional) Token para validar integração Figma no endpoint `integrations-status` |
| `MISSION_INTEGRATIONS_TIMEOUT_MS` | (Opcional) Timeout por validação externa (sondagem LLM / Notion / Figma) em `integrations-status` |
| `WEATHER_LOCATION` | Cidade para `GET /api/aiox/weather` (widget na **Central**; wttr.in) |
| `MISSION_AGENT_EDIT` | `0` desactiva **criar / editar / eliminar** ficheiros de agente (`POST`/`PUT`/`DELETE` `/api/aiox/agents…` e botões na UI); omitir = permitir |
| `AGENT_EDIT_RATE_MAX` | Máximo de `PUT` por agente por IP/min (por defeito `30`) |
| `CORS_ORIGINS` | Em produção, lista separada por vírgulas de origens permitidas; vazio = comportamento permissivo (adequado em dev) |
| `COMMAND_RATE_MAX` | Máximo de `POST /api/aiox/command` por IP por minuto (por defeito: `60`) |
| `TRUST_PROXY` | Definir `1` atrás de reverse proxy (rate limit / IP correctos) |
| `NODE_ENV` | `production` activa Helmet e convém definir `CORS_ORIGINS` |
| `LOG_LEVEL` | Nível pino: `trace` … `silent` (por defeito `info`; em testes `silent`) |
| `MASK_PATHS_IN_UI` | `1` ou `true` para truncar `aioxRoot` / `agentsDir` na API (útil em ecrãs partilhados) |
| `VITE_*` | Variáveis só no **build** Vite — ver `.env.example` (`VITE_AIOX_DOCS_URL`, `VITE_POLL_INTERVAL_MS`, **`VITE_TASK_BOARD_SYNC`**) |
| `MISSION_LLM_API_KEY` / `OPENAI_API_KEY` | Chave **só no servidor** para o painel Dúvidas (API compatível com `/v1/chat/completions`; `OPENAI_API_KEY` é alias legado). Com `MISSION_DOUBTS_LLM=1`. Ver [`.env.ready`](./.env.ready) |
| `MISSION_DOUBTS_LLM` | `1` para activar a rota de chat (ainda exige chave ≥8 caracteres). Pré-definido em `.env.ready` |
| `MISSION_LLM_BASE_URL` / `MISSION_LLM_MODEL` | Endpoint e modelo OpenAI-compatible (**opcionais**; vazio = `https://api.openai.com` e `gpt-4o-mini` no servidor) |

**Vistas no header:** **Hub** (três colunas), **Central** (ícone monitor: canvas + terminal + agentes), **Canvas de tarefas** (ícone Kanban — presets, filtro, ordenação, chaves `localStorage`, import/export JSON; sync servidor opcional com **`VITE_TASK_BOARD_SYNC`**). **Dúvidas** (ícone mensagem) abre painel com FAQ + chat de notas de sessão; **GET `/api/aiox/doubts`** e opcionalmente **POST `/api/aiox/doubts/chat`** com `MISSION_DOUBTS_LLM=1` + chave (ver `.env.example`); atalho **Ctrl+/** (**Cmd+/** no Mac); import/export JSON, Markdown, copiar e limpar (ver `CHECKLIST.md` → Melhorias).

**Tema:** o botão sol/lua no header alterna claro/escuro; a preferência fica em `localStorage` (`mission-agent-theme`). Em ecrãs estreitos, usa os ícones no header ou os botões no rodapé do resumo para abrir **agentes** e **atividade** em gavetas.

**CLI real (opcional):** com `ENABLE_AIOX_CLI_EXEC=1` e `AIOX_EXEC_SECRET` (≥8 caracteres), a API expõe `POST /api/aiox/exec` e a área de trabalho mostra o painel para correr `aiox doctor` ou `aiox info` com o mesmo segredo. Não activar em exposição pública sem rede de confiança.

## Build de produção

```bash
npm run build
npm start
```

O servidor Express serve o `dist/` e a API nos mesmos endpoints `/api/*`.

Em **produção** (`NODE_ENV=production`), se `CORS_ORIGINS` estiver vazio, o servidor escreve um **aviso** nos logs: convém definir origens explícitas para o browser não aceder à API de qualquer site.

### Ambiente real — agentes e projecto prontos

1. **`AIOX_CORE_PATH`** — aponta para a pasta do projecto AIOX que contém `.aiox-core` (onde estão os agentes `.md`). Sem isto o hub arranca mas a **lista de agentes fica vazia**.
2. **Segredos da equipa** — usa **`.env.local`** no servidor (sobrescreve `.env`; não commitar): chaves LLM, `DATABASE_URL`, `SLACK_WEBHOOK_URL`, Notion/Figma, etc.
3. **Preflight:** após `npm run build`, corre `NODE_ENV=production npm run verify:real` — valida `dist/`, aiox-core (opcional), CORS, `TRUST_PROXY`, edição de agentes, Slack/LLM óbvios. Em CI sem clone aiox: `MISSION_PREFLIGHT_SKIP_AIOX=1`.
4. **Hardening:** `CORS_ORIGINS` com URLs reais; `TRUST_PROXY=1` atrás de reverse proxy; `MASK_PATHS_IN_UI=1` em demonstrações; **`MISSION_AGENT_EDIT=0`** se o hub em produção for só leitura dos `.md`.
5. Ver **[CHECKLIST-OPERACIONAL.md](./docs/CHECKLIST-OPERACIONAL.md)** (secção release) e **`npm run verify:env`** para máscaras de variáveis.
6. **Cenário real (API + guia UI):** com o Express a correr, **`npm run qa:real`** — ver **[docs/QA-CENARIO-CANVAS-REAL.md](./docs/QA-CENARIO-CANVAS-REAL.md)**.

**`npm run preview`:** bundle estático + API **embebida** em `/api` (sem Express separado). O `vite.config.ts` mantém **proxy** `/api` → `8787` como fallback se definires `MISSION_EMBED_API=0`.

| Comando | O que faz |
|--------|------------|
| **`npm run dev`** | Só Vite **:5179** com API embebida em `/api` (um processo) |
| **`npm run dev:split`** | **Express :8787** + Vite **:5179** com proxy (`MISSION_EMBED_API=0` no Vite) |
| **`npm run dev:embed`** | Como `dev`, com `init-env` explícito antes do Vite |
| **`npm run preview`** | Bundle + API embebida em `/api` (sem :8787 por defeito) |
| **`npm run preview:all`** | Express **:8787** + `vite preview` com proxy (`MISSION_EMBED_API=0` no Vite) |
| **`npm run build` + `npm start`** | Um só processo na **:8787**: `dist/` + `/api/*` (produção local) |
| **`npm run qa:real`** | Valida feed + task-board + overview. Em `dev` embebido usa `MISSION_QA_BASE_URL=http://127.0.0.1:5179`; em split usa **:8787** |

## Testes

```bash
npm test
```

Testes automatizados (**51** testes Vitest + Supertest em `api.smoke`, `fish-api` e `e2e-basic-flow`): `health`, 404/JSON inválido, métricas, tempo, `info` (incl. **`taskBoard`**), **`overview`**, `doubts` / `doubts/chat` / **`doubts/chat/stream`**, **`integrations-status`** (+ `validate=1`, `alerts`, `history`), **`task-board`** GET/PUT/409, **`figma/context`**, `agents`, `exec`, validação de `command`, **`activity/event`**, GET/PUT agente ( **`revision`** + conflito **409** ), `MISSION_AGENT_EDIT`, caminhos mascarados, persistência do feed, merge parcial de integrações, fish API e fluxo E2E básico.

**CI:** o workflow [`.github/workflows/mission-agent-ci.yml`](./.github/workflows/mission-agent-ci.yml) corre `npm ci`, `npm test`, `npm run build` e **`npm run verify:real`** (com `NODE_ENV=production` e `MISSION_PREFLIGHT_SKIP_AIOX=1`) em cada push ou PR para `main` / `master` (quando o repositório Git tem a raiz em `MissionAgent/`).

### Sincronizar com o GitHub

Se ainda não tens `origin` configurado, cria um repositório vazio no GitHub e corre:

```bash
cd MissionAgent
git remote add origin https://github.com/SEU_USER/SEU_REPO.git
git branch -M main
git push -u origin main
```

(Substitui a URL pelo teu repositório; usa SSH se preferires `git@github.com:USER/REPO.git`.)

## Docker

Na pasta `MissionAgent/`:

```bash
docker compose build
docker compose up
```

Por defeito o volume aponta para `./.aiox-core` dentro de `MissionAgent/`; ajusta em `docker-compose.yml` se usares outro caminho. A imagem corre `node server/index.mjs` com o `dist/` construído no build.

## Contrato HTTP

Ver **[docs/openapi.yaml](./docs/openapi.yaml)** (OpenAPI 3.0).

## O que não faz

- Não executa agentes LLM nem substitui Claude/Codex — a **CLI no aiox-core** continua a fonte de operação.
- O comando global apenas **regista** no feed e devolve uma dica; para fluxo real usa a IDE conforme a documentação do `aiox-core`.

## MCP e integrações (Cursor / IDE)

- **Servidor incluído:** `npm run mcp` — tools para aiox-core / agentes. Ver **[docs/MCP.md](./docs/MCP.md)**.
- **Stack completo (Notion, Figma, LLM, processo de equipa):** **[docs/INTEGRATIONS.md](./docs/INTEGRATIONS.md)** e exemplo **[docs/cursor-mcp.stack.example.json](./docs/cursor-mcp.stack.example.json)**.
- **Referência AIOX (LLM, agentes, layout) sem depender de pastas‑ideia:** **[docs/reference/README.md](./docs/reference/README.md)**.

## Roadmap e pendências

Ver **[CHECKLIST.md](./docs/CHECKLIST.md)** — melhorias técnicas, UX, integração com `aiox-core` e segurança. **Plano de implementações (fases 0–4):** **[docs/IMPLEMENTATION-PLAN.md](./docs/IMPLEMENTATION-PLAN.md)**. **Checklist operacional (arranque / PR / release):** **[CHECKLIST-OPERACIONAL.md](./docs/CHECKLIST-OPERACIONAL.md)**. Registo de validações: **[CHECKLIST-VALIDATION.md](./docs/CHECKLIST-VALIDATION.md)**.

**Ficheiros deste tour:** usa a pasta **`@img/`** como fonte única de capturas do README.

Arranque rápido: **[`.env.ready`](./.env.ready)** → **`npm run env:init`** (ou automático no `postinstall`). Referência completa: **[.env.example](./.env.example)**.
