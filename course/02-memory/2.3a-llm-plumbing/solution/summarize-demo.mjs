// summarize-demo.mjs — your first real LLM call. Summarize three lines of text.
//
// This is the plumbing test: prove callLlm() can reach a model and return text,
// on a tiny input, before you wire it into anything. Run it like:
//
//   export LLM_API_KEY=sk-...your-key...      # never put the key in a file
//   export LLM_MODEL=gpt-4o-mini              # or your provider's small model
//   node summarize-demo.mjs
//
// If LLM_API_KEY isn't set, callLlm returns null and we say so — no crash.

import { getApiKey } from "./api-key.mjs";
import { callLlm } from "./llm-call.mjs";

// Three lines of text to summarize — the whole input for this first call.
const TEXT = `The harness writes a memory note before the model forgets.
It reads that note back on the next prompt.
This is the Memento pattern.`;

// The `summarize` role: cheap, small budget. Same shape as config.json's role
// block. maxTokens is the cost lever; keep it modest for a tiny input.
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
