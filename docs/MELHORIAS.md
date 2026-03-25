# Análise e Roteiro de Melhorias - Projeto AgentesMissao

## 1. Visão Geral do Projeto

O projeto **AgentesMissao** é um sistema multiagente para coordenação de desenvolvimento de software, composto por:

- **Skills de Agentes** (13 agentes especializados em `.opencode/skills/`)
- **MissionAgent** (aplicação React/Vite frontend atuando como "Architecture Agents Hub")

### Skills Disponíveis

| Agente | Arquivo | Função |
|--------|---------|--------|
| starter | starter.md | Agente base para validação |
| dev | dev.md | Desenvolvedor Full Stack |
| architect | architect.md | Arquiteto de Sistemas |
| pm | pm.md | Product Manager |
| sm | sm.md | Scrum Master |
| qa | qa.md | Quality Assurance |
| po | po.md | Product Owner |
| analyst | analyst.md | Analista de Mercado |
| devops | devops.md | DevOps Engineer |
| data-engineer | data-engineer.md | Engenheiro de Dados |
| ux-design-expert | ux-design-expert.md | Designer UX/UI |
| squad-creator | squad-creator.md | Criador de Squads |
| aiox-master | aiox-master.md | Mestre AIOX |

---

## 2. Melhorias nas Skills (Dívida Técnica e Padronização)
*(Validação: Estas melhorias são cruciais para a sanidade e escalabilidade do Core dos agentes)*

### 2.1 Padronização de Estrutura
**Problema:** As skills têm estruturas inconsistentes (`starter.md` tem 12 linhas, enquanto `dev.md` tem ~500).
**Recomendação:** Padronizar o YAML com `activation-instructions`, `persona_profile`, `commands`, `dependencies` em todas as definições.

### 2.2 Duplicação de Código (Activation Instructions & Comandos)
**Problema:** Blocos gigantes de `activation_instructions` e comandos (`help`, `yolo`) repetidos exaustivamente.
**Recomendação:** Criar um template base (`activation-template.md`) e injetá-lo dinamicamente no parser ou usar includes.

### 2.3 Integração CodeRabbit Modular
**Problema:** Instalação do WSL e CodeRabbit "hardcoded" nas skills.
**Recomendação:** Centralizar num `.opencode/config/coderabbit.yaml`. 

### 2.4 Resolução de Dependências Fantasmas
**Problema:** Skills referenciam scripts inexistentes (ex: `recovery-tracker.js`, `create-next-story.md`).
**Recomendação:** Auditar as dependências e criar um script de boot/validação que alerta se um Agente usar uma *tool* que não existe.

---

## 3. Melhorias Arquiteturais e de Interface (MissionAgent)
*(Validação: A componentização por domínio proposta é excelente. Abaixo, integrámos as inovações que transformarão o Hub).*

### 3.1 Reorganização por Domínio Sensato
Migrar do atual formato plano na `src/components/` para:
```text
src/components/
├── agents/           # Sidebar, Detail Modal, Create
├── workspace/        # MainWorkspace, CommandCenter, Header
├── tasks/            # TaskCanvas (Kanban Módulo)
├── collaboration/    # SquadView, Activity, DoubtsChat
├── whiteboard/       # **NOVO: Integração Excalidraw**
├── layout/           # Mobile Drawer, Skips
└── ui/               # Reutilizáveis (Shadcn/Tailwind)
```

### 3.2 Evolução para Estado e Persistência Global (Adoção de Supabase)
**Problema:** O Hub depende do `localStorage` e dos arquivos `.json` locais no servidor Node, quebrando o conceito *Real-Time Multijogador* se usado por uma equipe distribuída.
**Recomendação Inovadora:**
- **Integração Realtime (Supabase):** Migrar os dados do Kanban (`task-board.json`) e do Layout do Escritório para tabelas no Supabase (`task_board`, `office_layout`).
- **Store Zustand:** Usar Zustand no React alimentado por WebSockets (`supabase.channel()`). Ao mover um móvel ou um cartão no Kanban, toda a equipa conectada assiste à animação em tempo real!
- **Auth & Storage:** Múltiplos perfis de utilizadores em vez do "local user", e capacidade dos agentes fazerem *upload* de exportações de código e UMLs diretamente para um *Bucket* no Supabase.

---

## 4. Inovações de UX/UI (O Salto Dinâmico)

