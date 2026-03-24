# Validação: layout `ai-orchestration-hub-main` vs Mission Command Hub

Referência: projeto local `ai-orchestration-hub-main` (UI de demonstração com dados mock).

## Estrutura do `ai-orchestration-hub`

```
┌─────────────────────────────────────────────────────────────────┐
│ Header: logo · CommandBar (@aiox-master) · métricas (7/11, sprint) │
├──────────┬──────────────────────────────────────┬───────────────┤
│ Esquerda │ Centro (flex-1)                      │ Direita       │
│ w-64     │ WorkflowArea                         │ w-72          │
│          │ Tabs: Planejamento | Arquitetura |   │ ActivityFeed  │
│ Projetos │   Dev | Qualidade                    │ (colapsável)  │
│ Backlog  │ + vista animada (Framer) por tab     │ logs mock     │
│ Agentes  │                                      │               │
└──────────┴──────────────────────────────────────┴───────────────┘
```

- **Shell:** `h-screen overflow-hidden` — sem scroll na página inteira; só zonas internas fazem scroll.
- **CommandBar:** input global estilo “terminal” + `executeCommand` (mock com `setTimeout`).
- **WorkflowArea:** **tabs horizontais** por fase (PM/Arquitetura/Dev/QA) com **views** trocadas por estado + `AnimatePresence`.
- **AgentsSidebar:** projetos, resumo backlog, lista de agentes (`AgentCard`).
- **ActivityFeed:** feed de atividade com **colapsar** para barra estreita.

## Estrutura actual do Mission Command Hub

- **Shell:** `h-[100dvh] overflow-hidden` (modo cockpit), alinhado ao orchestration hub.
- **Header:** `AppTopNav` — linha única: marca · `MissionCommandBar` · contagem de agentes / badge de dados · tema · operador.
- **Esquerda (`lg+`):** `MissionAgentsRail` (`w-64`) — missão, **fases** (atalhos para o mesmo estado que as tabs centrais), lista de agentes.
- **Centro:** `MissionWorkflowArea` — **tabs horizontais** (Execução · Espaço & fluxo · Sistemas · Controlo) + `AnimatePresence`; **scroll só no `<main>`** (`#conteudo-principal`).
- **Direita (`lg+`):** `MissionRightRail` (`w-72`, recolhível para rail estreito) — chat LLM, `LiveLogStream`, `DataPanel` (substitui o antigo `HubLateralAside` fixo).
- **&lt; `lg`:** rails laterais ocultos; no fundo do `<main>` mantém-se bloco «Chat, registo e dados» (equivalente à coluna direita).

## É possível adaptar?

**Sim, parcialmente e por camadas** — os dois usam React, Tailwind, componentes semelhantes (shadcn). Não é “copiar e colar” um layout sobre o outro sem decisões de produto.

| Elemento orchestration | Adaptação no Mission Hub | Esforço / nota |
|------------------------|---------------------------|----------------|
| **Header + CommandBar** | Inserir uma faixa tipo CommandBar no `AppTopNav` ou abaixo do hero; ligar a `POST /api/llm/chat` ou orquestrador real em vez de mock. | Médio — novo contrato de “comando global”. |
| **Tabs por fase (WorkflowArea)** | Mapear às secções existentes ou a uma **sub-navegação** dentro de “Equipa” / “Fluxo”; ou modo “dashboard compacto” opcional. | Médio — pode competir com scroll-spy mobile. |
| **Sidebar projetos + backlog** | Dados hoje vêm de agentes/tarefas SQLite/Postgres, não de “projetos” Jira-like. Pode **imitar o visual** (cartões) no `DataPanel` ou bloco novo se o modelo de dados evoluir. | Alto se exigir novo modelo; baixo se for só UI. |
| **ActivityFeed colapsável** | Padrão já próximo: colapsar zona “Registo” / painéis; reutilizar ícones `PanelRightOpen/Close` como no feed. | Baixo. |
| **h-screen sem scroll global** | **Conflito:** o hub actual assenta em **página longa** + âncoras. Passar a shell fixa implica **scroll só no `<main>`** e redesenhar mobile (`MobileSectionNav`). | Alto — refactor estrutural. |

## Recomendações pragmáticas

1. **Baixo risco:** inspirar **visual** (bordas, densidade, tabs horizontais secundários) dentro de **uma** secção já existente (ex.: cartões no `TeamExecutionBoard`), sem alterar o shell global.
2. **Médio risco:** adicionar **CommandBar** opcional (feature flag) no topo, partilhando estado com `LlmAgentChatPanel` / API.
3. **Alto risco / produto:** segundo layout “modo cockpit” `h-screen` com três colunas — tratar como **nova rota** ou toggle (`?layout=cockpit`) para não quebrar o fluxo actual.

## Conclusão

O layout do **ai-orchestration-hub** é **compatível tecnologicamente** e útil como **referência de UX** (comando no topo, área central por fase, feed à direita). A **adaptação completa** ao Mission Command Hub exige alinhar **modelo de dados** (missão vs projetos/sprints) e decidir se se mantém a **página em scroll** ou se se migra para **dashboard de altura fixa** com scroll interno.

## Fase 1 (implementada)

- **`MissionCommandBar`** no `AppTopNav`: campo de texto + envio que **não** chama API directamente; preenche o compositor do **`LlmAgentChatPanel`**.
- Ponte **`src/lib/missionChatBridge.ts`**: evento `mission:inject-chat-draft` + `dispatchMissionChatDraft` (scroll suave para `#hub-llm-chat-lateral` em `xl+` ou `#hub-llm-chat-mobile` abaixo).
- **`LlmAgentChatPanel`**: ouve o evento, muda para a aba «Conversa», expande o painel e foca o textarea.

## Fase 2 — layout orchestration (implementada)

- Shell de **três colunas** + **tabs** no centro + **rail direito colapsável** (`MissionRightRail`), mapeando o modelo do `ai-orchestration-hub-main` sem dados mock no comando global.

## Visão UI (paridade com o orchestration hub)

- Classe **`orchestration-hub-canvas`** na raiz da página: tipografia **Inter** + **JetBrains Mono** (`font-mono-game`), bordas **`border-border`**, cabeçalho **`bg-card/80`**, CommandBar com **Terminal**, **`@aiox-master`**, foco **`border-primary` + `glow-blue-sm`**, botão **Executar** (nativo, como no demo).
- Shell **`h-screen`** + **`bg-background`** (sem `max-w` no contentor), linha principal **`flex flex-1 overflow-hidden`** como no `Index.tsx` de referência.
- **`MissionAgentsRail`**: blocos **Projetos** (projecto activo) + **Backlog geral** (métricas) + **Agentes de IA** com cartões estilo **`AgentCard`** (`MissionOrchestrationAgentRow`). Fases só nas **tabs centrais** (`WorkflowArea`), não na sidebar.
- Tabs centrais: largura **natural** (`-mb-px`, `gap-1`, `px-4 pt-3`), animação **0,35s**; coluna direita espelha **`ActivityFeed`** (cabeçalho mínimo + ponto + «Feed de atividade»).
- Opcional: **`VITE_APP_VERSION`** no `.env` para o badge do header (fallback `v0.1`).
