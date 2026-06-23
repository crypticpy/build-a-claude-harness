// stub-fetch.test.mjs — verify llm-call.mjs parses a Responses-shaped reply
// WITHOUT touching the network. Run from this lesson's solution/ (or copy the
// three solution files next to this test):
//
//   node ../fixtures/stub-fetch.test.mjs        # from solution/
//
// Exits 0 on success, 1 on any failed assertion. This is what CI runs so the
// answer key stays known-good without ever making a real API call.

import { callLlm, extractResponsesText, extractChatText } from "../solution/llm-call.mjs";

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
}

// 1. A Responses-shaped reply parses to its text part.
globalThis.fetch = async (url, opts) => {
  const body = JSON.parse(opts.body);
  assert(url.endsWith("/responses"), "expected /responses default, got " + url);
  assert(typeof body.input === "string", "Responses body needs string `input`");
  assert(typeof body.max_output_tokens === "number", "Responses body needs `max_output_tokens`");
  return {
    ok: true,
    json: async () => ({
      output: [{ content: [{ type: "output_text", text: "A stubbed summary." }] }],
    }),
  };
};
const out = await callLlm("fake-key", { maxTokens: 8000 }, "Summarize: hello world");
assert(out === "A stubbed summary.", "expected parsed text, got " + JSON.stringify(out));

// 2. The convenience `output_text` field and the chat extractor both work.
assert(extractResponsesText({ output_text: "quick" }) === "quick", "output_text convenience field");
assert(
  extractChatText({ choices: [{ message: { content: "chat reply" } }] }) === "chat reply",
  "chat extractor",
);

// 3. No key → null, no call.
assert((await callLlm(null, { maxTokens: 100 }, "x")) === null, "null key should return null");

// 4. Empty output (reasoning ate the budget) → null, not a crash. THE GOTCHA.
globalThis.fetch = async () => ({ ok: true, json: async () => ({ output: [] }) });
assert((await callLlm("fake-key", { maxTokens: 1 }, "x")) === null, "empty output should be null");

console.log("✓ all llm-call stub-fetch assertions passed");