### 4.1 O "Escritório" (Canvas Isométrico) Dinâmico
**Problema Histórico:** O Canvas dos "Pixel Agents" (`office.js`) reage de forma isolada aos logs do backend.
**Evolução (Conversa entre páginas):**
- **Sincronia Kanban ↔ Escritório:** Arrastar uma tarefa para a coluna de `Em Curso` e atribuir ao `dev-agent` faz o boneco do Dev no escritório cancelar o "wander", caminhar para a sua mesa, e exibir uma animação "digitando à velocidade da luz".
- **Ação Bidirecional:** Um duplo-clique num agente correndo no escritório isométrico *abre imediatamente* o painel de definições avançadas (`AgentDetailModal.tsx`) desse agente na UI React.

### 4.2 Whiteboard Integrado (Inspiração Excalidraw)
O Hub tem de orquestrar código e arquitetura.
- **Implementação:** Criar a secção `components/whiteboard/` baseada no `excalidraw-replica`. Permitirá desenhar Diagramas de Classe, Wireframes UX (útil para o *ux-design-expert*) de forma nativa e exportar esses diagramas em JSON e PNG que os agentes multimodais conseguem ler.

### 4.3 Super-Atalhos de Teclado (Power User DX)
- Inspirado nas ferramentas modernas de Canvas: `V` para Setas, `T` para texto no Whiteboard; globalmente `Ctrl+F` filtra imediatamente o Kanban, `Ctrl+N` nova task, etc. Centralizar no hook `useShortcuts.ts`.

---

## 5. Roteiro e Recomendações Prioritárias Expandidas

### Fase 1: Estabilização do Core e Domínio React - ✅ [CONCLUÍDO]
Nos avanços mais recentes, toda esta fase foi integralmente concluída com sucesso:
1. **Padronização das Skills e CodeRabbit:** Extraídas as as instruções de ativação massivas de todos os 13 agentes para um *template* único partilhado (`activation-template.md`).
2. **Reorganização de Componentes (React):** O Hub passou por uma refatoração total, movendo todos os componentes da raiz para as pastas rigorosas de Domínio (`agents/`, `workspace/`, `tasks/`, `collaboration/`, `layout/`, `ui/`). 
3. **Validação TypeScript:** Todo o processo foi validado sem quebrar rotas, com o `tsc` a reportar 0 erros.

### Fase 2: O Salto Colaborativo (Supabase) - 🚀 [PRÓXIMO PASSO]
O projeto necessita agora de escalar para múltiplos utilizadores em tempo-real.
4. **Instalação do Supabase:** Configurar o `@supabase/supabase-js`.
5. **Migração do Kanban:** Mover a dependência do ficheiro `task-board.json` local para uma tabela SQL mantida através da API do supabase no frontend.
6. **Integração Realtime e Zustand:** Fazer com que o motor isométrico do escritório (`office.js`) comece a "escutar" WebSockets para que um arrasto no Kanban por um colega anime o Agente no escritório de todos.

### Fase 3: Whiteboard de Arquitetura (Excalidraw) - 💡 [FUTURO]
7. **Módulo Whiteboard:** Integrar a versão baseada no Excalidraw, fornecendo a ferramenta definitiva onde os agentes multimodais poderão "ver" e interagir com os diagramas exportados e analisar wireframes de UI desenhados no pranchão.
8. **Anexação Direta:** Ligar desenhos de arquitetura às histórias de utilizador (Stories) criadas pelo `sm` ou `po`.

### Fase 4: Autenticação Segura e Deploy - 🔒 [FUTURO]
9. **Single Sign-On:** Uma vez que o Supabase estiver a rodar, usar a feature de *Auth* nativa para proteger o hub, restringindo a visão dos agentes e quadros à equipa ou empresa.

---

## 6. Conclusão

O **AgentesMissao** possui a base local perfeita para LLMs potentes. Esta nova onda de melhorias não só limpa as inconsistências que baralhariam agentes menores (scripts soltos e falhas arquiteturais), como aponta o **MissionAgent** (Hub UI) para um formato de "Quartel General Multiplayer". Ao abandonar o fecho no `localStorage` e abraçar WebSockets/Supabase com animações reativas, a plataforma ganhará vida!

---

## 7. PRD (Product Requirements Document) - Migração Supabase

Este documento detalha a estratégia, a lógica de implementação e os prós e contras de migrar a camada principal de dados do Architecture Agents Hub (MissionAgent) para o Supabase.

