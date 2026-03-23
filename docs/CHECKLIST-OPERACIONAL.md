# Checklist operacional — Architecture Agents Hub

Lista curta para **arranque**, **PR**, **release** e **processo de equipa**. O inventário completo de funcionalidades e histórico está em **[CHECKLIST.md](./CHECKLIST.md)**.

---

## 1. Primeiro arranque (clone)

- [ ] Node.js ≥ 20 instalado
- [ ] `cd MissionAgent` e `npm install` (cria `.env` a partir de `.env.ready` se necessário)
- [ ] `aiox-core` acessível em `../aiox-core` ou `AIOX_CORE_PATH` definido
- [ ] `npm run dev` — UI na porta indicada pelo Vite (por defeito **5179**); header **API ligada**
- [ ] (Opcional) `OPENAI_API_KEY` ou `MISSION_LLM_API_KEY` em `.env` para LLM no painel **Dúvidas** (`MISSION_DOUBTS_LLM=1` já vem em `.env.ready`)

---

## 2. Antes de commit / PR

- [ ] `npm test` — **34** testes smoke a passar
- [ ] `npm run build` — sem erros TypeScript / Vite
- [ ] Sem segredos no commit (`.env` está no `.gitignore`; não commitar chaves)
- [ ] Se alteraste API: `docs/openapi.yaml` actualizado
- [ ] Se mudaste escopo de produto: base de conhecimento / Notion (processo da equipa) actualizada **antes** ou em paralelo coerente com o código

---

## 3. Antes de release / deploy

- [ ] `NODE_ENV=production` e `npm run build` + `npm start` (ou imagem Docker) testados localmente
- [ ] `CORS_ORIGINS` definido para as origens reais (produção)
- [ ] `TRUST_PROXY=1` se houver reverse proxy
- [ ] Não expor o serviço à internet sem **auth** no perímetro (o hub não tem login integrado)
- [ ] `MASK_PATHS_IN_UI=1` se o ecrã for partilhado

---

## 4. Roadmap — melhorias em aberto

Marca quando implementares; detalhes em **[CHECKLIST.md](./CHECKLIST.md)** (tabela *Melhorias (roadmap)*).

- [ ] **LLM:** quotas/custos, política de dados explícita (streaming SSE em `/api/aiox/doubts/chat/stream` — ver **CHECKLIST.md**)
- [ ] **Base de conhecimento:** indexação `docs/` ou Notion para respostas contextualizadas no hub
- [ ] **Testes de UI** (opcional): E2E ou smoke do painel Dúvidas (`DoubtsChatPanel`) ou do canvas (`TaskCanvasView`)
- [ ] **Canvas de tarefas:** quotas / auth / multi-utilizador (persistência ficheiro + `VITE_TASK_BOARD_SYNC` já em **[CHECKLIST.md](./CHECKLIST.md)**)

---

## 5. Integrações (Cursor / equipa)

- [x] Painel **Integrações** (cards por serviço) valida env chaves no servidor via `GET /api/aiox/integrations-status?validate=1` (OpenAI/Notion/Figma) — funciona em qualquer IDE
- [ ] MCP **Notion** e **Figma** configurados no Cursor com tokens (fora do Git) e “connect”/leitura validada

---

## 5.1 Aquário (Fish Food) — verificação de API / DB / MCP

Objetivo: confirmar que o “Aquário Architecture Agents Hub” está a consumir/persistir corretamente e que os contratos e integrações externas (quando habilitadas) estão operacionais.

- [x] API Aquário integrada (smoke + contrato)
  - Smoke: `npm test` (inclui `GET /api/aiox/fish`, `POST /api/aiox/fish/consume`, `POST /api/aiox/fish/feed`)
  - Contrato: `docs/openapi.yaml` em `/api/aiox/fish*`
- [x] Persistência Aquário (sem DB): ficheiro local
  - Por defeito: `MissionAgent/.mission-agent/fish-state.json`
  - Override: `MISSION_FISH_PATH`
  - Como verificar: `GET /api/aiox/fish` e confirmar que `food/maxFood/updatedAt` mudam após `feed/consume`
- [ ] Banco/DB integrado (feed de actividade) — opcional
  - Como verificar: `GET /api/aiox/info` devolve `activityBackend: "file" | "postgres"`
  - Como habilitar: definir `DATABASE_URL` (se falhar, o serviço faz fallback para `file`)
  - Estado no teu ambiente actual (verificado agora via `/api/aiox/info`): `file` (sem `DATABASE_URL` activo)
- [ ] MCP Figma (fidelidade) — operacional no Cursor
  - Como verificar: Cursor → Settings → MCP → servidor Figma → “connect”/leitura do ficheiro Figma
- [ ] MCP Notion (base de conhecimento/processo) — operacional no Cursor
  - Como verificar: Cursor → Settings → MCP → servidor Notion → “connect”/leitura de páginas
  - Onde consultar o processo: `docs/INTEGRATIONS.md` (secção “Processo de equipa (Notion + contratos)”)

---

## 6. Validação periódica do checklist

- [ ] Seguir **[CHECKLIST-VALIDATION.md](./CHECKLIST-VALIDATION.md)** (comandos + actualizar data no **[CHECKLIST.md](./CHECKLIST.md)**)

---

## Referências rápidas

| Documento | Uso |
|-----------|-----|
| [CHECKLIST.md](./CHECKLIST.md) | Estado completo do produto, baseline, roadmap |
| [CHECKLIST-VALIDATION.md](./CHECKLIST-VALIDATION.md) | Auditoria checklist ↔ código |
| [openapi.yaml](./openapi.yaml) | Contrato HTTP |
| [INTEGRATIONS.md](./INTEGRATIONS.md) | MCP, Notion, Figma, processo |
