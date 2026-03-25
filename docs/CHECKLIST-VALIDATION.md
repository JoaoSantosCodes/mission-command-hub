# Validação do CHECKLIST.md

Registo de auditorias cruzadas entre **`docs/CHECKLIST.md`** e o código / repositório. Actualizar este ficheiro sempre que fizeres uma revisão formal.

---

## Última auditoria

| Campo | Valor |
|--------|--------|
| **Data** | 2026-03-25 |
| **Versão** | v1.0.1 — code splitting + error boundary + deploy docs |
| **Âmbito** | Pendências Fase 2.1 e Fase 4: code splitting, error boundary, DEPLOY.md |
| **Comandos** | `npm test` → **51/51** pass; `npm run build` → OK (sem aviso chunk size); `npm run lint` → **0 erros** |

### Resultado

- **Estado geral:** EXCELENTE — pendências técnicas fechadas; bundle inicial 513 kB → **41 kB** ✅
- **Implementado (2026-03-25):**
  - ✅ **Code splitting** — `vite.config.ts` com `manualChunks` (react-vendor, motion, icons); `App.tsx` com `React.lazy`+`Suspense` para 7 componentes pesados
  - ✅ **Error boundary** — `src/components/ErrorBoundary.tsx` com fallback configurável e "Tentar novamente"
  - ✅ **docs/DEPLOY.md** (Fase 2.1) — nginx, Caddy, Docker, variáveis de produção, checklist pré-deploy
  - ✅ `IMPLEMENTATION-PLAN.md` — Fase 2.1 e Fases 4.4/4.5 marcadas concluídas

### Lacunas conhecidas (não são erros do checklist)

| Tópico | Nota |
|--------|------|
| Testes de UI | Sem E2E do `DoubtsChatPanel` / `TaskCanvasView` — Fase 4.1/4.2 do **IMPLEMENTATION-PLAN**. |
| MCP operacional | Item `[ ]` **Integrações MCP** — Fase 0 do plano (config no Cursor, sem código). |
| Slack inbound | Só webhook **outbound** — Fase 3.1 do plano. |
| Auth / multi-tenant | Não implementado — Fase 2.2/2.3; requer decisão de produto. Não expor sem proxy+auth. |

### Próxima revisão sugerida

- Após fechar **Fase 0** (MCP Notion/Figma operacional no Cursor).
- Após decisão sobre **Fase 2.2** (método de autenticação).
- Após alterações em **`create-app.mjs`**, **OpenAPI**, ou **`.env.example`**.

### Auditoria anterior

| Data | Âmbito | Comandos |
|------|--------|----------|
| 2026-03-25 | ESLint fix: 148 erros → 0; globals browser/node; TaskColumn React import | `npm test` **51/51**; `npm run build` OK; `npm run lint` **0 erros** |
| 2026-03-24 | CI/CD, docs, qualidade; 51 testes | `npm test` **51/51**; `npm run build` OK; `npm run lint` ⚠️ 148 erros (não detectado) |
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
