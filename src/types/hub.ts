export type AioxInfo = {
  aioxRoot: string;
  aioxExists: boolean;
  agentsDir: string;
  version: string | null;
  versionError: string | null;
  agentCount: number;
  agentsError: string | null;
  pathsMasked?: boolean;
  /** `true` quando `ENABLE_AIOX_CLI_EXEC` e `AIOX_EXEC_SECRET` (≥8) estão definidos no servidor */
  aioxExecAvailable?: boolean;
  /** Onde o feed de atividade está persistido (ficheiro JSON ou PostgreSQL) */
  activityBackend?: "file" | "postgres";
  /** `false` quando `MISSION_AGENT_EDIT=0` — sem criar / editar / eliminar `.md` na API */
  agentEditAllowed?: boolean;
};

export type AioxExecResponse = {
  ok: boolean;
  subcommand: string;
  exitCode: number | null;
  timedOut?: boolean;
  stdout: string;
  stderr: string;
  /** `false` se o feed falhou após o CLI (saída do exec mantém-se) */
  activityLogged?: boolean;
};

export type AgentRow = { id: string; file: string; title: string };

export type ActivityEntry = {
  id: string;
  timestamp: string;
  agent: string;
  action: string;
  type: string;
  /** Semântica: command | bridge | agent | cli (opcional em entradas antigas). */
  kind?: string;
};

export type AgentDetailResponse = {
  id: string;
  file: string;
  title: string;
  content: string;
  /** `mtime:size` — enviar em `If-Match` ou `revision` no PUT para evitar sobrescrever alterações externas. */
  revision: string;
};

/** Resposta de `GET /api/aiox/overview` — ponte + agentes + feed num só pedido. */
export type AioxOverviewResponse = {
  ok: true;
  generatedAt: string;
  bridge: AioxInfo;
  agents: AgentRow[];
  agentsError: string | null;
  logs: ActivityEntry[];
  activity: {
    backend: string;
    kindCounts: Record<string, number>;
  };
  doubts: {
    llmEnabled: boolean;
  };
};

/** Resposta de `GET /api/aiox/doubts` — estado do painel Dúvidas vs. futuro LLM no servidor. */
export type AioxDoubtsCapabilities = {
  ok: boolean;
  llmEnabled: boolean;
  knowledgeBaseEnabled: boolean;
  message: string;
  docsUrl?: string | null;
};
