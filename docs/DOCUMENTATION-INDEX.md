# 📚 Índice de Documentação — Architecture Agents Hub

Navegação rápida para toda a documentação do projeto. **Última atualização:** 2026-03-24

---

## 🎯 Documentação Essencial

### **Para Usar o Projeto**
- **[README.md](../README.md)** - Visão geral, instalação, scripts npm, roadmap
- **[.env.example](../.env.example)** - Variáveis de ambiente com comentários
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** - Como contribuir, padrões de código, CI/CD

### **Para Entender a Arquitetura**
- **[ARCHITECTURE.md](../ARCHITECTURE.md)** - Visão geral técnica do projeto (se existir)
- **[INTEGRATIONS.md](./INTEGRATIONS.md)** - Como as integrações MCP, LLM, Notion e Figma funcionam
- **[openapi.yaml](./openapi.yaml)** - Especificação completa da API REST

### **Para Desenvolvimento**
- **[IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md)** - Roadmap e fases de implementação
- **[CHECKLIST.md](./CHECKLIST.md)** - Estado geral do projeto, features concluídas
- **[CHECKLIST-VALIDATION.md](./CHECKLIST-VALIDATION.md)** - Validação operacional
- **[CHECKLIST-OPERACIONAL.md](./CHECKLIST-OPERACIONAL.md)** - Procedimentos operacionais

---

## 🔧 Documentação Técnica Avançada

### **MCP (Model Context Protocol)**
- **[MCP.md](./MCP.md)** - Servidor MCP do projeto, tools disponíveis, integração Cursor

### **CLI (Command Line Interface)**
- **[CLI-SETUP.md](./CLI-SETUP.md)** - Setup e uso da CLI aiox.js, detecção de versão, path resolution

### **Conceitos e Ideias**
- **[AIOX_CORE_IDEAS.md](./AIOX_CORE_IDEAS.md)** - Ideias do núcleo aiox, alinhamento de conceitos
- **[QA-CENARIO-CANVAS-REAL.md](./QA-CENARIO-CANVAS-REAL.md)** - Cenários QA reais, casos de uso

### **Planos de Adoção**
- **[FIGMA-CONTEXT-ADOPTION-PLAN.md](./FIGMA-CONTEXT-ADOPTION-PLAN.md)** - Estratégia de adoção do contexto Figma

---

## 📖 Referências e Arquivo

### **Pasta `reference/`**
Documentação de referência, arquivos históricos e padrões estabelecidos:

- **[README.md](./reference/README.md)** - Índice da pasta reference
- **[ADAPTACAO_AI_ORCHESTRATION_HUB.md](./reference/ADAPTACAO_AI_ORCHESTRATION_HUB.md)** - Como o projeto se baseia na arquitetura original
- **[AIOX_AGENTS_CANON.md](./reference/AIOX_AGENTS_CANON.md)** - Definição canônica dos agentes
- **[AIOX_CORE_SYNC.md](./reference/AIOX_CORE_SYNC.md)** - Sincronização com aiox-core
- **[AIOX_LLM_INTEGRATION.md](./reference/AIOX_LLM_INTEGRATION.md)** - Padrões de integração LLM
- **[REFERENCE_PROJECTS_ARCHIVE.md](./reference/REFERENCE_PROJECTS_ARCHIVE.md)** - Projetos de referência e inspiração

### **Ficheiros de Configuração**
- **[cursor-mcp.stack.example.json](./cursor-mcp.stack.example.json)** - Exemplo de configuração MCP do Cursor

---

## 🗺️ Navegação por Tópico

### **Começar do Zero**
1. Leia [README.md](../README.md)
2. Execute `npm install && npm run dev`
3. Consulte [CONTRIBUTING.md](../CONTRIBUTING.md) para contribuir
4. Revise [CHECKLIST.md](./CHECKLIST.md) para entender o estado

