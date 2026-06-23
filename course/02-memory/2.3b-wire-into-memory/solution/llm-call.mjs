// llm-call.mjs — the one place the harness talks to an LLM.
//
// Everything model-facing routes through callLlm(). That single choke point is
// what makes the harness provider-neutral: swap the env vars and every hook that
// summarizes or diagnoses follows along — no other file changes.
//
//   callLlm(apiKey, roleConfig, prompt, options?) -> Promise<string | object | null>
//
//   roleConfig    — { maxTokens, reasoningEffort }, a role block from config
//                   (e.g. the cheap `summarize` role). maxTokens is the cost
//                   lever: same model, smaller budget = cheaper call.
//   options.format — "text" (default) returns the raw string; "json" extracts
//                    and parses the first {...} block.
//   options.timeoutMs — default 60000.
//
// Returns null on ANY failure — no key, network error, HTTP error, EMPTY output,
// or unparseable JSON. Callers fail silent: a missing summary never crashes a hook.
//
// Anchored to reference/hooks/unified/modules/llm-call.mjs, simplified: the
// reference exposes an LLM_REASONING env lever; here reasoning.effort is omitted
// by default (it's only valid on reasoning models, and sending it to a plain
// gpt-4o-mini would 400). The two wire formats are kept — see below.

import { getLlmEnv } from "./api-key.mjs";

export async function callLlm(apiKey, roleConfig, prompt, options = {}) {
  if (!apiKey) return null; // no key configured → skip the LLM entirely

  const { baseUrl, model, apiFormat } = getLlmEnv();
  const maxTokens = roleConfig?.maxTokens ?? 8000;
  const format = options.format || "text";
  const timeoutMs = options.timeoutMs ?? 60000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const { url, body } = buildRequest({ apiFormat, baseUrl, model, maxTokens, prompt });

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
    // Empty output is NOT an error — e.g. a too-small max_output_tokens lets the
    // model's reasoning eat the whole budget, leaving no text. Just nothing to use.
    if (!text) return null;

    return format === "json" ? extractJson(text) : text;
  } catch {
    return null; // network failure, abort/timeout, bad JSON — all non-fatal
  } finally {
    clearTimeout(timer);
  }
}

// Build URL + body for the chosen wire format. The ONLY place the two dialects
// diverge; keeping the fork here means the rest of the file is shared.
function buildRequest({ apiFormat, baseUrl, model, maxTokens, prompt }) {
  // ── STRETCH PATH: Chat Completions ──────────────────────────────────────
  // Most "OpenAI-compatible" providers (OpenRouter, Together, Groq, local
  // servers…) speak THIS, not Responses. Opt in with LLM_API_FORMAT=chat.
  // You don't need it for the checkpoint — start with the default below.
  if (apiFormat === "chat") {
    return {
      url: `${baseUrl}/chat/completions`,
      body: {
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
      },
    };
  }

  // ── DEFAULT PATH: OpenAI Responses API ──────────────────────────────────
  return {
    url: `${baseUrl}/responses`,
    body: {
      model,
      input: prompt,
      max_output_tokens: maxTokens,
    },
  };
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

// Models often wrap JSON in prose or fences. Grab the first {...} span and parse.
function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}
