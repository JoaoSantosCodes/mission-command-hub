# Documentação de referência (importada)

Ficheiros preservados localmente em `MissionAgent/docs/reference/` para manter no próprio projeto o conhecimento AIOX / LLM / layout, sem depender de outras pastas do workspace.

| Ficheiro | Conteúdo |
|----------|-----------|
| [AIOX_CORE_SYNC.md](./AIOX_CORE_SYNC.md) | Gap analysis framework **aiox-core** ↔ dashboard (checklists com `src/` do hub original — adaptar mentalmente ao MissionAgent). |
| [AIOX_LLM_INTEGRATION.md](./AIOX_LLM_INTEGRATION.md) | Variáveis `.env`, fornecedores, LiteLLM, alinhamento com o clone aiox-core. |
| [AIOX_AGENTS_CANON.md](./AIOX_AGENTS_CANON.md) | Os 12 agentes oficiais e ligação a `docs/guides/agents/` no aiox-core. |
| [ADAPTACAO_AI_ORCHESTRATION_HUB.md](./ADAPTACAO_AI_ORCHESTRATION_HUB.md) | Comparação de layout *ai-orchestration-hub* vs hub de comando (UX, CommandBar, cockpit). |

Ver também o inventário das restantes pastas‑ideia: [REFERENCE_PROJECTS_ARCHIVE.md](./REFERENCE_PROJECTS_ARCHIVE.md).

**Framework AIOX:** o repositório completo deve estar em **`aiox-core/`** na raiz do monorepo (irmão de `MissionAgent/`), não dentro desta pasta `reference/`.
