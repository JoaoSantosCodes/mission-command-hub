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
