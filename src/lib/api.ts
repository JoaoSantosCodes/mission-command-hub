import type { TaskItem } from "@/components/task-canvas/types";
import type { AioxExecResponse, HubCustomizationPayload } from "@/types/hub";

/** Erro sintético quando `PUT /api/aiox/task-board` devolve 409 (If-Match). */
export const TASK_BOARD_CONFLICT_ERROR = "CONFLICT_TASK_BOARD";

function scopeForHttpStatus(status: number): string {
  if (status === 429) return "Demasiados pedidos";
  if (status === 409) return "Conflito";
  if (status >= 500) return "Erro no servidor";
  if (status >= 400) return "Pedido inválido";
  return "Erro HTTP";
}

const API_FETCH_INIT: RequestInit = { cache: "no-store" };

/** Resposta HTML/404 típica quando só há estático ou a API não está na porta esperada. */
function friendlyNonJsonErrorBody(text: string): string {
  const t = text.slice(0, 800);
  if (/<!DOCTYPE/i.test(t) || /<html/i.test(t) || /Cannot GET \//.test(t)) {
    return (
      "A API não devolveu JSON (HTML ou página de erro em vez de JSON em `/api`). " +
      "Em desenvolvimento, corre `npm run dev` (Express em :8787 + Vite em :5179) ou `npm run dev:embed` / `npm run preview` (API embebida no Vite). " +
      "Em produção local: `npm run build` + `npm start` (tudo na mesma origem, por defeito :8787). " +
      "Com `MISSION_EMBED_API=0` no Vite, o Express tem de estar a ouvir em :8787 (`preview:all` ou `npm run dev`)."
    );
  }
  return text;
}

/** Corpo HTTP 200 que não é JSON (ex.: index.html do SPA) — antes `JSON.parse` rebentava sem mensagem útil. */
function parseJsonOkBody<T>(text: string): T {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(
      "Resposta vazia em `/api` (esperado JSON). Corre `npm run dev`, `npm run dev:embed`, `npm run preview`, ou `npm run build` + `npm start`."
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    const friendly = friendlyNonJsonErrorBody(text);
    if (friendly !== text) {
      throw new Error(friendly);
    }
    throw new Error(
      "A resposta em `/api` não era JSON válido. Recarrega após `npm run dev` / `preview`, ou usa `npm run build` + `npm start`."
    );
  }
}

export async function fetchJson<T>(path: string): Promise<T> {
  let r: Response;
  try {
    r = await fetch(path, API_FETCH_INIT);
  } catch (e) {
    const msg =
      e instanceof TypeError
        ? "Sem ligação à API. Confirma que o servidor está a correr (ex.: npm run dev)."
        : `Erro de rede: ${String(e)}`;
    throw new Error(msg);
  }
  const text = await r.text();
  if (!r.ok) {
    let detail = text;
    try {
      const j = JSON.parse(text) as { error?: string; retryAfterSec?: number };
      if (j?.error) {
        detail = j.error;
        if (r.status === 429 && typeof j.retryAfterSec === "number") {
          detail += ` (repetir daqui a ~${j.retryAfterSec}s)`;
        }
      }
    } catch {
      const friendly = friendlyNonJsonErrorBody(text);
      if (friendly !== text) {
        throw new Error(friendly);
      }
      detail = text;
    }
    const scope = scopeForHttpStatus(r.status);
    throw new Error(detail ? `${scope}: ${detail}` : `${scope} (${r.status})`);
  }
  return parseJsonOkBody<T>(text);
}

export async function postCommand(command: string): Promise<{ message?: string }> {
  let r: Response;
  try {
    r = await fetch("/api/aiox/command", {
      ...API_FETCH_INIT,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command }),
    });
  } catch (e) {
    throw new Error(
      e instanceof TypeError
        ? "Sem ligação à API. Confirma que o servidor está a correr (ex.: npm run dev)."
        : String(e)
    );
  }
  const text = await r.text();
  let data: { ok?: boolean; message?: string; error?: string } = {};
  try {
    if (text) data = JSON.parse(text) as typeof data;
  } catch {
    /* corpo não-JSON */
  }
  if (!r.ok) {
    if (data.error) {
      let msg = data.error;
      const j = data as { retryAfterSec?: number };
      if (r.status === 429 && typeof j.retryAfterSec === "number") {
        msg += ` (repetir daqui a ~${j.retryAfterSec}s)`;
      }
      throw new Error(`${scopeForHttpStatus(r.status)}: ${msg}`);
    }
    const friendly = friendlyNonJsonErrorBody(text);
    if (friendly !== text) {
      throw new Error(friendly);
    }
    const scope = scopeForHttpStatus(r.status);
    throw new Error(text ? `${scope}: ${text}` : `${scope} (${r.status})`);
  }
  return data;
}

