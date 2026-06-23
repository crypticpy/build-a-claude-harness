// api-key.mjs — resolve the LLM API key + endpoint from the environment, only.
//
// The harness reads its key from the environment ONLY. No key ever lives in a
// file in this repo, and nothing here writes a key to disk. That single rule is
// what keeps a secret from ever being committed by accident.
//
// Anchored to reference/hooks/unified/modules/api-key.mjs — same env var names,
// same function signatures (getApiKey / getLlmEnv), same safe defaults.

/**
 * The API key, or null if none is set. Callers MUST treat null as "skip the LLM
 * step" and continue silently — an unconfigured key is a normal state (CI, a
 * fresh clone), not an error.
 *
 * Resolution order (first non-empty wins):
 *   1. LLM_API_KEY    — the provider-neutral name this harness prefers.
 *   2. OPENAI_API_KEY — common fallback so an existing shell "just works".
 */
export function getApiKey() {
  const key =
    (process.env.LLM_API_KEY && process.env.LLM_API_KEY.trim()) ||
    (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim()) ||
    null;
  return key || null;
}

/**
 * Resolve model / endpoint / wire-format from the environment, with safe
 * defaults — so "where does the LLM config come from" has one answer.
 *
 *   LLM_MODEL       — a small, cheap model id (a *-mini / *-flash / *-haiku
 *                     tier). Defaults to "gpt-4o-mini" so a bare OpenAI key
 *                     works out of the box.
 *   LLM_BASE_URL    — API root, no trailing slash. Default is OpenAI's.
 *   LLM_API_FORMAT  — "responses" (default) or "chat". See llm-call.mjs.
 */
export function getLlmEnv() {
  const baseUrl = (process.env.LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = process.env.LLM_MODEL || "gpt-4o-mini";
  const apiFormat = (process.env.LLM_API_FORMAT || "responses").toLowerCase();
  return { baseUrl, model, apiFormat };
}
