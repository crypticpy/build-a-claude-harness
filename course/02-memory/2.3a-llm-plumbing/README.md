# 2.3a — Your first LLM call (plumbing)

Until now, every lesson cost nothing. This one introduces the model. It's the first real climb in Part 2 — so we split it in two. **2.3a (this lesson) is pure plumbing:** stand up a provider-neutral LLM client and make it summarize three lines of text. No memory wiring yet. **2.3b** wires it into the memory loop you built in 2.2.

The whole point of splitting it: get a response printing on a tiny input _first_, so that when something goes wrong later, you already know the plumbing is sound.

## Objectives

By the end, you will be able to:

- **Configure** an LLM client from environment variables (`LLM_API_KEY`, `LLM_MODEL`).
- **Run** a real `callLlm()` summarization on three lines of text and see a response print.
- **Diagnose** the empty-output gotcha (under-budgeted tokens) without mistaking it for an error.

Each objective maps to the Checkpoint below.

## Time

20–30 minutes (most of it is getting an API key the first time).

## Before you start

> 🧠 **No peeking (recall from Part 1):** A hook throws halfway through. What keeps the user's session alive, and what are the three habits that guarantee it?
>
> <details><summary>Answer</summary>Fail-silent design keeps the session alive. The three habits: **exit 0** no matter what, wrap work in **try/catch**, and **guard optional dependencies** so a missing one is a no-op. `callLlm()` lives by this — it returns `null` on every failure (no key, network error, empty output) instead of throwing.</details>

You need an **API key** for a small, cheap model. If you don't have one, follow the 5-minute walkthrough in [what-is-a-harness.md → "What is an API key?"](../../../docs/what-is-a-harness.md#what-is-an-api-key). Then copy this lesson's `start/`:

```bash
cp -r start my-llm && cd my-llm
```

## The lesson

### Principle: one choke point for every model call

Everything the harness ever sends to a model goes through **one function**, `callLlm()`, in one file, `llm-call.mjs`. That single choke point is what makes the harness [provider-neutral](../../../docs/glossary.md#endpoint): the model, endpoint, and wire format all come from environment variables, so swapping providers is an `export`, not a code change. Every later hook that summarizes or diagnoses just calls `callLlm()` and inherits that portability for free.

The companion file `api-key.mjs` answers exactly one question — "where does the key and config come from?" — and the answer is always **the environment, never a file.** A key never lives in this repo. That's not a style choice; it's the thing that stops you from committing a secret.

### Why the key only ever comes from the environment

A secret in a file is a secret one `git push` away from being public. So `getApiKey()` reads `LLM_API_KEY` (or `OPENAI_API_KEY` as a fallback) from the environment and nothing else. If it's unset, it returns `null`, and `callLlm()` treats `null` as "skip the LLM and carry on" — which is why a fresh clone or CI with no key still runs without crashing.

### How the reference does it

These two files are lifted almost verbatim from the reference's [`modules/api-key.mjs`](../../../reference/hooks/unified/modules/api-key.mjs) and [`modules/llm-call.mjs`](../../../reference/hooks/unified/modules/llm-call.mjs) — same env var names, same `callLlm(apiKey, roleConfig, prompt, options)` signature, same Responses-API default. The one thing we simplified out is the reference's `LLM_REASONING` lever (the opt-in `reasoning.effort` field), because it's only valid on reasoning models and would error against the cheap default — we omit it here to keep the first call bulletproof.

That's why `start/` ships `api-key.mjs` and `llm-call.mjs` **complete**. You don't write them — you read them, paste your key into the environment, and run.

### ⚠️ The gotcha: empty output is not an error

This one trips everyone, so internalize it now. On the Responses API, `max_output_tokens` budgets _everything the model produces_ — including its internal reasoning on reasoning-capable models. If that budget is too small, **the reasoning eats it all and there's no text left.** You don't get an error. You get an empty response and `callLlm()` returns `null`.

So the rule: **if your summary comes back empty, the first thing to try is RAISE the token budget** (`maxTokens` in the role config). Don't go hunting for a network bug — you probably just under-budgeted.

### Build

There's nothing to write in the two shipped files. Your one edit is in `start/summarize-demo.mjs`: fill the single `// TODO` blank with your model id (or set `LLM_MODEL` in the environment). Then set your key in the environment.

## Checkpoint

```bash
export LLM_API_KEY=sk-...your-key...     # never put the key in a file
export LLM_MODEL=gpt-4o-mini             # or your provider's small model id
node summarize-demo.mjs
```

✅ **You got it when:** a one-sentence summary of the three input lines **prints**, like:

```
SUMMARY: The harness saves a note before the model forgets and reads it back next prompt — the Memento pattern.
```

**If it prints `No LLM_API_KEY set`** — your key isn't exported in this shell. Re-run the `export`.

**If it prints `Call returned no text`** — that's the gotcha. Raise `maxTokens` in `summarize-demo.mjs` (try a bigger number) and re-run. Empty output means the budget was too small, _not_ that something broke.

> 🔬 **Want to verify the parser without spending a token?** The committed test [`fixtures/stub-fetch.test.mjs`](fixtures/stub-fetch.test.mjs) stubs `fetch` so no real call happens, and asserts that a Responses-shaped reply parses to text (and that the empty-output case returns `null`). Run it from `solution/`: `node ../fixtures/stub-fetch.test.mjs`. This is exactly what CI runs.

<details>
<summary>🧗 <b>Stretch: use an "OpenAI-compatible" provider (the chat adapter)</b></summary>

The default path speaks the OpenAI **Responses** API. Many cheaper providers (OpenRouter, Together, Groq, local servers) only speak the older **Chat Completions** format. `llm-call.mjs` already includes a `chat` branch for them — you opt in with one env var:

```bash
export LLM_API_FORMAT=chat
export LLM_BASE_URL=https://your-provider/v1   # their endpoint
export LLM_MODEL=their-small-model-id
```

Same `callLlm()` call, different wire format under the hood. You do **not** need this for the checkpoint — it's here for when you want to bring your own provider. If you're brand new, stay on the Responses default.

</details>

## Recap + next

You made the harness talk to a model through one provider-neutral choke point, ran it on a tiny input, and learned the empty-output gotcha. The plumbing is proven.

Now connect it: **[2.3b — wire it into memory](../2.3b-wire-into-memory/)** replaces 2.2's hardcoded note with a real `summarize` call, and confronts the question that single call raises — _how much should this cost, and how often does it run?_
