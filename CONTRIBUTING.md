# 🤝 Contribuindo para Architecture Agents Hub

Obrigado por seu interesse em contribuir! Este documento explica como participar do desenvolvimento do projeto.

## 📋 Código de Conduta

Este projeto segue um código de conduta colaborativo. Seja respeitoso e construtivo em todas as interações.

## 🚀 Como Começar

### 1. Preparação do Ambiente

```bash
# Clone o repositório
git clone https://github.com/JoaoSantosCodes/mission-command-hub.git
cd MissionAgent

# Instale dependências
npm install

# Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas chaves API
```

### 2. Desenvolvimento

```bash
# Inicie o servidor de desenvolvimento
npm run dev

# Execute os testes
npm test

# Verifique linting
npm run lint
```

## 🛠️ Ferramentas de Desenvolvimento

### **Qualidade de Código**
- **ESLint v9** - Linting automático
- **Prettier** - Formatação consistente
- **Husky** - Git hooks automatizados
- **lint-staged** - Linting apenas em arquivos modificados

### **Testes**
- **Vitest** - Framework de testes rápido
- **51 testes** cobrindo funcionalidades críticas
- Cobertura completa de API e componentes

### **CI/CD**
- **GitHub Actions** - Pipeline automatizada
- Validação em push e pull requests
- Build, testes e auditoria de segurança

## 📝 Tipos de Contribuição

### 🐛 **Bug Reports**
1. Use o template de issue no GitHub
2. Descreva o problema claramente
3. Inclua passos para reproduzir
4. Adicione screenshots se relevante

### ✨ **Features**
1. Abra uma issue discutindo a feature
2. Aguarde feedback da comunidade
3. Implemente seguindo os padrões do projeto

### 🔧 **Pull Requests**
1. Fork o repositório
2. Crie uma branch descritiva: `git checkout -b feature/nome-da-feature`
3. Faça commits pequenos e descritivos
4. Garanta que todos os testes passam
5. Atualize documentação se necessário

## 📏 Padrões de Código

### **Commits**
- Use commits pequenos e descritivos
- Siga conventional commits quando possível:
  ```
  feat: adiciona nova funcionalidade
  fix: corrige bug específico
  docs: atualiza documentação
  refactor: refatora código sem mudar funcionalidade
  test: adiciona ou corrige testes
  ```

### **Branches**
- `main` - Branch principal (sempre estável)
- `develop` - Branch de desenvolvimento
- `feature/*` - Novas funcionalidades
- `bugfix/*` - Correções de bugs
- `hotfix/*` - Correções urgentes

### **Code Style**
- TypeScript com tipagem estrita
- Componentes React funcionais com hooks
- Nomes descritivos em português (consistente com o projeto)
- Comentários explicativos quando necessário

## 🧪 Testes

### **Executando Testes**
```bash
# Todos os testes
npm test

# Testes em modo watch
npm run test:watch

# Testes com cobertura (futuro)
npm run test:coverage
```

### **Escrevendo Testes**
- Use `describe` e `it` para organizar testes
- Teste funcionalidades críticas primeiro
- Mantenha testes legíveis e bem documentados
- Foque em comportamento, não implementação

## 📚 Documentação

### **README**
- Mantenha atualizado com novas funcionalidades
- Documente variáveis de ambiente
- Inclua exemplos de uso

### **Código**
- Use JSDoc para funções complexas
- Comente lógica não óbvia
- Mantenha nomes auto-explicativos

## 🔍 Revisão de Código

### **Checklist para Reviewers**
- [ ] Código segue padrões estabelecidos
- [ ] Testes foram adicionados/atualizados
- [ ] Documentação foi atualizada
- [ ] Linting passa sem erros
- [ ] Build é bem-sucedido
- [ ] Funcionalidade funciona como esperado

### **Checklist para Contributors**
- [ ] Commits seguem conventional commits
- [ ] Branch está atualizada com main
- [ ] Conflitos foram resolvidos
- [ ] Testes locais passam
- [ ] Documentação foi atualizada

## 🎯 Áreas de Contribuição

### **Prioritárias**
- Melhorar cobertura de testes
- Otimizar performance
- Adicionar novas integrações
- Melhorar UX/UI

### **Secundárias**
- Traduções (i18n)
- Acessibilidade (WCAG)
- Documentação adicional
- Ferramentas de desenvolvimento

## 📞 Suporte

- **Issues**: Para bugs e discussões
- **Discussions**: Para ideias e perguntas gerais
- **Discord/Slack**: Para chat em tempo real (se disponível)

## 📄 Licença

Ao contribuir, você concorda que suas contribuições serão licenciadas sob a mesma licença do projeto.

---

**Obrigado por contribuir!** 🎉 Sua participação ajuda a tornar o Architecture Agents Hub melhor para todos.