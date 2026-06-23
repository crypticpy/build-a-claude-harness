// api-key.mjs — resolve the LLM API key from the environment, nothing else.
//
// The harness reads its key from the environment ONLY. No key ever lives in a
// file in this repo, and nothing here writes a key to disk. If you wire up a
// different secret store later, this is the one place to change.
//
// Resolution order (first non-empty wins):
//   1. LLM_API_KEY    — the provider-neutral name this harness prefers.
//   2. OPENAI_API_KEY — common fallback so an existing shell "just works".
//
// Returns the key string, or null if none is set. Callers MUST treat null as
// "skip the LLM step" and continue silently — an unconfigured key is a normal
// state (e.g. CI, a fresh clone), not an error.

export function getApiKey() {
  const key =
    (process.env.LLM_API_KEY && process.env.LLM_API_KEY.trim()) ||
    (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim()) ||
    null;
  return key || null;
}

// Resolve the model / endpoint / wire-format from the environment, with safe
// defaults. Kept beside getApiKey() so "where does the LLM config come from"
// has a single answer.
//
//   LLM_MODEL       — any small, cheap frontier model id (e.g. a *-mini /
//                     *-flash / *-haiku tier). Defaults to "gpt-4o-mini" so a
//                     bare OpenAI key works out of the box; set it to a real id
//                     your key can reach for any other provider.
//   LLM_BASE_URL    — API root, no trailing slash. Default is OpenAI's.
//   LLM_API_FORMAT  — "responses" (default) or "chat". See llm-call.mjs for the
//                     difference and why it matters for portability.
//   LLM_REASONING   — opt-in for the Responses API `reasoning.effort` lever.
//                     OFF by default ("" / "0" / "false" / "off"), because that
//                     field is only valid on reasoning models (OpenAI o-series /
//                     gpt-5-class) and a non-reasoning default like gpt-4o-mini
//                     rejects it. Set "1"/"true"/"on" to use each role's
//                     configured effort, or "low"/"medium"/"high" to force one,
//                     once LLM_MODEL points at a reasoning model.

export function getLlmEnv() {
  const baseUrl = (process.env.LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = process.env.LLM_MODEL || "gpt-4o-mini";
  const apiFormat = (process.env.LLM_API_FORMAT || "responses").toLowerCase();
  const reasoning = process.env.LLM_REASONING || "";
  return { baseUrl, model, apiFormat, reasoning };
}
