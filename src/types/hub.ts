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
  /** `false` quando `MISSION_AGENT_EDIT=0` — sem gravação de `.md` na API */
  agentEditAllowed?: boolean;
};

export type AioxExecResponse = {
  ok: boolean;
  subcommand: string;
  exitCode: number | null;
  timedOut?: boolean;
  stdout: string;
  stderr: string;
};

export type AgentRow = { id: string; file: string; title: string };

export type ActivityEntry = {
  id: string;
  timestamp: string;
  agent: string;
  action: string;
  type: string;
};

export type AgentDetailResponse = {
  id: string;
  file: string;
  title: string;
  content: string;
};