export async function postAioxExec(
  subcommand: "doctor" | "info",
  confirm: string
): Promise<AioxExecResponse> {
  let r: Response;
  try {
    r = await fetch("/api/aiox/exec", {
      ...API_FETCH_INIT,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subcommand, confirm }),
    });
  } catch (e) {
    throw new Error(
      e instanceof TypeError
        ? "Sem ligação à API. Confirma que o servidor está a correr (ex.: npm run dev)."
        : String(e)
    );
  }
  const text = await r.text();
  let data = {} as AioxExecResponse & { error?: string };
  try {
    if (text) data = JSON.parse(text) as typeof data;
  } catch {
    /* ignore */
  }
  if (!r.ok) {
    if (data.error) {
      let msg = data.error;
      const j = data as { retryAfterSec?: number };
      if (r.status === 429 && typeof j.retryAfterSec === "number") {
        msg += ` (repetir daqui a ~${j.retryAfterSec}s)`;
      }
      throw new Error(`${scopeForHttpStatus(r.status)}: ${msg}`);
    }
    const friendly = friendlyNonJsonErrorBody(text);
    if (friendly !== text) {
      throw new Error(friendly);
    }
    const scope = scopeForHttpStatus(r.status);
    throw new Error(text ? `${scope}: ${text}` : `${scope} (${r.status})`);
  }
  return data as AioxExecResponse;
}

