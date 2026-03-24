# Inventário de referências já internalizadas

Resumo do que cada pasta era **para o MissionAgent** e o que foi **preservado** no repositório principal.

| Pasta (antiga) | Papel / ideias para o hub | Preservado em |
|----------------|---------------------------|---------------|
| **aiox-core** | Framework CLI, agentes `.md`, validadores | **`aiox-core/`** na raiz do workspace (movido para fora da *Base*). Ponte: `../aiox-core`, `AIOX_CORE_PATH`. |
| **mission-command-hub** | Docs AIOX, LLM, agentes canónicos, notas de layout | **`MissionAgent/docs/reference/*.md`** (AIOX_*, ADAPTACAO_*). |
| **ai-orchestration-hub-main** | Shell três colunas, CommandBar, tabs por fase | Ideias já reflectidas na UI do MissionAgent; detalhe em `ADAPTACAO_AI_ORCHESTRATION_HUB.md`. |
| **Referência de command center (externa)** | Canvas pixel office, tempo/meteo, terminal, Kanban visual | Padrões absorvidos no *command center* / Central do MissionAgent; sem cópia de código necessária. |
| **vibe-kanban-main** | Kanban / fluxo de tarefas | Inspiração para *task board*; lógica própria no MissionAgent. |
| **pixel-agents-main** | Agentes em actividade no canvas | Inspiração UI; sem dependência directa. |
| **ClawTeam-main** | Equipa / swarm OpenClaw | Referência futura; não copiado. |
| **awesome-openclaw-master** / **awesome-openclaw-skills-main** | Listas de skills comunidade | Catálogo vivo em [clawskills.sh](https://clawskills.sh/) — não vale duplicar o repositório no MissionAgent. |

Estado alvo: operação com `MissionAgent/` autocontido para docs/assets e integração opcional com `aiox-core` via `AIOX_CORE_PATH`.
