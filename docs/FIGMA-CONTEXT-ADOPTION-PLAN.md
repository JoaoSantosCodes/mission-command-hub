# Plano de adoção — Figma Context MCP

Objetivo: incorporar no `MissionAgent` as ideias/lógicas validadas do projeto `Figma-Context-MCP-main` para aumentar fidelidade de implementação de UI com base em Figma, mantendo segurança, previsibilidade e baixo custo operacional.

Data de referência: 2026-03-24.

---

## Resultado da validação de origem

- `type-check`: aprovado.
- `build`: aprovado.
- `test`: 2 falhas em validação de caminhos (`path validation`) com comportamento dependente de plataforma.
- `audit`: vulnerabilidades moderadas em cadeia de imagem (`jimp` / `file-type`) no projeto de origem.

Decisão: adotar arquitetura e fluxo de extração, evitando copiar diretamente os pontos com risco (path handling e cadeia de dependências de imagem sem hardening).

---

## Escopo de adoção no MissionAgent

### Incluir

- Fluxo de leitura de contexto Figma para tarefas de front-end.
- Estrutura MCP com ferramentas de leitura de dados de design.
- Resumo de design otimizado para consumo por agente (menos ruído para LLM).
- Validação de configuração/token e sinalização clara na UI.

### Não incluir na Fase 1

- Download/processamento de imagens local.
- Fluxo completo de webhook Notion/Figma.
- Funcionalidades que dependam de dependências com vulnerabilidades abertas sem mitigação.

---

## Fase 1 — MVP de contexto de design (baixo risco)

Objetivo: permitir que tarefas de front-end usem contexto real de Figma antes da execução.

### Entregas

- Novo endpoint de leitura de contexto Figma no backend (`/api/aiox/figma/context`), somente leitura.
- Serviço interno para buscar e resumir dados do arquivo/nó Figma com timeout e erros amigáveis.
- Guardrail no fluxo do Task Canvas:
  - se tarefa for front-end e houver referência Figma, exigir leitura de contexto antes de `agent-step`;
  - se não houver token/configuração, retornar bloqueio explicando o que falta.
- Atualização do painel de integrações com diagnóstico específico para Figma Context.

### Critérios de aceite

- Com `FIGMA_ACCESS_TOKEN` válido, endpoint responde com contexto resumido.
- Sem token, API retorna erro claro e acionável.
- Task Canvas sinaliza bloqueio quando contexto obrigatório não foi lido.
- Sem regressão nos fluxos atuais de `agent-step` e integrações já existentes.

---

## Fase 2 — Segurança e robustez

Objetivo: reduzir risco técnico antes de ampliar automação.

### Entregas

- Normalização de paths cross-platform (Windows/Linux/macOS) para qualquer operação de arquivo futura.
- Política por agente para capacidade `figmaContext:read`.
- Limites de taxa para endpoint de contexto.
- Testes unitários para:
  - parsing de URL Figma (fileKey/nodeId);
  - fallback e mensagens de erro;
  - gate de policy por agente.

### Critérios de aceite

- Testes de path e parsing verdes em Windows e Linux.
- Policy bloqueando/liberando conforme allowlist.
- Endpoint estável sob erro upstream e timeout.

---

## Fase 3 — Ampliação funcional

Objetivo: elevar o nível de automação com rastreabilidade.

### Entregas

- Vincular tarefa do canvas a referência Figma (URL/fileKey/nodeId) no modelo da tarefa.
- Sugestões automáticas de implementação com base no contexto extraído.
- Histórico de “contexto lido” no feed de atividade.
- Documentação OpenAPI do novo endpoint e fluxos.

### Critérios de aceite

- Tarefa com referência Figma produz retorno de agente com maior precisão de layout.
- Feed mostra eventos reais e sem duplicação de leitura de contexto.
- Contrato OpenAPI atualizado e validado.

---

## Mapeamento técnico (origem -> destino)

- `get_figma_data` (origem) -> `server/lib/figma-context.mjs` (novo no MissionAgent)
- validação de parâmetros com schema -> validação de payload no endpoint
- saída simplificada para LLM -> formato `designSummary` no retorno da API
- erro estruturado -> mensagens padronizadas para UI (`code`, `message`, `hint`)

---

## Riscos e mitigação

- Dependências de imagem vulneráveis na origem:
  - Mitigação: não portar pipeline de download/crop nesta fase.
- Diferenças de path por sistema operacional:
  - Mitigação: padronizar helpers e cobrir com testes dedicados.
- Custo/latência em chamadas Figma:
  - Mitigação: timeout curto, retries controlados e cache de curta duração.

---

## Ordem de execução sugerida

1. Implementar Fase 1 (endpoint + guardrail + UI status).
2. Cobrir testes e policy (Fase 2).
3. Ampliar para automação no canvas (Fase 3).

---

## Definição de pronto (DoD)

- Código com testes unitários essenciais.
- `npm test` e `npm run build` sem regressões no `MissionAgent`.
- Checklist e documentação atualizados:
  - `docs/CHECKLIST.md`
  - `docs/openapi.yaml`
  - `docs/INTEGRATIONS.md`
