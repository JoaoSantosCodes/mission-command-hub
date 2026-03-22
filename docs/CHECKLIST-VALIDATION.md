# Validação do CHECKLIST.md

Registo de auditorias cruzadas entre **`docs/CHECKLIST.md`** e o código / repositório. Actualizar este ficheiro sempre que fizeres uma revisão formal.

---

## Última auditoria

| Campo | Valor |
|--------|--------|
| **Data** | 2026-03-22 |
| **Âmbito** | MissionAgent — API, UI Dúvidas, env (`.env.ready`, `load-env`), testes `api.smoke.test.mjs`, CI, roadmap |
| **Comandos** | `npm test` → **23/23** pass; `npm run build` → OK (mesma data) |

### Resultado

- **Estado geral:** o checklist está **alinhado** com a implementação actual.
- **Contagem de testes:** **23** casos em `test/api.smoke.test.mjs` — confere com a secção «Melhorias técnicas → Alta».
- **Rotas documentadas:** `GET/POST` em `/api/aiox/doubts` e `/api/aiox/doubts/chat` presentes em `server/create-app.mjs`.
- **Correcção aplicada:** linha «Motor LLM» em **Pendências conhecidas** foi ajustada (LLM opcional no painel Dúvidas vs. modelo no IDE).

### Lacunas conhecidas (não são erros do checklist)

| Tópico | Nota |
|--------|------|
| Testes de UI | Sem testes automatizados do `DoubtsChatPanel` (comportamento manual / E2E futuro). |
| MCP operacional | Item `[ ]` em **Integrações MCP** — depende de configuração no Cursor, fora deste repo. |
| Roadmap | «Base de conhecimento» e **streaming** LLM continuam em aberto — coerente com a tabela **Melhorias (roadmap)**. |

### Próxima revisão sugerida

- Após alterações em **`server/create-app.mjs`**, **`DoubtsChatPanel`**, ou **`.env.ready` / OpenAPI**.
- Ou em cada **release** / **sprint** (alinhado ao ponto 3 de «Como usar» no `CHECKLIST.md`).

---

## Como repetir a validação

1. Ler **`docs/CHECKLIST.md`** (baseline, roadmap, pendências).
2. Confirmar rotas em **`server/create-app.mjs`** e contrato em **`docs/openapi.yaml`**.
3. Correr `npm test` e `npm run build` em `MissionAgent/`.
4. Contar testes: `grep -E "^\s*it\(" test/api.smoke.test.mjs` (ou equivalente) e actualizar o número no checklist se mudar.
5. Actualizar **este ficheiro** (data, resultado, lacunas) e a linha **Última revisão** no topo do `CHECKLIST.md`.
