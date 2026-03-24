# Checklist operacional — Architecture Agents Hub

Lista curta para **arranque**, **PR**, **release** e **processo de equipa**. O inventário completo de funcionalidades e histórico está em **[CHECKLIST.md](./CHECKLIST.md)**.

---

## 1. Primeiro arranque (clone)

- [ ] Node.js ≥ 20 instalado
- [ ] `cd MissionAgent` e `npm install` (cria `.env` a partir de `.env.ready` se necessário)
- [ ] `aiox-core` acessível em `../aiox-core` ou `AIOX_CORE_PATH` definido
- [ ] `npm run dev` — Vite **:5179** com API embebida em `/api`; ou `npm run dev:split` — Express **:8787** + Vite com proxy; header **API ligada**; opcional `http://127.0.0.1:5179/api/health` ou **:8787** em modo split
- [ ] (Opcional) **`MISSION_LLM_API_KEY`** (recomendado; qualquer API compatível) ou `OPENAI_API_KEY` (legado) em `.env` para LLM no painel **Dúvidas** (`MISSION_DOUBTS_LLM=1` já vem em `.env.ready`)

### 1.1 Ambiente real (chaves da equipa — não commitar)

- [ ] Colocar segredos só em **`.env.local`** (sobrescreve `.env`; ambos no `.gitignore` para chaves — não colar chaves em chats nem em PRs)
- [ ] `npm run verify:env` — lista o que está definido **sem revelar** valores completos
- [ ] (Opcional) `MISSION_VERIFY_UPSTREAM=1 npm run verify:env` — pings HTTP leves a OpenAI-compat (`/v1/models`), Notion e Figma quando os tokens existem
- [ ] (Opcional) Com `SLACK_WEBHOOK_URL` válido — enviar um comando de teste no hub e confirmar mensagem no canal Slack
- [ ] `npm run dev` → painel **Dúvidas** (chat/stream) e tab **Integrações** (`validate=1`) para validar o mesmo fluxo que produção local

---

## 2. Antes de commit / PR

- [ ] `npm test` — **43** testes a passar (smoke + fish API + E2E básico)
- [ ] (Opcional) Com `npm run dev` noutro terminal: **`npm run qa:real`** — cenário API real (activity + task-board + overview); guia UI em **[QA-CENARIO-CANVAS-REAL.md](./QA-CENARIO-CANVAS-REAL.md)**
- [ ] `npm run build` — sem erros TypeScript / Vite
- [ ] Sem segredos no commit (`.env` está no `.gitignore`; não commitar chaves)
- [ ] Se alteraste API: `docs/openapi.yaml` actualizado
- [ ] Se mudaste escopo de produto: base de conhecimento / Notion (processo da equipa) actualizada **antes** ou em paralelo coerente com o código

---

## 3. Antes de release / deploy

- [ ] `npm run build` e `NODE_ENV=production npm run verify:real` (sem aiox no CI: `MISSION_PREFLIGHT_SKIP_AIOX=1`)
- [ ] `NODE_ENV=production` e `npm start` (ou imagem Docker) testados localmente
- [ ] `AIOX_CORE_PATH` (ou `../aiox-core`) correcto no **servidor** — senão **agentes** não aparecem
- [ ] `CORS_ORIGINS` definido para as origens reais (produção)
- [ ] `TRUST_PROXY=1` se houver reverse proxy
- [ ] Não expor o serviço à internet sem **auth** no perímetro (o hub não tem login integrado)
- [ ] `MASK_PATHS_IN_UI=1` se o ecrã for partilhado
- [ ] `MISSION_AGENT_EDIT=0` se não quiseres criar/editar agentes pela UI em produção

---

## 4. Roadmap — melhorias em aberto

Marca quando implementares; detalhes em **[CHECKLIST.md](./CHECKLIST.md)** (tabela *Melhorias (roadmap)*). **Plano por fases:** **[IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md)**.

- [ ] **LLM:** quotas/custos por utilizador (política base + rate limit por IP já em **GET /api/aiox/doubts** e UI — ver **IMPLEMENTATION-PLAN** Fase 1)
- [ ] **Base de conhecimento:** indexação `docs/` ou Notion para respostas contextualizadas no hub
- [ ] **Testes de UI** (opcional): E2E ou smoke do painel Dúvidas (`DoubtsChatPanel`) ou do canvas (`TaskCanvasView`)
- [ ] **Canvas de tarefas:** quotas / auth / multi-utilizador (persistência ficheiro + `VITE_TASK_BOARD_SYNC` já em **[CHECKLIST.md](./CHECKLIST.md)**)

---

## 5. Integrações (Cursor / equipa)

- [x] Painel **Integrações** (cards por serviço) valida env chaves no servidor via `GET /api/aiox/integrations-status?validate=1` (OpenAI/Notion/Figma) — funciona em qualquer IDE
- [x] Painel **Integrações** expõe alertas ativos + tendência por histórico (`alerts` / `history`) para acompanhamento operacional
- [x] Abas partilham feed de atividade da equipa (Task Canvas publica eventos para `/api/aiox/activity/event` e o Hub faz refresh silencioso)
- [x] **Slack**: espelho opcional do feed com `SLACK_WEBHOOK_URL` (Incoming Webhook); cartão no painel Integrações (`mirrorReady`)
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
