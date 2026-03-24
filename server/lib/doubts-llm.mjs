/**
 * Chat opcional no painel Dúvidas via API compatível com OpenAI (`POST /v1/chat/completions`).
 * Chave: `MISSION_LLM_API_KEY` (recomendado) ou `OPENAI_API_KEY` (legado). Base: `MISSION_LLM_BASE_URL`.
 */
import { logger } from "./logger.mjs";
import { getLlmApiKeyFromEnv, getLlmBaseUrlFromEnv } from "./llm-api-key.mjs";

function apiKey() {
  return getLlmApiKeyFromEnv();
}

/** Base URL sem barra final (qualquer host compatível). */
export function getDoubtsLlmBaseUrl() {
  return getLlmBaseUrlFromEnv();
}

export function getDoubtsLlmModel() {
  return (process.env.MISSION_LLM_MODEL || "gpt-4o-mini").trim();
}

/** Cabeçalhos opcionais (ex.: OpenRouter pede HTTP-Referer / X-Title para rankings). */
function optionalUpstreamHeaders() {
  const h = {};
  const referer = String(process.env.MISSION_LLM_HTTP_REFERER || "").trim();
  const title = String(process.env.MISSION_LLM_APP_TITLE || "").trim();
  if (referer) h["HTTP-Referer"] = referer;
  if (title) h["X-Title"] = title;
  return h;
}

/** Opt-in explícito + chave mínima (lido em tempo de pedido — não cachear no load do módulo). */
export function isDoubtsLlmConfigured() {
  return process.env.MISSION_DOUBTS_LLM === "1" && apiKey().length >= 8;
}

const DEFAULT_SYSTEM = `És um assistente breve e útil no contexto do Architecture Agents Hub (orquestração de agentes aiox-core, API Mission Agent, documentação em MissionAgent/docs/). Responde em português de Portugal quando o utilizador escreve em português. Não inventes rotas ou ficheiros — se não souberes, indica docs/openapi.yaml ou README.`;

export function getDoubtsSystemPrompt() {
  const c = process.env.MISSION_DOUBTS_SYSTEM_PROMPT;
  return typeof c === "string" && c.trim().length > 0 ? c.trim() : DEFAULT_SYSTEM;
}

/** Métricas sem PII — apenas contagens para observabilidade. */
export function logDoubtsLlmRequest(userMessages, mode) {
  const msgCount = userMessages.length;
  const approxChars = userMessages.reduce(
    (n, m) => n + (typeof m?.content === "string" ? m.content.length : 0),
    0
  );
  logger.info({ doubtsLlm: true, mode, msgCount, approxChars }, "doubts LLM request");
}

/**
 * @param {Array<{ role: string; content: string }>} userMessages — só user/assistant (sem system)
 * @returns {Promise<{ text: string }>}
 */
