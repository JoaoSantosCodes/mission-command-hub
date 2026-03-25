# Plano de implementações — MissionAgent

Documento vivo: prioriza **pendências** e **roadmap** alinhados a [CHECKLIST.md](./CHECKLIST.md), [CHECKLIST-OPERACIONAL.md](./CHECKLIST-OPERACIONAL.md) e [AIOX_CORE_IDEAS.md](./AIOX_CORE_IDEAS.md). Actualizar datas e estados em cada revisão de sprint.

---

## Estado validado (2026-03-25)

| Área | Estado |
|------|--------|
| API Express + UI | Alinhado com checklist; **51** testes (`npm test`); `npm run build` OK; lint **0 erros** |
| Dev | Express **:8787** + Vite **:5179** (`npm run dev`); `dev:embed` / `preview` com API embebida |
| Chaves no código | **Não** — tudo via `.env` / `.env.local` (`load-env.mjs`) |
| Bundle frontend | 513 kB → **41 kB** inicial (code splitting + lazy load) |
| Lacunas principais | Auth, multi-utilizador, MCP Notion/Figma **operacional** no Cursor, quotas LLM, Slack inbound, RAG/base de conhecimento |

---

## Fase 0 — Operacional (sem alteração de código)

**Objectivo:** fechar o item `[ ]` *Integrações MCP* e validar chaves já colocadas em `.env`.

| # | Tarefa | Critério de pronto |
|---|--------|-------------------|
| 0.1 | Configurar MCP **Notion** no Cursor (token em `env` do servidor MCP) | “Connect” + leitura de uma página de teste |
| 0.2 | Configurar MCP **Figma** no Cursor | “Connect” + leitura do ficheiro de design acordado |
| 0.3 | Correr `npm run verify:env` e `MISSION_VERIFY_UPSTREAM=1 npm run verify:env` (com tokens no servidor) | Saída sem erros inesperados; pings opcionais OK |
| 0.4 | Painel **Integrações** com `validate=1` | Cards OpenAI / Notion / Figma / Slack coerentes com o que está em `.env` |
| 0.5 | (Opcional) `DATABASE_URL` + reinício | `GET /api/aiox/info` → `activityBackend: "postgres"` |

**Dono:** equipa / DevOps local. Marcar `[x]` em [CHECKLIST.md](./CHECKLIST.md) secção *Integrações MCP* quando 0.1–0.2 estiverem validados.

---

## Fase 1 — LLM e observabilidade (baixo risco)

**Objectivo:** fechar lacunas do roadmap «Chat com LLM no servidor» sem mudar o contrato público das rotas.

**Estado (2026-03-24):** implementado em código — rate limit com `DOUBTS_CHAT_WINDOW_MS`; `GET /api/aiox/doubts` com `dataPolicyNotice`, `dataPolicyUrl`, `rateLimitMax` / `rateLimitWindowMs`; log `doubts LLM request` (`msgCount`, `approxChars`); UI no painel Dúvidas; OpenAPI actualizado.

| # | Tarefa | Notas |
|---|--------|--------|
| 1.1 | **Quotas** por IP em `doubts/chat` e `doubts/chat/stream` | **Feito:** mesmo limiter; `DOUBTS_CHAT_RATE_MAX` + **`DOUBTS_CHAT_WINDOW_MS`** (10s–1h) |
| 1.2 | **Política de dados** na UI Dúvidas | **Feito:** aviso + link opcional (`MISSION_DOUBTS_DATA_NOTICE` / `MISSION_DOUBTS_DATA_POLICY_URL`) |
| 1.3 | **Métricas** no log estruturado | **Feito:** `logDoubtsLlmRequest` — `doubtsLlm`, `mode`, `msgCount`, `approxChars` (sem conteúdo) |
| 1.4 | Actualizar **OpenAPI** | **Feito:** `docs/openapi.yaml` |

---

## Fase 2 — Segurança perimetral e multi-sessão

**Objectivo:** permitir exposição controlada à rede e separação mínima de dados.

| # | Tarefa | Notas |
|---|--------|--------|
| 2.1 | **Documentação** de referência: nginx/Caddy + `TRUST_PROXY` + `CORS_ORIGINS` + rate limits | **Feito (2026-03-25):** `docs/DEPLOY.md` — nginx, Caddy, Docker, variáveis, checklist pré-deploy |
| 2.2 | **Auth** (escolher uma): API key no header para `/api/*` **ou** sessão cookie + login mínimo **ou** obrigatoriedade de VPN (documentada) | Hoje: *sem auth* — ver pendências no CHECKLIST |
| 2.3 | **Isolamento** feed / task-board: `X-User-Id` confiável atrás do proxy **ou** coluna `user_id` / `tenant_id` em Postgres | Depende de 2.2; ficheiro JSON único não serve multi-tenant |
| 2.4 | **MISSION_AGENT_EDIT** e rotas sensíveis atrás do mesmo mecanismo de auth | Coerência com 2.2 |

---

## Fase 3 — Integrações produto

| # | Tarefa | Notas |
|---|--------|--------|
| 3.1 | **Slack inbound** (Bolt / Event Subscriptions): comandos ou menções → registo no feed ou rota interna | Hoje só **outbound** webhook |
| 3.2 | **Base de conhecimento** (roadmap): indexar `MissionAgent/docs` ou páginas Notion **no servidor** para contexto em Dúvidas | Alternativa: continuar só com MCP no IDE (Fase 0) |
| 3.3 | **Squads / metadados aiox** (só leitura): ler `squad.yaml` ou pasta `squads/` para vista “equipa” | Ver [AIOX_CORE_IDEAS.md](./AIOX_CORE_IDEAS.md) |

---

## Fase 4 — Qualidade e DX

| # | Tarefa | Notas |
|---|--------|--------|
| 4.1 | **E2E** Playwright ou Vitest browser: fluxo Dúvidas (abrir, enviar, receber) | CHECKLIST-OPERACIONAL já lista como opcional |
| 4.2 | **E2E** smoke Task Canvas: criar cartão, mudar coluna | Opcional |
| 4.3 | **CI:** garantir workflow na raiz do repo em uso (`MissionAgent` vs monorepo) | Já documentado no checklist técnico |
| ~~4.4~~ | ~~**Code splitting**~~ | **Feito (2026-03-25):** `manualChunks` + `React.lazy`/`Suspense`; bundle 513 kB → 41 kB |
| ~~4.5~~ | ~~**Error boundaries**~~ | **Feito (2026-03-25):** `ErrorBoundary.tsx` nas vistas e painéis lazy |

---

## Ordem sugerida

```text
Fase 0 → Fase 1 → (decisão produto: Fase 2 antes de 3 se houver exposição pública)
Fase 3.2 / 3.3 em paralelo com Fase 1 se não houver dependência de auth
Fase 4 contínua (pequenos incrementos)
```

---

## Ligações

- [CHECKLIST.md](./CHECKLIST.md) — marcar itens concluídos e actualizar *Última revisão*
- [CHECKLIST-VALIDATION.md](./CHECKLIST-VALIDATION.md) — registo após cada auditoria
- [openapi.yaml](./openapi.yaml) — contrato HTTP
- [reference/README.md](./reference/README.md) — docs AIOX importadas
