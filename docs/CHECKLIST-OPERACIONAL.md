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

- [ ] `npm test` — **23** testes smoke a passar
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

- [ ] **LLM:** streaming, quotas/custos, política de dados explícita (além do chat actual)
- [ ] **Base de conhecimento:** indexação `docs/` ou Notion para respostas contextualizadas no hub
- [ ] **Testes de UI** (opcional): E2E ou smoke do painel Dúvidas (`DoubtsChatPanel`) ou do canvas (`TaskCanvasView`)
- [ ] **Canvas de tarefas:** ordem intra-coluna por drag, pesquisa, ou backend (ver **[CHECKLIST.md](./CHECKLIST.md)** — roadmap canvas)

---

## 5. Integrações (Cursor / equipa)

- [ ] MCP **Notion** e **Figma** configurados no Cursor com tokens (fora do Git)
- [ ] Leitura Figma validada antes de UI crítica (política de fidelidade)

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