export async function callDoubtsChatCompletion(userMessages) {
  const key = apiKey();
  const base = getDoubtsLlmBaseUrl();
  const model = getDoubtsLlmModel();
  const timeoutMs = Math.min(
    Math.max(Number(process.env.MISSION_LLM_TIMEOUT_MS) || 60_000, 5000),
    120_000
  );
  const maxTokens = Math.min(Math.max(Number(process.env.MISSION_LLM_MAX_TOKENS) || 1024, 64), 4096);

  const messages = [{ role: "system", content: getDoubtsSystemPrompt() }, ...userMessages];
  logDoubtsLlmRequest(userMessages, "json");

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        ...optionalUpstreamHeaders(),
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });
    const raw = await res.text();
    let data;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      logger.warn({ status: res.status }, "doubts LLM resposta não-JSON");
      throw new Error(`Resposta inválida do serviço de modelo (HTTP ${res.status}).`);
    }
    if (!res.ok) {
      const errMsg =
        data?.error?.message || data?.error || data?.message || raw?.slice(0, 200) || `HTTP ${res.status}`;
      logger.warn({ status: res.status, err: String(errMsg).slice(0, 200) }, "doubts LLM upstream error");
      throw new Error(typeof errMsg === "string" ? errMsg : "Erro do serviço de modelo.");
    }
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) {
      throw new Error("Resposta vazia do modelo.");
    }
    return { text: text.trim() };
  } catch (e) {
    if (e?.name === "AbortError") {
      throw new Error("Tempo esgotado ao contactar o modelo.");
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}

const MAX_DOUBTS_MSG = 35;
const MAX_DOUBTS_CONTENT = 8000;

/**
 * Valida o corpo de POST /api/aiox/doubts/chat (e /chat/stream).
 * @returns {{ ok: true, messages: Array<{ role: string, content: string }> } | { ok: false, status: number, error: string }}
 */
export function validateDoubtsChatBody(req) {
  const raw = req.body?.messages;
  if (!Array.isArray(raw)) {
    return { ok: false, status: 400, error: "Corpo inválido: espera-se { messages: [...] }." };
  }
  if (raw.length === 0 || raw.length > MAX_DOUBTS_MSG) {
    return {
      ok: false,
      status: 400,
      error: `messages: entre 1 e ${MAX_DOUBTS_MSG} entradas.`,
    };
  }
  const cleaned = [];
  for (let i = 0; i < raw.length; i++) {
    const m = raw[i];
    if (!m || typeof m !== "object") {
      return { ok: false, status: 400, error: "Cada mensagem deve ser um objecto." };
    }
    const role = m.role;
    const content = m.content;
    if (role !== "user" && role !== "assistant") {
      return { ok: false, status: 400, error: "role deve ser user ou assistant." };
    }
    if (typeof content !== "string" || !content.trim()) {
      return { ok: false, status: 400, error: "content deve ser texto não vazio." };
    }
    if (content.length > MAX_DOUBTS_CONTENT) {
      return {
        ok: false,
        status: 400,
        error: `content demasiado longo (máx. ${MAX_DOUBTS_CONTENT} caracteres).`,
      };
    }
    cleaned.push({ role, content });
  }
  if (cleaned[cleaned.length - 1].role !== "user") {
    return {
      ok: false,
      status: 400,
      error: "A última mensagem do histórico deve ser do utilizador (user).",
    };
  }
  return { ok: true, messages: cleaned };
}

/**
 * Stream OpenAI-compatible (SSE). Gera troços de texto (delta) por token/pedaço.
 * @param {Array<{ role: string, content: string }>} userMessages
 */
export async function* streamDoubtsChatCompletion(userMessages) {
  const key = apiKey();
  const base = getDoubtsLlmBaseUrl();
  const model = getDoubtsLlmModel();
  const timeoutMs = Math.min(
    Math.max(Number(process.env.MISSION_LLM_STREAM_TIMEOUT_MS) || Number(process.env.MISSION_LLM_TIMEOUT_MS) || 120_000, 10_000),
    300_000
  );
  const maxTokens = Math.min(Math.max(Number(process.env.MISSION_LLM_MAX_TOKENS) || 1024, 64), 4096);
  const messages = [{ role: "system", content: getDoubtsSystemPrompt() }, ...userMessages];
  logDoubtsLlmRequest(userMessages, "stream");

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        ...optionalUpstreamHeaders(),
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        stream: true,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const raw = await res.text();
      let errMsg = `HTTP ${res.status}`;
      try {
        const data = raw ? JSON.parse(raw) : {};
        errMsg = data?.error?.message || data?.error || errMsg;
      } catch {
        /* ignore */
      }
      logger.warn({ status: res.status, err: String(errMsg).slice(0, 200) }, "doubts LLM stream upstream error");
      throw new Error(typeof errMsg === "string" ? errMsg : "Erro do serviço de modelo.");
    }
    if (!res.body) {
      throw new Error("Resposta sem corpo (stream).");
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const s = line.trim();
        if (!s.startsWith("data: ")) continue;
        const payload = s.slice(6).trim();
        if (payload === "[DONE]") return;
        try {
          const json = JSON.parse(payload);
          if (json?.error) {
            const em = json.error?.message || json.error;
            throw new Error(typeof em === "string" ? em : "Erro no stream do modelo.");
          }
          const delta = json?.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta) yield delta;
        } catch (e) {
          if (e instanceof SyntaxError) continue;
          throw e;
        }
      }
    }
  } catch (e) {
    if (e?.name === "AbortError") {
      throw new Error("Tempo esgotado ao contactar o modelo (stream).");
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}

const TASK_AGENT_SYSTEM_DEFAULT = `És um agente de execução no quadro Kanban do Mission Agent. Produz um retorno operacional para a equipa avançar.
Responde APENAS com JSON válido UTF-8 (sem markdown, sem texto antes ou depois) com exactamente estas chaves:
"retorno": string (2 a 3500 caracteres) — trabalho realizado ou em curso, bloqueios, próximos passos verificáveis;
"sugestao_coluna": uma de "todo","doing","review","done","manter" — onde o cartão deve ficar a seguir ("manter" se não mudar);
"bloqueada": boolean — true se depende de algo externo e não deve avançar agora.
O texto em "retorno" deve estar em português de Portugal.`;

/** @returns {string} */
export function getTaskAgentSystemPrompt() {
  const c = process.env.MISSION_TASK_AGENT_SYSTEM_PROMPT;
  return typeof c === "string" && c.trim().length > 0 ? c.trim() : TASK_AGENT_SYSTEM_DEFAULT;
}

const TASK_AGENT_COLS = new Set(["todo", "doing", "review", "done", "manter"]);

/**
 * @param {string} text
 * @returns {{ retorno: string, sugestao_coluna: string, bloqueada?: boolean }}
 */
export function parseTaskAgentStepResponse(text) {
  const t = String(text || "").trim();
  let raw = t;
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(t);
  if (fence) raw = fence[1].trim();
  const brace = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (brace === -1 || last <= brace) {
    throw new Error('Resposta do modelo: JSON inválido (esperado objecto com "retorno").');
  }
  raw = raw.slice(brace, last + 1);
  let o;
  try {
    o = JSON.parse(raw);
  } catch {
    throw new Error('Resposta do modelo: JSON inválido (esperado objecto com "retorno").');
  }
  const retorno = String(o.retorno ?? "").trim().slice(0, 4000);
  if (!retorno) {
    throw new Error('Resposta do modelo: campo "retorno" vazio.');
  }
  let sugestao_coluna = String(o.sugestao_coluna ?? "manter").trim().toLowerCase();
  if (!TASK_AGENT_COLS.has(sugestao_coluna)) sugestao_coluna = "manter";
  /** @type {boolean | undefined} */
  let bloqueada;
  if (typeof o.bloqueada === "boolean") bloqueada = o.bloqueada;
  return { retorno, sugestao_coluna, bloqueada };
}

/**
 * @param {{
 *   id: string,
 *   title: string,
 *   note?: string,
 *   columnId: string,
 *   blocked?: boolean,
 *   assigneeAgentId?: string,
 *   assigneeLabel?: string,
 * }} task
 * @returns {Promise<{ text: string }>}
 */
export async function callTaskAgentStepCompletion(task) {
  const key = apiKey();
  const base = getDoubtsLlmBaseUrl();
  const model = getDoubtsLlmModel();
  const timeoutMs = Math.min(
    Math.max(Number(process.env.MISSION_LLM_TIMEOUT_MS) || 60_000, 5000),
    120_000
  );
  const maxTokens = Math.min(
    Math.max(Number(process.env.MISSION_LLM_MAX_TOKENS_TASK) || 1800, 256),
    4096
  );
  const note = typeof task.note === "string" && task.note.trim() ? task.note.trim().slice(0, 6000) : "(nenhuma)";
  const userContent = [
    `Identificador da tarefa: ${task.id}`,
    `Coluna actual: ${task.columnId}`,
    `Bloqueada (metadado do quadro): ${task.blocked === true ? "sim" : "não"}`,
    `Título: ${task.title}`,
    `Nota existente:\n${note}`,
    `Agente atribuído (id): ${task.assigneeAgentId || "nenhum"}`,
    task.assigneeLabel ? `Agente atribuído (rótulo): ${task.assigneeLabel}` : null,
    "",
    "Gera o JSON pedido no system prompt para esta tarefa.",
  ]
    .filter(Boolean)
    .join("\n");

  const messages = [
    { role: "system", content: getTaskAgentSystemPrompt() },
    { role: "user", content: userContent },
  ];
  logger.info({ taskAgentStep: true, taskId: task.id, titleLen: task.title.length }, "task agent LLM request");

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        ...optionalUpstreamHeaders(),
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });
    const raw = await res.text();
    let data;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      logger.warn({ status: res.status }, "task agent LLM resposta não-JSON");
      throw new Error(`Resposta inválida do serviço de modelo (HTTP ${res.status}).`);
    }
    if (!res.ok) {
      const errMsg =
        data?.error?.message || data?.error || data?.message || raw?.slice(0, 200) || `HTTP ${res.status}`;
      logger.warn({ status: res.status, err: String(errMsg).slice(0, 200) }, "task agent LLM upstream error");
      throw new Error(typeof errMsg === "string" ? errMsg : "Erro do serviço de modelo.");
    }
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) {
      throw new Error("Resposta vazia do modelo.");
    }
    return { text: text.trim() };
  } catch (e) {
    if (e?.name === "AbortError") {
      throw new Error("Tempo esgotado ao contactar o modelo.");
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}
