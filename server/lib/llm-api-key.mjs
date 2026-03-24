/**
 * Chave e sondagem do fornecedor LLM (API compatível com OpenAI — OpenAI, OpenRouter, Azure OpenAI, proxies, etc.).
 * Ordem: MISSION_LLM_API_KEY (genérico) → OPENAI_API_KEY (legado).
 * Sem importar `doubts-llm.mjs` (evita dependência circular).
 */
export function getLlmApiKeyFromEnv() {
  const k = process.env.MISSION_LLM_API_KEY || process.env.OPENAI_API_KEY || "";
  return typeof k === "string" ? k.trim() : "";
}

export function getLlmBaseUrlFromEnv() {
  const raw = process.env.MISSION_LLM_BASE_URL || process.env.OPENAI_BASE_URL || "https://api.openai.com";
  return String(raw).replace(/\/$/, "");
}

/** `MISSION_LLM_VALIDATE=0` — não faz GET de sondagem (útil se o upstream não expõe `/v1/models`). */
export function isLlmUpstreamValidateDisabled() {
  return String(process.env.MISSION_LLM_VALIDATE || "").trim() === "0";
}

/**
 * Caminho relativo à base para sondagem GET com Bearer (por defeito `v1/models`).
 * Alguns hosts compatíveis usam outro caminho — define `MISSION_LLM_PROBE_PATH` (sem barra inicial).
 */
export function getLlmProbePath() {
  const p = String(process.env.MISSION_LLM_PROBE_PATH || "v1/models").trim().replace(/^\/+/, "");
  return p || "v1/models";
}

export function buildLlmProbeUrl() {
  return `${getLlmBaseUrlFromEnv()}/${getLlmProbePath()}`;
}
