// llm-call.mjs — the one place the harness talks to an LLM.
//
// Everything model-facing routes through callLlm(). That single choke point is
// what makes the harness provider-neutral: swap the env vars, and every hook
// that summarizes, diagnoses, or recalls follows along — no other file changes.
//
// TWO WIRE FORMATS, because "OpenAI-compatible" is not one thing:
//
//   • "responses"  → POST {baseUrl}/responses     (OpenAI Responses API)
//       Newer, supports `reasoning.effort`. The original harness was built on
//       this. Body uses `input` + `max_output_tokens`.
//
//   • "chat"       → POST {baseUrl}/chat/completions  (Chat Completions)
//       The lingua franca. MOST "OpenAI-compatible" providers (Together,
//       Groq, OpenRouter, local servers, …) implement THIS and not Responses.
//       If "bring any provider" is going to be true, the harness has to speak
//       it. Body uses `messages` + `max_tokens`.
//
// Pick with LLM_API_FORMAT. Same callLlm() signature either way.
//
//   callLlm(apiKey, roleConfig, prompt, options?) -> Promise<string | object | null>
//
//   roleConfig  — a role block from config.json (e.g. config.llm.summarize):
//                 { maxTokens, reasoningEffort }. This is where the
//                 token-economy decisions live: `summarize` runs every
//                 compaction so it's cheap; `recall` runs rarely so it can
//                 afford more. The MODEL is the same; the BUDGET is the lever.
//   options.format — "text" (default) returns the raw string; "json" extracts
//                    and parses the first {...} block (models love to wrap JSON
//                    in prose).
//   options.timeoutMs — default 60000.
//
// Returns null on any failure — no key, network error, HTTP error, empty
// output, or unparseable JSON. Callers fail silent: a missing summary is never
// worth crashing a hook over.

import { getLlmEnv } from "./api-key.mjs";

export async function callLlm(apiKey, roleConfig, prompt, options = {}) {
  if (!apiKey) return null;

  const { baseUrl, model, apiFormat, reasoning } = getLlmEnv();
  const maxTokens = roleConfig?.maxTokens ?? 8000;
  const reasoningEffort = roleConfig?.reasoningEffort ?? "low";
  const format = options.format || "text";
  const timeoutMs = options.timeoutMs ?? 60000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const { url, body } = buildRequest({ apiFormat, baseUrl, model, maxTokens, reasoningEffort, reasoning, prompt });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) return null;
    const data = await res.json();

    const text = apiFormat === "chat" ? extractChatText(data) : extractResponsesText(data);
    if (!text) return null; // empty output (e.g. ran out of tokens) is not an error — just nothing to use

    return format === "json" ? extractJson(text) : text;
  } catch {
    return null; // network failure, abort/timeout, bad JSON — all non-fatal
  } finally {
    clearTimeout(timer);
  }
}

// Build the URL + body for the chosen wire format. The ONLY place the two
// dialects diverge; keeping the fork here means the rest of the file is shared.
function buildRequest({ apiFormat, baseUrl, model, maxTokens, reasoningEffort, reasoning, prompt }) {
  if (apiFormat === "chat") {
    return {
      url: `${baseUrl}/chat/completions`,
      body: {
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        // Chat Completions has no portable `reasoning.effort`; budget is the
        // only knob that travels across providers, so we lean on max_tokens.
      },
    };
  }
  // default: Responses API
  const body = {
    model,
    input: prompt,
    max_output_tokens: maxTokens,
  };
  // `reasoning.effort` is OPT-IN (LLM_REASONING) because it's only valid on
  // reasoning models; sending it to the gpt-4o-mini default would 400. When it's
  // enabled, the per-role effort (summarize=low, recall=medium) becomes the
  // *secondary* cost lever — max_output_tokens above is the primary one.
  const effort = resolveEffort(reasoning, reasoningEffort);
  if (effort) body.reasoning = { effort };
  return { url: `${baseUrl}/responses`, body };
}

// Map LLM_REASONING → an effort string, or null to omit the field entirely.
//   "" / "0" / "false" / "off" / "no"  → null (default; safe on any model)
//   "1" / "true" / "on" / "yes"        → the role's configured effort
//   "low" / "medium" / "high"          → force that effort for every role
function resolveEffort(reasoning, roleEffort) {
  const v = String(reasoning || "").trim().toLowerCase();
  if (!v || v === "0" || v === "false" || v === "off" || v === "no") return null;
  if (v === "1" || v === "true" || v === "on" || v === "yes") return roleEffort || "low";
  if (v === "low" || v === "medium" || v === "high") return v;
  return null;
}

// Responses API: prefer the convenience `output_text`; otherwise walk
// output[].content[] for the first text part.
export function extractResponsesText(data) {
  if (!data) return null;
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }
  const output = Array.isArray(data.output) ? data.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if ((part?.type === "output_text" || part?.type === "text") && typeof part.text === "string") {
        return part.text;
      }
    }
  }
  return null;
}

// Chat Completions: choices[0].message.content.
export function extractChatText(data) {
  const choice = Array.isArray(data?.choices) ? data.choices[0] : null;
  const content = choice?.message?.content;
  return typeof content === "string" && content.trim() ? content : null;
}

// Models often wrap JSON in prose or fences. Grab the first balanced-looking
// {...} span and parse it; null if that fails.
function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}
