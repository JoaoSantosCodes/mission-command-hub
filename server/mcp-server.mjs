/**
 * Servidor MCP (stdio): expõe tools para inspeccionar aiox-core local alinhado à API MissionAgent.
 * Configuração Cursor: ver docs/MCP.md
 */
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod/v4';

import {
  resolveAioxPaths,
  readAgentFiles,
  getAioxVersion,
  MAX_COMMAND_LEN,
  COMMAND_FORWARD_HINT,
} from './lib/aiox-data.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const { AIOX_ROOT, AGENTS_DIR, AIOX_BIN } = resolveAioxPaths(ROOT);

function textJson(obj) {
  return {
    content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }],
  };
}

const server = new McpServer({
  name: 'mission-agent-aiox',
  version: '1.0.0',
});

server.registerTool(
  'mission_aiox_info',
  {
    description:
      'Metadados do aiox-core local: caminho, existência da pasta, versão da CLI (aiox --version), contagem de agentes .md.',
    inputSchema: z.object({}),
  },
  async () => {
    const v = getAioxVersion(AIOX_ROOT, AIOX_BIN);
    const agentsResult = readAgentFiles(AGENTS_DIR);
    return textJson({
      aioxRoot: AIOX_ROOT,
      aioxExists: fs.existsSync(AIOX_ROOT),
      agentsDir: AGENTS_DIR,
      version: v.ok ? v.version : null,
      versionError: v.ok ? null : v.error,
      agentCount: agentsResult.ok ? agentsResult.agents.length : 0,
      agentsError: agentsResult.ok ? null : agentsResult.error,
    });
  }
);

server.registerTool(
  'mission_list_agents',
  {
    description:
      'Lista agentes definidos em .aiox-core/development/agents (*.md) com id, ficheiro e título (primeira linha #).',
    inputSchema: z.object({}),
  },
  async () => {
    const r = readAgentFiles(AGENTS_DIR);
    if (!r.ok) {
      return textJson({ ok: false, error: r.error, agents: [] });
    }
    return textJson({ ok: true, agents: r.agents });
  }
);

server.registerTool(
  'mission_register_command',
  {
    description:
      'Regista intenção de comando (eco alinhado ao POST /api/aiox/command). Não executa shell; devolve dica e número de agentes disponíveis.',
    inputSchema: {
      command: z.string().min(1).max(MAX_COMMAND_LEN).describe('Texto do comando a registar'),
    },
  },
  async ({ command }) => {
    const ar = readAgentFiles(AGENTS_DIR);
    return textJson({
      ok: true,
      message: COMMAND_FORWARD_HINT,
      agentsAvailable: ar.ok ? ar.agents.length : 0,
      commandPreview: `${command.slice(0, 120)}${command.length > 120 ? '…' : ''}`,
    });
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('[mission-agent-mcp]', err);
  process.exit(1);
});