### **Integrar com MCP**
1. Comece em [INTEGRATIONS.md](./INTEGRATIONS.md)
2. Configure MCP usando [MCP.md](./MCP.md)
3. Veja exemplo em [cursor-mcp.stack.example.json](./cursor-mcp.stack.example.json)

### **Usar a API**
1. Leia [INTEGRATIONS.md](./INTEGRATIONS.md) para visão geral
2. Consulte [openapi.yaml](./openapi.yaml) para especificação completa
3. Confira exemplos em [CHECKLIST.md](./CHECKLIST.md)

### **Entender a Arquitetura**
1. Comece com [ARCHITECTURE.md](../ARCHITECTURE.md) (visão geral geral)
2. Leia [AIOX_CORE_IDEAS.md](./AIOX_CORE_IDEAS.md) para conceitos
3. Mergulhe em [reference/ADAPTACAO_AI_ORCHESTRATION_HUB.md](./reference/ADAPTACAO_AI_ORCHESTRATION_HUB.md)

### **Desenvolvimento Avançado**
1. Leia [IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md)
2. Consulte [CHECKLIST-VALIDATION.md](./CHECKLIST-VALIDATION.md) para validação
3. Siga procedimentos em [CHECKLIST-OPERACIONAL.md](./CHECKLIST-OPERACIONAL.md)

---

## 📊 Estado do Projeto (2026-03-24)

| Aspecto | Status | Referência |
|---------|--------|-----------|
| **API** | ✅ Operacional | [openapi.yaml](./openapi.yaml) |
| **UI** | ✅ Completa | [README.md](../README.md#tour-pela-interface) |
| **Testes** | ✅ 51/51 passando | [README.md](../README.md) |
| **CI/CD** | ✅ GitHub Actions | [README.md](../README.md#cicd) |
| **Documentação** | ✅ Abrangente | Este arquivo |
| **MCP** | ✅ Configurável | [MCP.md](./MCP.md) |
| **LLM** | ✅ Integrado | [INTEGRATIONS.md](./INTEGRATIONS.md) |

---

## 🔄 Manutenção da Documentação

### **Quando Atualizar**
- Após cada feature implementada, atualizar [CHECKLIST.md](./CHECKLIST.md)
- Mudanças de API: atualizar [openapi.yaml](./openapi.yaml)
- Novas variáveis de ambiente: atualizar [.env.example](../.env.example)
- Mudanças arquiteturais: atualizar [IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md)

### **Ciclo de Revisão**
- **Semanal**: [CHECKLIST-OPERACIONAL.md](./CHECKLIST-OPERACIONAL.md)
- **Sprint**: [IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md) e [CHECKLIST.md](./CHECKLIST.md)
- **Mensal**: [AIOX_CORE_IDEAS.md](./AIOX_CORE_IDEAS.md) e roadmap do README

---

## 💡 Dicas Rápidas

### **Encontrar Algo Específico**
- Variable de ambiente? → [.env.example](../.env.example)
- Endpoint da API? → [openapi.yaml](./openapi.yaml)
- Como funciona X? → [CHECKLIST.md](./CHECKLIST.md)
- Próximas features? → [README.md](../README.md#-roadmap) ou [IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md)

### **Troubleshooting**
- Erro ao iniciar? → [README.md](../README.md#arranque)
- MCP não conecta? → [MCP.md](./MCP.md)
- Integração falhando? → [INTEGRATIONS.md](./INTEGRATIONS.md)
- Validação de ambiente? → [CHECKLIST-VALIDATION.md](./CHECKLIST-VALIDATION.md)

---

## 🚀 Próximos Passos

- [ ] Revisar [IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md) para as próximas fases
- [ ] Consultar [CHECKLIST-OPERACIONAL.md](./CHECKLIST-OPERACIONAL.md) para procedimentos operacionais
- [ ] Executar `npm run verify:env` para validar ambiente
- [ ] Contribuir seguindo [CONTRIBUTING.md](../CONTRIBUTING.md)