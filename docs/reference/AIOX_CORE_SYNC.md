# Validação Mission Command Hub ↔ aiox-core

Documento de **gap analysis** entre o repositório **`aiox-core`** (framework CLI) e o **`mission-command-hub`** (dashboard). Atualizar quando subir versão ADE ou ao sincronizar personas.

---

## 1. O que está alinhado

| Área | Estado |
|------|--------|
| **12 papéis** (`aioxRoleId`) | Mesmos IDs que menções `@…` no framework |
| **Menções e docs** | `systemDoc` / `aioxAgentGuidePath()` apontam para `docs/guides/agents/` no aiox-core |
| **Personas (codenames)** | Sincronizadas com `docs/guides/agent-selection-guide.md` (EN) — ver [`AIOX_AGENTS_CANON.md`](./AIOX_AGENTS_CANON.md) |
| **LLM (conceito)** | `llmCatalog` + `aioxLlmBridge` mapeiam fornecedores para variáveis tipo `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` no `.env` do aiox-core |
| **Fluxo de entrega** | `teamDeliveryFlow.ts` espelha pipeline analista → … → squad-creator |

---

## 2. Lacunas esperadas (não são bugs do hub)

| Lacuna | Porquê |
|--------|--------|
| **CLI / ADE / comandos `*…`** | O hub não executa `*execute-subtask`, worktrees, etc. — isso é só no aiox-core |
| **`AIOX_DEFAULT_MODEL` vs catálogo OpenRouter** | Framework usa string de modelo Anthropic/OpenAI; o hub usa IDs `openai:gpt-4o` e proxy OpenRouter em `/api/llm/chat`. São **dois modos**; alinhar manualmente por agente |
| **Chaves de API** | aiox-core: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, … Hub em dev: **`OPENROUTER_API_KEY`** no servidor. Para paridade total, usar LiteLLM (`.docker/llm-routing/`) ou documentar mapeamento |
| **`AIOX_MCP_ENABLED` / MCP** | Não exposto no hub |
| **Validadores de paridade** | `npm run validate:parity` (se existir no teu clone) é workflow local; não integrado no dashboard |
| **IDE sync** | `docs/ide-integration.md` descreve Cursor, Claude Code, etc. — o hub não substitui regras/MCP do IDE |

---

## 3. Checklist ao atualizar o aiox-core

- [ ] Rever **`docs/guides/agent-selection-guide.md`** (tabela *Agent Quick Reference*) — personas mudaram?
- [ ] Rever **`.aiox-core/development/agents/*.md`** para `squad-creator` ou papéis novos
- [ ] Atualizar **`src/domain/aioxTeamRoles.ts`** e [`AIOX_AGENTS_CANON.md`](./AIOX_AGENTS_CANON.md)
- [ ] Correr **`npm run db:seed`** (ou overlay `real-data.json`) para refletir nomes no SQLite
- [ ] Atualizar **`docs/AIOX_LLM_INTEGRATION.md`** se mudar variáveis globais do framework

---

## 4. Referências rápidas no aiox-core

| Ficheiro | Conteúdo |
|----------|-----------|
| `docs/guides/agent-selection-guide.md` | Tabela de agentes, ADE commands |
| `docs/guides/agents/` | `*-SYSTEM.md`, traces |
| `.aiox-core/development/agents/*.md` | Definição YAML por agente |
| `.env.example` | `AIOX_DEFAULT_MODEL`, chaves por fornecedor |
| `.docker/llm-routing/.env.example` | OpenRouter / LiteLLM |
| `docs/ide-integration.md` | Matriz IDE |

---

*Última revisão: personas alinhadas ao agent-selection-guide (ADE v2.2.0).*