Atualmente, o projeto utiliza `localStorage` no Frontend e ficheiros JSON no disco (`.mission-agent/*.json`) para guardar os quadros Kanban, o layout do escritório e o histórico (Feed). A adoção do Supabase transforma o Hub numa plataforma **Real-Time colaborativa**.

### 🏗️ Lógica a ser Implementada
A implementação da migração dividir-se-á em três componentes chave no Frontend:

#### 1. Inicialização do Cliente Global
Instalação da dependência oficial (`@supabase/supabase-js`) e criação do cliente abstrato injetando as chaves do `.env`:

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

#### 2. Sincronização de Estado com "Supabase Realtime"
Em vez de dependermos de eventos `window` (`mission-canvas-tasks`) ou *polling*, faremos *subscribe* aos Canais WebSockets do Supabase na inicialização da aplicação:

```typescript
const officeChannel = supabase.channel('office-layout')
  .on('broadcast', { event: 'layout-changed' }, (payload) => {
    // Altera o layout do canvas (móveis/agentes) instantaneamente
    updateLayoutFromPayload(payload);
  })
  .subscribe();
```
Quando o utilizador mover um móvel (`Shift+Alt+Drag`), um *broadcast* é enviado via Supabase sem sobrecarregar a base de dados em cada frame da animação. Ao soltar, a posição salta para a tabela `office_configurations`.

#### 3. Persistência Nativa (Substituição do `localStorage`)
Tabelas no Supabase que substituirão os ficheiros JSON:
- `tasks` (Substitui `task-board.json`)
- `activity_logs` (Substitui `activity.json` e a tabela local PG)
- `office_layout` (Substitui as chaves locais e do Vanilla JS)

### ✅ Prós da Implementação
- **Sedução Colaborativa Absoluta (Multiplayer):** Assim como no Figma ou no Miro, múltiplos usuários e monitores de TV poderão observar a mesma "área de trabalho" e "Canvas". Se o utilizador X mover a "Task Y" para "Done", a UI de todos atualiza na hora, e o Agente da Task começa a celebrar no cenário visual do Escritório no ecrã de toda a equipa.
- **"Source of Truth" Único:** Acaba a dependência do `localStorage`. Um hub na internet precisa manter consistência: qualquer pessoa logada vê as mesmas posições de móveis e estado do peixe do Aquário. Se o cache do navegador for limpo, nada se perde.
- **Escalável para Múltiplas Equipas (SaaS-Ready):** Se mais tarde desejar disponibilizar o MissionAgent como uma plataforma para outras empresas, o Supabase Auth resolve a gestão de identidades e o Row Level Security (RLS) protege que cada equipa veja só os seus próprios agentes.
- **Alivio de Processamento no Servidor Node Local:** O servidor Express passa a focar-se apenas na ponte CLI de comandos (`aiox-core`) com o disco e *rate limits*, em vez de atuar como gestor de CRUDs de Kanban e feed em ficheiros texto.

### ❌ Contras e Desafios
- **Latência Inerente e Conexão de Internet:** Atualmente, sendo "Local First", bater um cartão no Kanban tem atraso igual a zero. Ao forçar a validação persistente no Supabase, dependerá da rede. (Pode ser mitigado usando estratégias de Atualística Otimista na UI Web antes do Supabase responder de vez).
- **Abandono do "Funcionamento Nativo Offline":** A premissa do CLI `aiox` local reside em rodar no próprio PC sem dependências extremas além dos LLMs. Requerer Supabase quebra a capacidade de 100% de voo "Offline".
- **Migração do Feed Central:** As integrações no repositório `aiox-core` poderão ter de ser ensinadas para publicar *logs* de volta no Supabase de forma nativa pela API, ao invés da rotina pesada de leitura de ficheiros em tempo real.
- **Complexidade Adicionada:** Manter uma base de dados SQL (Migrações, Tabelas, Índices) para guardar objetos arbitrários. Por exemplo, cada vez que o JSON de definições do Quadro Kanban recebe uma nova feature, poderemos ter que atualizar o esquema do DB.

### 🔄 Conclusão do Plano
Migrar para o Supabase é a decisão correta se o objetivo principal do projeto for focar numa **Experiência Multijogador de Equipa** (vários humanos e agentes interagindo num mesmo Dashboard globalizado).

Se o objetivo do projeto for ser puramente um assistente IDE *single-player*, o fluxo local base suportado via Node e JSONs cumpre melhor na perspetiva computacional. Se se decidir avançar, o primeiro passo seria montar a tabela do `task_board`.
