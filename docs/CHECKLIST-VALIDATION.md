# Validação do CHECKLIST.md

Registo de auditorias cruzadas entre **`docs/CHECKLIST.md`** e o código / repositório. Actualizar este ficheiro sempre que fizeres uma revisão formal.

---

## Última auditoria

| Campo | Valor |
|--------|--------|
| **Data** | 2026-03-24 |
| **Âmbito** | MissionAgent — Slack (`SLACK_WEBHOOK_URL`, espelho do feed, `integrations-status.slack`), `npm run verify:env`, integrações `alerts/history`, `activity/event`, E2E básico; OpenAPI/README/CHECKLIST |
| **Comandos** | `npm test` → **39/39** pass; `npm run build` → OK; `npm run verify:env` → OK (máscaras) |

### Resultado

- **Estado geral:** o checklist está **alinhado** com a implementação actual.
- **Contagem de testes:** **39** testes no total (`api.smoke` + `fish-api` + `e2e-basic-flow`) — confere com a secção «Melhorias técnicas → Alta».
- **Rotas / contrato:** `GET /api/aiox/integrations-status` inclui `slack`, `alerts/history` e snapshot com `validate=1`; espelho Slack em `server/lib/slack-mirror.mjs` após cada `pushLog`; `POST /api/aiox/activity/event` mantém sincronização entre abas; `POST /api/aiox/doubts/chat/stream` (SSE) permanece activo.
- **Correcção aplicada:** linha «Motor LLM» em **Pendências conhecidas** mantém LLM opcional no painel Dúvidas vs. modelo no IDE.

### Lacunas conhecidas (não são erros do checklist)

| Tópico | Nota |
|--------|------|
| Testes de UI | Sem testes automatizados do `DoubtsChatPanel` (comportamento manual / E2E futuro). |
| MCP operacional | Item `[ ]` em **Integrações MCP** — depende de configuração no Cursor, fora deste repo. |
| Slack inbound | Espelho **outbound** do feed (Incoming Webhook) implementado; eventos **desde** o Slack → hub não estão no âmbito actual. |
| Roadmap | «Base de conhecimento» e quotas LLM continuam em aberto — **streaming** SSE já em `/api/aiox/doubts/chat/stream`. |

### Próxima revisão sugerida

- Após alterações em **`server/create-app.mjs`**, **`DoubtsChatPanel`**, ou **`.env.ready` / OpenAPI**.
- Ou em cada **release** / **sprint** (alinhado ao ponto 3 de «Como usar» no `CHECKLIST.md`).

### Auditoria anterior

| Data | Âmbito | Comandos |
|------|--------|----------|
| 2026-03-23 | MissionAgent — integrações `alerts/history`, `activity/event`, E2E básico, 39 testes | `npm test` **39/39**; `npm run build` OK |
| 2026-03-23 | MissionAgent — overview API, feed `kind`, revisão agente, activity JSON, Kanban priority/blocked | `npm test` **25/25**; `npm run build` OK |
| 2026-03-22 | MissionAgent — API, UI Dúvidas, env, CI, roadmap | `npm test` **23/23**; `npm run build` OK |

---

## Como repetir a validação

1. Ler **`docs/CHECKLIST.md`** (baseline, roadmap, pendências).
2. Confirmar rotas em **`server/create-app.mjs`** e contrato em **`docs/openapi.yaml`**.
3. Correr `npm test` e `npm run build` em `MissionAgent/`.
4. Contar testes: `grep -E "^\s*it\(" test/api.smoke.test.mjs` (ou equivalente) e actualizar o número no checklist se mudar.
5. Actualizar **este ficheiro** (data, resultado, lacunas) e a linha **Última revisão** no topo do `CHECKLIST.md`.
