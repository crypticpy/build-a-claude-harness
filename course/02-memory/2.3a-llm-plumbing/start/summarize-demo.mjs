// summarize-demo.mjs — your first real LLM call. Summarize three lines of text.
//
// This is the plumbing test: prove callLlm() can reach a model and return text,
// on a tiny input, before you wire it into anything.
//
// ── YOUR JOB ──────────────────────────────────────────────────────────────
// `api-key.mjs` and `llm-call.mjs` ship COMPLETE — you don't edit them. You only:
//   1. Paste your KEY into the environment (never into a file):
//        export LLM_API_KEY=sk-...your-key...
//   2. Fill the ONE blank below with your provider's small model id, OR set it
//      in the environment with:  export LLM_MODEL=gpt-4o-mini
//   3. Run:  node summarize-demo.mjs

import { getApiKey } from "./api-key.mjs";
import { callLlm } from "./llm-call.mjs";

// TODO (blank): your provider's small/cheap model id. The harness reads LLM_MODEL
// from the environment; this just sets a default for the demo if you'd rather
// hardcode it here than export it. Replace the placeholder with e.g. "gpt-4o-mini".
const MODEL_HINT = "TODO-your-model-id"; // or: export LLM_MODEL=...
if (!process.env.LLM_MODEL && MODEL_HINT && !MODEL_HINT.startsWith("TODO")) {
  process.env.LLM_MODEL = MODEL_HINT;
}

// Three lines of text to summarize — the whole input for this first call.
const TEXT = `The harness writes a memory note before the model forgets.
It reads that note back on the next prompt.
This is the Memento pattern.`;

// The `summarize` role: cheap, small budget. maxTokens is the cost lever.
const roleConfig = { maxTokens: 8000 };

const apiKey = getApiKey();
const prompt = `Summarize the following in one sentence:\n\n${TEXT}`;

const summary = await callLlm(apiKey, roleConfig, prompt, { format: "text" });

if (summary === null) {
  if (!apiKey) {
    console.log("No LLM_API_KEY set — skipping the call. Set it and re-run to see a real summary.");
  } else {
    console.log("Call returned no text. If your summary is empty, RAISE maxTokens (see the README gotcha).");
  }
} else {
  console.log("SUMMARY:", summary.trim());
}