export async function postDoubtsChat(
  messages: Array<{ role: "user" | "assistant"; content: string }>
): Promise<{ ok: boolean; reply: string }> {
  let r: Response;
  try {
    r = await fetch("/api/aiox/doubts/chat", {
      ...API_FETCH_INIT,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
  } catch (e) {
    throw new Error(
      e instanceof TypeError
        ? "Sem ligação à API. Confirma que o servidor está a correr (ex.: npm run dev)."
        : String(e)
    );
  }
  const text = await r.text();
  let data: { ok?: boolean; reply?: string; error?: string } = {};
  try {
    if (text) data = JSON.parse(text) as typeof data;
  } catch {
    /* ignore */
  }
  if (!r.ok) {
    if (data.error) {
      let msg = data.error;
      const j = data as { retryAfterSec?: number };
      if (r.status === 429 && typeof j.retryAfterSec === "number") {
        msg += ` (repetir daqui a ~${j.retryAfterSec}s)`;
      }
      throw new Error(`${scopeForHttpStatus(r.status)}: ${msg}`);
    }
    const friendly = friendlyNonJsonErrorBody(text);
    if (friendly !== text) {
      throw new Error(friendly);
    }
    const scope = scopeForHttpStatus(r.status);
    throw new Error(text ? `${scope}: ${text}` : `${scope} (${r.status})`);
  }
  if (!data.reply || typeof data.reply !== "string") {
    throw new Error("Resposta inválida do servidor (sem reply).");
  }
  return { ok: true, reply: data.reply };
}

/**
 * Stream SSE de `POST /api/aiox/doubts/chat/stream` — linhas `data: {"delta":"..."}` até `data: [DONE]`.
 */
export async function postDoubtsChatStream(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  onDelta: (chunk: string) => void
): Promise<void> {
  let r: Response;
  try {
    r = await fetch("/api/aiox/doubts/chat/stream", {
      ...API_FETCH_INIT,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
  } catch (e) {
    throw new Error(
      e instanceof TypeError
        ? "Sem ligação à API. Confirma que o servidor está a correr (ex.: npm run dev)."
        : String(e)
    );
  }
  if (r.status === 503) {
    let err = "LLM desactivado no servidor.";
    try {
      const t = await r.text();
      const j = t ? (JSON.parse(t) as { error?: string }) : {};
      if (j?.error) err = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(err);
  }
  if (r.status === 400) {
    let err = "Pedido inválido.";
    try {
      const t = await r.text();
      const j = t ? (JSON.parse(t) as { error?: string }) : {};
      if (j?.error) err = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(`${scopeForHttpStatus(400)}: ${err}`);
  }
  if (!r.ok) {
    const text = await r.text();
    throw new Error(text ? `${scopeForHttpStatus(r.status)}: ${text}` : `${scopeForHttpStatus(r.status)} (${r.status})`);
  }
  const reader = r.body?.getReader();
  if (!reader) {
    throw new Error("Resposta sem corpo (stream).");
  }
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") return;
      try {
        const j = JSON.parse(payload) as { delta?: string; error?: string };
        if (j.error) {
          throw new Error(j.error);
        }
        if (typeof j.delta === "string" && j.delta) {
          onDelta(j.delta);
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }
}

export async function getTaskBoard(): Promise<{ tasks: TaskItem[]; revision: string }> {
  const d = await fetchJson<{ ok?: boolean; tasks?: TaskItem[]; revision?: string }>("/api/aiox/task-board");
  return {
    tasks: Array.isArray(d.tasks) ? d.tasks : [],
    revision: typeof d.revision === "string" ? d.revision : "0:0",
  };
}

export type TaskRunStatus = "running" | "succeeded" | "failed";
export type TaskRunEntry = {
  runId: string;
  taskId: string;
  assigneeAgentId: string;
  status: TaskRunStatus;
  startedAt: string;
  finishedAt: string | null;
  updatedAt: string;
  message: string;
  suggestedColumn: "todo" | "doing" | "review" | "done" | "manter";
  blocked: boolean;
};

export async function getTaskRuns(): Promise<{
  runs: TaskRunEntry[];
  autoRunEnabled: boolean;
  pollMs: number;
  backend: "file" | "postgres" | string;
  policy: { raw: string; defaults: string[]; rules: string[] };
}> {
  const d = await fetchJson<{
    ok?: boolean;
    runs?: TaskRunEntry[];
    autoRunEnabled?: boolean;
    pollMs?: number;
    backend?: string;
    policy?: { raw?: string; defaults?: string[]; rules?: string[] };
  }>(
    "/api/aiox/task-runs"
  );
  return {
    runs: Array.isArray(d.runs) ? d.runs : [],
    autoRunEnabled: d.autoRunEnabled !== false,
    pollMs: typeof d.pollMs === "number" && Number.isFinite(d.pollMs) ? d.pollMs : 5000,
    backend: d.backend || "file",
    policy: {
      raw: d.policy?.raw || "",
      defaults: Array.isArray(d.policy?.defaults) ? d.policy.defaults : [],
      rules: Array.isArray(d.policy?.rules) ? d.policy.rules : [],
    },
  };
}

export async function putTaskBoard(tasks: TaskItem[], ifMatchRevision: string): Promise<{ revision: string }> {
  let r: Response;
  try {
    r = await fetch("/api/aiox/task-board", {
      ...API_FETCH_INIT,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "If-Match": ifMatchRevision,
      },
      body: JSON.stringify({ tasks }),
    });
  } catch (e) {
    throw new Error(
      e instanceof TypeError
        ? "Sem ligação à API. Confirma que o servidor está a correr (ex.: npm run dev)."
        : String(e)
    );
  }
  const text = await r.text();
  if (r.status === 409) {
    throw new Error(TASK_BOARD_CONFLICT_ERROR);
  }
  let data: { ok?: boolean; revision?: string; error?: string } = {};
  try {
    if (text) data = JSON.parse(text) as typeof data;
  } catch {
    /* ignore */
  }
  if (!r.ok) {
    if (data.error) {
      let msg = data.error;
      const j = data as { retryAfterSec?: number };
      if (r.status === 429 && typeof j.retryAfterSec === "number") {
        msg += ` (repetir daqui a ~${j.retryAfterSec}s)`;
      }
      throw new Error(`${scopeForHttpStatus(r.status)}: ${msg}`);
    }
    const friendly = friendlyNonJsonErrorBody(text);
    if (friendly !== text) {
      throw new Error(friendly);
    }
    const scope = scopeForHttpStatus(r.status);
    throw new Error(text ? `${scope}: ${text}` : `${scope} (${r.status})`);
  }
  const revision = typeof data.revision === "string" ? data.revision : "0:0";
  return { revision };
}

export async function getCustomization(): Promise<{ data: HubCustomizationPayload; revision: string }> {
  const d = await fetchJson<{ ok?: boolean; data?: HubCustomizationPayload; revision?: string }>(
    "/api/aiox/customization"
  );
  return {
    data: d.data ?? { agents: {}, office: {} },
    revision: typeof d.revision === "string" ? d.revision : "0:0",
  };
}

export type IntegrationsConfigPayload = Partial<
  Record<
    | "MISSION_LLM_API_KEY"
    | "MISSION_LLM_BASE_URL"
    | "MISSION_LLM_MODEL"
    | "MISSION_DOUBTS_LLM"
    | "OPENAI_API_KEY"
    | "SLACK_WEBHOOK_URL"
    | "NOTION_TOKEN"
    | "FIGMA_ACCESS_TOKEN"
    | "DATABASE_URL"
    | "ENABLE_AIOX_CLI_EXEC"
    | "AIOX_EXEC_SECRET",
    string
  >
>;

export async function getIntegrationsConfig(): Promise<{
  data: IntegrationsConfigPayload;
  redacted: Record<string, string>;
  revision: string;
}> {
  const d = await fetchJson<{
    ok?: boolean;
    data?: IntegrationsConfigPayload;
    redacted?: Record<string, string>;
    revision?: string;
  }>("/api/aiox/integrations-config");
  return {
    data: d.data ?? {},
    redacted: d.redacted ?? {},
    revision: typeof d.revision === "string" ? d.revision : "0:0",
  };
}

export async function putIntegrationsConfig(
  data: IntegrationsConfigPayload,
  ifMatchRevision: string
): Promise<{ revision: string; redacted: Record<string, string> }> {
  let r: Response;
  try {
    r = await fetch("/api/aiox/integrations-config", {
      ...API_FETCH_INIT,
      method: "PUT",
      headers: { "Content-Type": "application/json", "If-Match": ifMatchRevision },
      body: JSON.stringify({ data }),
    });
  } catch (e) {
    throw new Error(
      e instanceof TypeError
        ? "Sem ligação à API. Confirma que o servidor está a correr (ex.: npm run dev)."
        : String(e)
    );
  }
  const text = await r.text();
  if (r.status === 409) throw new Error("CONFLICT_INTEGRATIONS_CONFIG");
  let body: { revision?: string; redacted?: Record<string, string>; error?: string } = {};
  try {
    if (text) body = JSON.parse(text) as typeof body;
  } catch {
    /* ignore */
  }
  if (!r.ok) {
    if (body.error) throw new Error(`${scopeForHttpStatus(r.status)}: ${body.error}`);
    throw new Error(text ? `${scopeForHttpStatus(r.status)}: ${text}` : `${scopeForHttpStatus(r.status)} (${r.status})`);
  }
  return {
    revision: typeof body.revision === "string" ? body.revision : "0:0",
    redacted: body.redacted ?? {},
  };
}

export async function putCustomization(
  data: HubCustomizationPayload,
  ifMatchRevision: string
): Promise<{ revision: string }> {
  let r: Response;
  try {
    r = await fetch("/api/aiox/customization", {
      ...API_FETCH_INIT,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "If-Match": ifMatchRevision,
      },
      body: JSON.stringify(data),
    });
  } catch (e) {
    throw new Error(
      e instanceof TypeError
        ? "Sem ligação à API. Confirma que o servidor está a correr (ex.: npm run dev)."
        : String(e)
    );
  }
  const text = await r.text();
  if (r.status === 409) throw new Error("CONFLICT_CUSTOMIZATION");
  let body: { revision?: string; error?: string } = {};
  try {
    if (text) body = JSON.parse(text) as typeof body;
  } catch {
    /* ignore */
  }
  if (!r.ok) {
    if (body.error) throw new Error(`${scopeForHttpStatus(r.status)}: ${body.error}`);
    throw new Error(text ? `${scopeForHttpStatus(r.status)}: ${text}` : `${scopeForHttpStatus(r.status)} (${r.status})`);
  }
  return { revision: typeof body.revision === "string" ? body.revision : "0:0" };
}

export type FishState = {
  ok: boolean;
  food: number;
  maxFood: number;
  updatedAt: string;
  mood: "feliz" | "normal" | "fome" | "critico";
};

export async function getFishState(): Promise<FishState> {
  return fetchJson<FishState>("/api/aiox/fish");
}

export async function consumeFishFood(amount: number, source: string): Promise<FishState> {
  const r = await fetch("/api/aiox/fish/consume", {
    ...API_FETCH_INIT,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, source }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(text || "falha ao consumir ração");
  return parseJsonOkBody<FishState>(text);
}

export async function feedFish(amount = 12): Promise<FishState> {
  const r = await fetch("/api/aiox/fish/feed", {
    ...API_FETCH_INIT,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(text || "falha ao alimentar peixe");
  return parseJsonOkBody<FishState>(text);
}

export type IntegrationsStatus = {
  ok: boolean;
  generatedAt: string;
  summary?: { okCount: number; total: number; healthScore: number };
  alerts?: string[];
  history?: Array<{
    generatedAt: string;
    healthScore: number;
    okCount: number;
    total: number;
    alerts: string[];
  }>;
  database: { configured: boolean; activityBackend: "file" | "postgres" | string };
  exec: { configured: boolean };
  doubts: {
    llmKeyConfigured?: boolean;
    doubtsOptIn: boolean;
    llmEnabled: boolean;
    streamAvailable?: boolean;
    llmValidated?: boolean;
    llmError?: string | null;
    llmValidationSkipped?: boolean;
    /** @deprecated Usar llm*; mantido igual à API para compatibilidade */
    openaiKeyConfigured: boolean;
    openaiValidated?: boolean;
    openaiError?: string | null;
  };
  notion: { tokenConfigured: boolean; tokenValidated?: boolean; tokenError?: string | null };
  figma: { tokenConfigured: boolean; tokenValidated?: boolean; tokenError?: string | null };
  fish: { persistence: "file" | string; enabled: boolean };
  slack: {
    persistence: "webhook" | string;
    enabled: boolean;
    webhookConfigured: boolean;
    webhookFormatOk: boolean;
    mirrorReady: boolean;
  };
};

/**
 * Alinhado com o servidor: OK se a sondagem LLM passou, ou se ainda não houve sondagem nesta resposta
 * mas `llmEnabled` + `llmKeyConfigured` (ex.: `GET …/integrations-status` sem `validate=1`).
 */
export function doubtsLlmIntegrationSeemsOk(doubts: IntegrationsStatus["doubts"]): boolean {
  if (!doubts || doubts.llmEnabled !== true) return false;
  if (doubts.llmValidated === true || doubts.openaiValidated === true) return true;
  const noHttpProbeYet = doubts.llmValidated === undefined && doubts.openaiValidated === undefined;
  if (noHttpProbeYet && doubts.llmKeyConfigured === true) return true;
  return false;
}

/** Mensagem curta para o cartão Integrações quando a validação LLM falhou (com opt-in activo). */
export function doubtsLlmIntegrationErrorHint(doubts: IntegrationsStatus["doubts"]): string | null {
  if (!doubts?.llmEnabled || doubtsLlmIntegrationSeemsOk(doubts)) return null;
  const e = doubts.llmError ?? doubts.openaiError;
  if (e != null && String(e).trim() !== "") return String(e);
  return "Erro ao validar API LLM";
}

export async function getIntegrationsStatus(opts?: { validate?: boolean }): Promise<IntegrationsStatus> {
  const validate = opts?.validate ? "?validate=1" : "";
  return fetchJson<IntegrationsStatus>(`/api/aiox/integrations-status${validate}`);
}

export async function postActivityEvent(payload: {
  agent?: string;
  action: string;
  type?: string;
  kind?: string;
}): Promise<{ ok: boolean }> {
  let r: Response;
  try {
    r = await fetch("/api/aiox/activity/event", {
      ...API_FETCH_INIT,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    throw new Error(
      e instanceof TypeError
        ? "Sem ligação à API. Confirma que o servidor está a correr (ex.: npm run dev)."
        : String(e)
    );
  }
  const text = await r.text();
  if (!r.ok) {
    let err = text || "falha ao registar atividade";
    try {
      const j = text ? (JSON.parse(text) as { error?: string }) : {};
      if (j.error) err = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(err);
  }
  return parseJsonOkBody<{ ok: boolean }>(text);
}

export type TaskAgentStepResponse = {
  ok: true;
  retorno: string;
  sugestao_coluna: "todo" | "doing" | "review" | "done" | "manter";
  bloqueada?: boolean;
};

export type FigmaContextResponse = {
  ok: true;
  source: { fileKey: string; nodeId: string | null; depth: number | null };
  meta: {
    fileName: string | null;
    version: string | null;
    lastModified: string | null;
    thumbnailUrl: string | null;
  };
  designSummary: {
    nodeCount: number;
    rootType: string | null;
    rootName: string | null;
  };
};

/**
 * Pedido de retorno estruturado do LLM sobre uma tarefa do canvas (requer MISSION_DOUBTS_LLM + chave LLM).
 */
export async function postTaskBoardAgentStep(payload: {
  task: Pick<TaskItem, "id" | "title" | "columnId"> &
    Partial<Pick<TaskItem, "note" | "blocked" | "assigneeAgentId">>;
  assigneeLabel?: string;
}): Promise<TaskAgentStepResponse> {
  let r: Response;
  try {
    r = await fetch("/api/aiox/task-board/agent-step", {
      ...API_FETCH_INIT,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    throw new Error(
      e instanceof TypeError
        ? "Sem ligação à API. Confirma que o servidor está a correr (ex.: npm run dev)."
        : String(e)
    );
  }
  const text = await r.text();
  let data: {
    ok?: boolean;
    retorno?: string;
    sugestao_coluna?: string;
    bloqueada?: boolean;
    error?: string;
    retryAfterSec?: number;
  } = {};
  try {
    if (text) data = JSON.parse(text) as typeof data;
  } catch {
    /* ignore */
  }
  if (!r.ok) {
    let err = data.error || text || "falha no retorno do agente";
    if (r.status === 404 && /recurso API não encontrado/i.test(String(err))) {
      err =
        "servidor API desactualizado ou rota em falta. Para o Node na porta 8787 (se usas npm run dev:split), volta a arrancar; com npm run dev a API fica embebida no Vite — reinicia o Vite. Confirma GET /api/health → capabilities.taskBoardAgentStep.";
    }
    if (r.status === 429 && typeof data.retryAfterSec === "number") {
      err += ` (repetir daqui a ~${data.retryAfterSec}s)`;
    }
    throw new Error(`${scopeForHttpStatus(r.status)}: ${err}`);
  }
  if (data.ok !== true || typeof data.retorno !== "string" || !data.retorno.trim()) {
    throw new Error("Resposta inválida do servidor (agent-step).");
  }
  const col = (data.sugestao_coluna || "manter").toLowerCase();
  const sugestao_coluna =
    col === "todo" || col === "doing" || col === "review" || col === "done" || col === "manter"
      ? col
      : "manter";
  return {
    ok: true,
    retorno: data.retorno.trim(),
    sugestao_coluna,
    ...(typeof data.bloqueada === "boolean" ? { bloqueada: data.bloqueada } : {}),
  };
}

export async function postFigmaContext(payload: {
  figmaUrl?: string;
  fileKey?: string;
  nodeId?: string;
  depth?: number;
}): Promise<FigmaContextResponse> {
  let r: Response;
  try {
    r = await fetch("/api/aiox/figma/context", {
      ...API_FETCH_INIT,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    throw new Error(
      e instanceof TypeError
        ? "Sem ligação à API. Confirma que o servidor está a correr (ex.: npm run dev)."
        : String(e)
    );
  }
  const text = await r.text();
  let data: {
    ok?: boolean;
    code?: string;
    error?: string;
    hint?: string;
    source?: FigmaContextResponse["source"];
    meta?: FigmaContextResponse["meta"];
    designSummary?: FigmaContextResponse["designSummary"];
  } = {};
  try {
    if (text) data = JSON.parse(text) as typeof data;
  } catch {
    /* ignore */
  }
  if (!r.ok) {
    const msg = [data.error, data.hint].filter(Boolean).join(" ");
    throw new Error(`${scopeForHttpStatus(r.status)}: ${msg || text || "falha ao obter contexto Figma"}`);
  }
  if (
    data.ok !== true ||
    !data.source ||
    !data.meta ||
    !data.designSummary ||
    !Number.isFinite(data.designSummary.nodeCount)
  ) {
    throw new Error("Resposta inválida do servidor (figma/context).");
  }
  return {
    ok: true,
    source: data.source,
    meta: data.meta,
    designSummary: data.designSummary,
  };
}

export async function putAgentMarkdown(
  id: string,
  content: string,
  revision?: string | null
): Promise<{ ok: boolean; id: string; bytes: number }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (revision) {
    headers["If-Match"] = revision;
  }
  const r = await fetch(`/api/aiox/agents/${encodeURIComponent(id)}`, {
    ...API_FETCH_INIT,
    method: "PUT",
    headers,
    body: JSON.stringify({ content, ...(revision ? { revision } : {}) }),
  });
  const text = await r.text();
  let data: { ok?: boolean; id?: string; bytes?: number; error?: string; conflict?: boolean } = {};
  try {
    if (text) data = JSON.parse(text) as typeof data;
  } catch {
    /* ignore */
  }
  if (!r.ok) {
    if (data.error) {
      let msg = data.error;
      const j = data as { retryAfterSec?: number; conflict?: boolean };
      if (r.status === 429 && typeof j.retryAfterSec === "number") {
        msg += ` (repetir daqui a ~${j.retryAfterSec}s)`;
      }
      if (r.status === 409 && j.conflict) {
        msg += " Recarrega o agente para ver a versão no disco.";
      }
      throw new Error(`${scopeForHttpStatus(r.status)}: ${msg}`);
    }
    const friendly = friendlyNonJsonErrorBody(text);
    if (friendly !== text) {
      throw new Error(friendly);
    }
    const scope = scopeForHttpStatus(r.status);
    throw new Error(text ? `${scope}: ${text}` : `${scope} (${r.status})`);
  }
  return data as { ok: boolean; id: string; bytes: number };
}

export async function createAgent(payload: {
  id: string;
  content?: string;
}): Promise<{ ok: boolean; id: string; bytes: number }> {
  const r = await fetch("/api/aiox/agents", {
    ...API_FETCH_INIT,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await r.text();
  let data: { ok?: boolean; id?: string; bytes?: number; error?: string } = {};
  try {
    if (text) data = JSON.parse(text) as typeof data;
  } catch {
    /* ignore */
  }
  if (!r.ok) {
    if (data.error) {
      let msg = data.error;
      const j = data as { retryAfterSec?: number };
      if (r.status === 429 && typeof j.retryAfterSec === "number") {
        msg += ` (repetir daqui a ~${j.retryAfterSec}s)`;
      }
      throw new Error(`${scopeForHttpStatus(r.status)}: ${msg}`);
    }
    const friendly = friendlyNonJsonErrorBody(text);
    if (friendly !== text) {
      throw new Error(friendly);
    }
    const scope = scopeForHttpStatus(r.status);
    throw new Error(text ? `${scope}: ${text}` : `${scope} (${r.status})`);
  }
  return data as { ok: boolean; id: string; bytes: number };
}

export async function deleteAgent(id: string): Promise<{ ok: boolean; id: string }> {
  const r = await fetch(`/api/aiox/agents/${encodeURIComponent(id)}`, {
    ...API_FETCH_INIT,
    method: "DELETE",
  });
  const text = await r.text();
  let data: { ok?: boolean; id?: string; error?: string } = {};
  try {
    if (text) data = JSON.parse(text) as typeof data;
  } catch {
    /* ignore */
  }
  if (!r.ok) {
    if (data.error) {
      let msg = data.error;
      const j = data as { retryAfterSec?: number };
      if (r.status === 429 && typeof j.retryAfterSec === "number") {
        msg += ` (repetir daqui a ~${j.retryAfterSec}s)`;
      }
      throw new Error(`${scopeForHttpStatus(r.status)}: ${msg}`);
    }
    const friendly = friendlyNonJsonErrorBody(text);
    if (friendly !== text) {
      throw new Error(friendly);
    }
    const scope = scopeForHttpStatus(r.status);
    throw new Error(text ? `${scope}: ${text}` : `${scope} (${r.status})`);
  }
  return data as { ok: boolean; id: string };
}
