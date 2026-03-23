# Validação do CHECKLIST.md

Registo de auditorias cruzadas entre **`docs/CHECKLIST.md`** e o código / repositório. Actualizar este ficheiro sempre que fizeres uma revisão formal.

---

## Última auditoria

| Campo | Valor |
|--------|--------|
| **Data** | 2026-03-23 |
| **Âmbito** | MissionAgent — streaming Dúvidas (`POST /api/aiox/doubts/chat/stream`, `streamAvailable`), evento de atividade entre abas (`POST /api/aiox/activity/event`); smoke 36; OpenAPI/README/CHECKLIST |
| **Comandos** | `npm test` → **36/36** pass; `npm run build` → OK (mesma data) |

### Resultado

- **Estado geral:** o checklist está **alinhado** com a implementação actual.
- **Contagem de testes:** **36** casos em `test/api.smoke.test.mjs` — confere com a secção «Melhorias técnicas → Alta».
- **Rotas / contrato:** `POST /api/aiox/doubts/chat/stream` (SSE) + `streamAvailable` em `GET /api/aiox/doubts` e `overview.doubts`; task-board inalterado; **`docs/openapi.yaml`** actualizado.
- **Correcção aplicada:** linha «Motor LLM» em **Pendências conhecidas** mantém LLM opcional no painel Dúvidas vs. modelo no IDE.

### Lacunas conhecidas (não são erros do checklist)

| Tópico | Nota |
|--------|------|
| Testes de UI | Sem testes automatizados do `DoubtsChatPanel` (comportamento manual / E2E futuro). |
| MCP operacional | Item `[ ]` em **Integrações MCP** — depende de configuração no Cursor, fora deste repo. |
| Roadmap | «Base de conhecimento» e quotas LLM continuam em aberto — **streaming** SSE já em `/api/aiox/doubts/chat/stream`. |

### Próxima revisão sugerida

- Após alterações em **`server/create-app.mjs`**, **`DoubtsChatPanel`**, ou **`.env.ready` / OpenAPI**.
- Ou em cada **release** / **sprint** (alinhado ao ponto 3 de «Como usar» no `CHECKLIST.md`).

### Auditoria anterior

| Data | Âmbito | Comandos |
|------|--------|----------|
| 2026-03-23 | MissionAgent — overview API, feed `kind`, revisão agente, activity JSON, Kanban priority/blocked | `npm test` **25/25**; `npm run build` OK |
| 2026-03-22 | MissionAgent — API, UI Dúvidas, env, CI, roadmap | `npm test` **23/23**; `npm run build` OK |

---

## Como repetir a validação

1. Ler **`docs/CHECKLIST.md`** (baseline, roadmap, pendências).
2. Confirmar rotas em **`server/create-app.mjs`** e contrato em **`docs/openapi.yaml`**.
3. Correr `npm test` e `npm run build` em `MissionAgent/`.
4. Contar testes: `grep -E "^\s*it\(" test/api.smoke.test.mjs` (ou equivalente) e actualizar o número no checklist se mudar.
5. Actualizar **este ficheiro** (data, resultado, lacunas) e a linha **Última revisão** no topo do `CHECKLIST.md`.
