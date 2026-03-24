# Integração Mission Command Hub ↔ aiox-core (LLM e equipa TI)

## Objetivo

O **Mission Command Hub** é a camada visual de **monitorização e configuração**; o **aiox-core** é o framework onde os agentes (`@dev`, `@qa`, `@sm`, …) são invocados na CLI/IDE. Este documento alinha **modelos LLM**, **variáveis de ambiente** e **papéis de equipa TI**.

## 1. Variáveis no repositório aiox-core

No clone `aiox-core`, copiar `.env.example` para `.env` e preencher, no mínimo:

| Variável | Uso |
|----------|-----|
| `ANTHROPIC_API_KEY` | Claude (Anthropic) |
| `OPENAI_API_KEY` | Modelos OpenAI / compatíveis |
| `AIOX_DEFAULT_MODEL` | Modelo por defeito (ex.: `claude-3-5-sonnet-20241022`) |

Lista completa e comentários: `aiox-core/.env.example`.

## 2. Mapeamento do dashboard → `.env`

No dashboard, cada agente tem:

- **`llmModelId`** — catálogo em `src/lib/llmCatalog.ts` (ex.: `anthropic:claude-3-5-sonnet`).
- **`aioxDefaultModelHint`** — sugestão de string para `AIOX_DEFAULT_MODEL` alinhada ao fornecedor.

A função `getAioxLlmBridge()` em `src/lib/aioxLlmBridge.ts` indica **quais chaves** carregar no `.env` consoante o prefixo do modelo (`openai:`, `anthropic:`, …).

O painel **Configuração LLM ↔ aiox-core** gera um **esqueleto de `.env`** (botão *Copiar esqueleto .env*).

## 3. Proxy LiteLLM (opcional)

Em `aiox-core/.docker/llm-routing/` existe configuração de **LiteLLM** para rotear modelos e reduzir custos. Pode coexistir com as chaves diretas no `.env`; ajustar conforme a tua política de API.

## 4. Papéis AIOX = os 12 agentes oficiais

A lista canónica vem de **`aiox-core/docs/guides/agents/`** (ver `traces/README.md` e ficheiros `*-SYSTEM.md`). Cada agente visual no hub tem um **`aioxRoleId`** entre os **12** (ex.: `aiox-master`, `dev`, `qa`, `pm`, …), definido em `src/domain/aioxTeamRoles.ts` com menção (`@dev`, `@aiox-master`, …) e persona (Dex, Orion, Atlas, …). Personas canónicas: ver [`AIOX_AGENTS_CANON.md`](./AIOX_AGENTS_CANON.md) e [`AIOX_CORE_SYNC.md`](./AIOX_CORE_SYNC.md).

Documento de referência no hub: [`AIOX_AGENTS_CANON.md`](./AIOX_AGENTS_CANON.md).

- **Equipa TI em execução** — visão compacta com progresso por papel.
- **Team Flow Orchestrator** — pipeline de 5 etapas, uma por papel, com estado espelhado do agente correspondente.

Alterar o papel no painel (secção *Papel TI (AIOX)*) atualiza o store e o fluxo visual.

## 5. Próximos passos técnicos

- Persistir preferências (`localStorage` ou API).
- Chamadas reais ao backend que reutilizem o mesmo `llmModelId` e `aioxRoleId`.
- Documentação OpenAPI no Notion antes de expor endpoints (regra de projeto).

---

*Ver também: `ARCHITECTURE.md`, `LOGICA_E_PROCESSOS.md`, `CHECKLIST_FLUXO_ITIL_COBIT.md`.*
