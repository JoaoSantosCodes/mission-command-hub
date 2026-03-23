/**
 * Chat opcional no painel Dúvidas via API OpenAI-compatible (POST /v1/chat/completions).
 * Chaves só em variáveis de ambiente no servidor — nunca no bundle Vite.
 */
import { logger } from "./logger.mjs";

function apiKey() {
  const k = process.env.OPENAI_API_KEY || process.env.MISSION_LLM_API_KEY || "";
  return typeof k === "string" ? k.trim() : "";
}

/** Base URL sem barra final (OpenAI ou proxy compatível). */
export function getDoubtsLlmBaseUrl() {
  const raw = process.env.MISSION_LLM_BASE_URL || process.env.OPENAI_BASE_URL || "https://api.openai.com";
  return String(raw).replace(/\/$/, "");
}

export function getDoubtsLlmModel() {
  return (process.env.MISSION_LLM_MODEL || "gpt-4o-mini").trim();
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

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
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

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
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
