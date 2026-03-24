# Validação do CHECKLIST.md

Registo de auditorias cruzadas entre **`docs/CHECKLIST.md`** e o código / repositório. Actualizar este ficheiro sempre que fizeres uma revisão formal.

---

## Última auditoria

| Campo | Valor |
|--------|--------|
| **Data** | 2026-03-24 |
| **Âmbito** | Validação melhorias/ideias/pendências; **IMPLEMENTATION-PLAN.md**; correcção **INTEGRATIONS.md** (LLM servidor); Express+Vite em `dev`; teste **GET /** |
| **Comandos** | `npm test` → **43/43** pass; `npm run build` → OK |

### Resultado

- **Estado geral:** checklist **alinhado** com o código; pendências e roadmap reflectem lacunas (auth, multi-user, MCP operacional, Slack inbound, RAG).
- **Contagem de testes:** **43** (`api.smoke` + `fish-api` + `e2e-basic-flow`) — confere com «Melhorias técnicas → Alta».
- **Documentação:** [IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md) (fases 0–4); [INTEGRATIONS.md](./INTEGRATIONS.md) actualizado para LLM no servidor (Dúvidas).
- **Ideias aiox:** [AIOX_CORE_IDEAS.md](./AIOX_CORE_IDEAS.md) / [reference/](./reference/README.md) — sem código novo nesta revisão.

### Lacunas conhecidas (não são erros do checklist)

| Tópico | Nota |
|--------|------|
| Testes de UI | Sem E2E do `DoubtsChatPanel` / `TaskCanvasView` — Fase 4 do **IMPLEMENTATION-PLAN**. |
| MCP operacional | Item `[ ]` **Integrações MCP** — Fase 0 do plano. |
| Slack inbound | Só webhook **outbound** — Fase 3 do plano. |
| Roadmap | Quotas LLM + política de dados — Fase 1; base de conhecimento — Fase 3. |

### Próxima revisão sugerida

- Após fechar **Fase 0** ou **1** do [IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md).
- Após alterações em **`create-app.mjs`**, **OpenAPI**, ou **`.env.example`**.

### Auditoria anterior

| Data | Âmbito | Comandos |
|------|--------|----------|
| 2026-03-24 | Slack, verify:env, integrações, E2E; 39 testes | `npm test` **39/39**; `npm run build` OK |
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
6. Manter **[IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md)** coerente com fases concluídas.
