# Architecture Agents Hub — servidor MCP (Model Context Protocol)

## Validação

A implementação usa o SDK oficial [`@modelcontextprotocol/sdk`](https://www.npmjs.com/package/@modelcontextprotocol/sdk) com transporte **stdio** (`StdioServerTransport`). É adequado para integração com Cursor e outros clientes MCP que lançam um processo local e comunicam por JSON-RPC no stdin/stdout.

- **Dependências:** `@modelcontextprotocol/sdk`, `zod` (peer para schemas das tools).
- **Entrada:** variável de ambiente `AIOX_CORE_PATH` (opcional); se omitida, assume `../aiox-core` relativo à pasta `MissionAgent/`, igual à API Express.

## Como correr

Na pasta `MissionAgent/`:

```bash
npm run mcp
```

Não escrever logs em `stdout` no meio da sessão MCP (o protocolo usa esse canal). Erros fatais antes de `connect` podem ir para `stderr`.

## Tools expostas

| Nome | Descrição |
|------|-----------|
| `mission_aiox_info` | Caminho do core, versão `aiox --version`, contagem de agentes, erros de caminho |
| `mission_list_agents` | Lista `{ id, file, title }` dos `.md` em agents |
| `mission_register_command` | Eco alinhado ao `POST /api/aiox/command` (não executa shell) |

## Configuração no Cursor

1. Abrir **Settings → MCP** (ou editar o ficheiro JSON de servidores MCP do projeto).
2. Adicionar um servidor com comando Node e o script do repositório, por exemplo:

```json
{
  "mcpServers": {
    "mission-agent-aiox": {
      "command": "node",
      "args": ["D:/Caminho/Absoluto/MissionAgent/server/mcp-server.mjs"],
      "env": {
        "AIOX_CORE_PATH": "D:/Caminho/Absoluto/aiox-core"
      }
    }
  }
}
```

Ajustar caminhos para o teu disco. Em Windows, barras ou `\\` são aceites no JSON.

## Segurança

- **Stdio local:** o cliente inicia o processo; não há porta TCP exposta por defeito.
- **Sem execução arbitrária:** as tools apenas leem ficheiros de agentes e chamam `aiox --version`; `mission_register_command` não passa o texto a `child_process`.
- Para expor MCP em rede (HTTP/SSE), seria outro transporte e implica autenticação e hardening — fora do âmbito do script actual.

## Inspeção opcional

Podes usar o [MCP Inspector](https://github.com/modelcontextprotocol/inspector) para testar tools interactivamente, apontando para o mesmo comando `node .../mcp-server.mjs`.
