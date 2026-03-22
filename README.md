# Architecture Agents Hub

Hub funcional que combina a **UI** inspirada no `ai-orchestration-hub-main` com uma **ponte** ao repositório **`aiox-core`** no disco: lê definições de agentes (`.aiox-core/development/agents/*.md`), obtém a versão da CLI (`bin/aiox.js --version`) e regista comandos no feed de atividade (JSON no disco ou **PostgreSQL** opcional via `DATABASE_URL`, com fallback para ficheiro se a ligação falhar).

## Requisitos

- Node.js ≥ 20
- Pasta `aiox-core` ao lado deste projecto: `../aiox-core` (ou define `AIOX_CORE_PATH`)

## Arranque

```bash
cd MissionAgent
npm install
npm run dev
```

- **UI:** http://127.0.0.1:5179 (Vite; `/api` faz proxy para a API)
- **API:** http://127.0.0.1:8787

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `AIOX_CORE_PATH` | Caminho absoluto para a raiz do `aiox-core` (por defeito: `../aiox-core` relativo a `MissionAgent/`) |
| `PORT` | Porta da API (por defeito: `8787`) |
| `MISSION_ACTIVITY_PATH` | Ficheiro JSON do feed (por defeito: `MissionAgent/.mission-agent/activity.json`) |
| `DATABASE_URL` | (Opcional) URI PostgreSQL; activa persistência do feed na tabela `mission_activity_log` |
| `PG_POOL_MAX` | (Opcional) Máximo de ligações no pool `pg` (por defeito: `10`) |
| `WEATHER_LOCATION` | Cidade para `GET /api/aiox/weather` (widget na **Central**; wttr.in) |
| `MISSION_AGENT_EDIT` | `0` desactiva **gravação** de ficheiros de agente (`PUT /api/aiox/agents/:id` e botão Editar na UI); omitir = permitir |
| `AGENT_EDIT_RATE_MAX` | Máximo de `PUT` por agente por IP/min (por defeito `30`) |

Na UI, o botão **Central** (ícone de monitor) no header abre a vista inspirada no [OpenClaw Command Center](../openclaw-command-center-main/README.md) (MIT): mascote, terminal com o feed e escritório em canvas com os agentes `.md` do aiox-core.
| `CORS_ORIGINS` | Em produção, lista separada por vírgulas de origens permitidas; vazio = comportamento permissivo (adequado em dev) |
| `COMMAND_RATE_MAX` | Máximo de `POST /api/aiox/command` por IP por minuto (por defeito: `60`) |
| `TRUST_PROXY` | Definir `1` atrás de reverse proxy (rate limit / IP correctos) |
| `NODE_ENV` | `production` activa Helmet e convém definir `CORS_ORIGINS` |
| `LOG_LEVEL` | Nível pino: `trace` … `silent` (por defeito `info`; em testes `silent`) |
| `MASK_PATHS_IN_UI` | `1` ou `true` para truncar `aioxRoot` / `agentsDir` na API (útil em ecrãs partilhados) |
| `VITE_*` | Variáveis só no **build** Vite — ver `.env.example` (`VITE_AIOX_DOCS_URL`, `VITE_POLL_INTERVAL_MS`) |

**Tema:** o botão sol/lua no header alterna claro/escuro; a preferência fica em `localStorage` (`mission-agent-theme`). Em ecrãs estreitos, usa os ícones no header ou os botões no rodapé do resumo para abrir **agentes** e **atividade** em gavetas.

**CLI real (opcional):** com `ENABLE_AIOX_CLI_EXEC=1` e `AIOX_EXEC_SECRET` (≥8 caracteres), a API expõe `POST /api/aiox/exec` e a área de trabalho mostra o painel para correr `aiox doctor` ou `aiox info` com o mesmo segredo. Não activar em exposição pública sem rede de confiança.

## Build de produção

```bash
npm run build
npm start
```

O servidor Express serve o `dist/` e a API nos mesmos endpoints `/api/*`.

## Testes

```bash
npm test
```

Smoke da API (Vitest + Supertest): `health`, `info`, `agents`, validação de `command`, persistência do feed.

**CI:** em repositórios com esta pasta na raiz, o workflow `.github/workflows/mission-agent-ci.yml` corre `npm ci`, `npm test` e `npm run build` em `MissionAgent/`.

## Docker

Na pasta `MissionAgent/`:

```bash
docker compose build
docker compose up
```

Ajusta o volume em `docker-compose.yml` para apontar para a tua cópia local do `aiox-core`. A imagem corre `node server/index.mjs` com o `dist/` construído no build.

## Contrato HTTP

Ver **[docs/openapi.yaml](./docs/openapi.yaml)** (OpenAPI 3.0).

## O que não faz

- Não executa agentes LLM nem substitui Claude/Codex — a **CLI no aiox-core** continua a fonte de operação.
- O comando global apenas **regista** no feed e devolve uma dica; para fluxo real usa a IDE conforme a documentação do `aiox-core`.

## MCP (Cursor / IDE)

Servidor **stdio** opcional que expõe as mesmas leituras do disco como tools MCP. Ver **[docs/MCP.md](./docs/MCP.md)** e `npm run mcp`.

## Roadmap e pendências

Ver **[CHECKLIST.md](./CHECKLIST.md)** — melhorias técnicas, UX, integração com `aiox-core` e itens de segurança.

Copia variáveis opcionais a partir de **[.env.example](./.env.example)**.
