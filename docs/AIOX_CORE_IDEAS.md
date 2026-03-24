# Ideias e lógica do `aiox-core` para o MissionAgent

O clone do framework fica em **`aiox-core/`** na raiz do monorepo (ao lado de `MissionAgent/`). O hub resolve por defeito `../aiox-core` (ou `AIOX_CORE_PATH`). A ponte técnica (API, MCP, agentes `.md`) está em [INTEGRATIONS.md](./INTEGRATIONS.md). Documentação AIOX espelhada do antigo *mission-command-hub*: [reference/AIOX_CORE_SYNC.md](./reference/AIOX_CORE_SYNC.md) e [reference/README.md](./reference/README.md).

## Princípios de produto (extraídos do framework)

- **CLI first → observabilidade → UI:** a CLI é fonte de verdade; dashboards observam; UI não é requisito para operar. O MissionAgent já alinha ao **espelhar** ficheiros e versão da CLI, sem substituir execução LLM.
- **Planejamento agêntico + desenvolvimento contextualizado:** agentes de análise/PM/arquiteto produzem PRD/arquitetura; o SM desdobra em histórias ricas para o `@dev`. Útil como **modelo mental** para evolução do painel de tarefas e documentação no hub (não duplicar o motor AIOX no Express).
- **Paridade por IDE:** tabela de hooks (Claude vs Cursor vs Codex, etc.) em `docs/ide-integration.md` do aiox-core — ao documentar fluxos no MissionAgent, assumir **Cursor sem hooks de ciclo de vida**; reforçar regras, MCP e rotas da API.

## Módulos e pastas úteis para inspiração (sem copiar tudo)

| Área no aiox-core | O que traz de valor | Possível uso no MissionAgent |
|-------------------|---------------------|------------------------------|
| `.aiox-core/development/agents/*.md` | Definição canónica dos agentes | Já consumida pela ponte; manter sync ao renomear papéis |
| `bin/aiox.js`, `npx aiox-core doctor` | Saúde do framework | Já usado para versão CLI; painel opcional `POST /api/aiox/exec` |
| `packages/*` (installer, workflows) | Init de projeto, squads | Ideias para *wizard* de onboarding ou templates de equipa na UI |
| `squads/`, `squad.yaml` | Orquestração multi-agente declarativa | Roadmap: importar metadados de squad para vista “equipa” (só leitura) |
| `.aiox-core/infrastructure/scripts/ide-sync/` | `sync:ide:*`, validação por IDE | Checklist de consistência local antes de release do hub |
| `docs/guides/user-guide.md` | Fluxo sm/dev/qa e ficheiros de história | FAQ / Dúvidas e links `VITE_AIOX_DOCS_URL` |
| `.docker/llm-routing/` (LiteLLM) | Roteamento unificado de modelos | Alinhar com [reference/AIOX_LLM_INTEGRATION.md](./reference/AIOX_LLM_INTEGRATION.md) e `.env` do aiox-core |
| Testes em `tests/unit/squad/` | Validação de YAML e migrações | Padrão para testes de contrato se o hub passar a ler squads |

## O que não misturar

- Não tornar o MissionAgent dependência **npm** do aiox-core salvo decisão explícita; hoje o contrato é **ficheiros no disco + env**.
- Chaves e execução LLM dos agentes AIOX continuam no **clone aiox-core** / IDE; o hub só precisa de coerência de paths e documentação.

## Referências cruzadas no workspace

- Documento local: centraliza o papel do `aiox-core` nesta integração através dos ficheiros em `docs/reference/`.
- [reference/AIOX_CORE_SYNC.md](./reference/AIOX_CORE_SYNC.md) — gap analysis (texto importado; checklists com `src/` referem o hub original, não este repo).
