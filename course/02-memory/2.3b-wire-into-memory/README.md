# 2.3b — Wire it into memory (integration + cost)

You have the loop (2.2) and the plumbing (2.3a). Now connect them: replace 2.2's hardcoded note with a **real** model-written summary of the session. The loop doesn't change — only the source of the note does. And the moment you put a model on a job that runs automatically, a new question appears: _how much does this cost, and how often does it run?_ That's the real subject of this lesson.

📖 **Read alongside:** [Where to spend tokens](../../../docs/where-to-spend-tokens.md).

## Objectives

By the end, you will be able to:

- **Replace** the hardcoded note with a `summarize`-role LLM call over the session [transcript](../../../docs/glossary.md#transcript).
- **Justify** the cost tier: a small budget, low effort, because this call runs on every [compaction](../../../docs/glossary.md#compaction-context-compaction).
- **Parameterize** the model id through the environment (never hardcode it) — and explain why.

Each objective maps to the Checkpoint below.

## Time

20–30 minutes.

## Before you start

> 🧠 **No peeking (recall from 2.3a):** Your summary comes back empty but there's no error in the logs. What's the most likely cause, and what's the first fix to try?
>
> <details><summary>Answer</summary>The token budget was too small — on the [Responses API](../../../docs/glossary.md#openai-responses-api-vs-chat-completions-api), `max_output_tokens` covers the model's reasoning too, so a tiny budget can leave no text. The first fix is to **raise `maxTokens`**, not to hunt for a network bug. Empty output is not an error.</details>

Confirm 2.3a works (you got a summary to print) and 2.2 works (you saw a `<session-memory>` block). Then copy this lesson's `start/` — it already contains the complete `api-key.mjs` and `llm-call.mjs` from 2.3a:

```bash
cp -r start my-real-memory && cd my-real-memory
```

## The lesson

### Principle: spend a little, often — or a lot, seldom; never a lot, often

This is the [token economy](../../../docs/glossary.md#token-economy) as a concrete decision. The summary call you're adding runs on **every single compaction** — that's a high-frequency job. High-frequency jobs must be cheap, or the cost compounds. So it uses the **`summarize` role**: a small token budget (the reference uses `maxTokens: 8000`) and low effort.

Contrast that with the `recall` role you'll meet later (`/evolve`, `/retrospective`): those run **rarely** and matter more, so they can afford a bigger budget. Same model, different budget. The frequency of the job decides the spend — read the [cost ladder](../../../docs/where-to-spend-tokens.md) for the full table and a cents-per-day mental model.

### Why the budget is the lever, not the model

A subtle point worth internalizing: you do **not** make the per-compaction call cheaper by reaching for a weaker model and the deep-analysis call richer by reaching for a stronger one. You use the **same** model and turn the **budget** knob. That keeps the system simple (one model to configure) and keeps the cost decision in one obvious place — the role's `maxTokens`. The budget travels across every provider; fancier levers like reasoning effort don't.

### Why the model id lives in the environment, not the code

The model id comes from `LLM_MODEL` in the environment. It is **never** hardcoded in a hook. The following cautionary tale shows why that rule matters:

> A real harness config once pinned a specific model id — call it `gpt-5.4-mini` — directly into the summarizer. That id was never a public model. Every compaction's summary call quietly **404'd**. Because the harness fails silent (a missing summary never crashes a turn — exactly as designed), nothing broke loudly. The memory just silently stopped updating, and it took a while to notice that the notes had gone stale. A hardcoded, non-public model id had turned the whole memory system into a no-op.

Two lessons fall out of that:

1. **Parameterize the model id** (read it from `LLM_MODEL`), so swapping to a working model is an `export`, never a code edit.
2. **Document which ids actually work** for your providers — a model id that looks plausible can still 404. "Plausible" is not "public."

Fail-silent is the right design — but it means a misconfiguration hides. The defense is to never bake a fragile, undocumented id into the code in the first place.

### How the reference does it

The reference's [`modules/precompact-llm.mjs`](../../../reference/hooks/unified/modules/precompact-llm.mjs) does exactly this `summarize`-role call on `PreCompact`, reading the transcript Claude Code points it at — then does _more_ (a second diagnosis output, poison detection, a tool-count gate). Your version keeps just the memory half and the cost decision. The diagnosis half is lesson 2.4.

### Build

Open `start/session-memory.mjs`. The read side and the prompt builder are done. Fill **two blanks marked `// TODO`**:

1. **The role budget** — set `SUMMARIZE_ROLE`'s `maxTokens` to a small number. This is the cost lever; the comment explains why small.
2. **The call** — invoke `callLlm(apiKey, SUMMARIZE_ROLE, prompt, { format: "json" })` and assign it to `summary`.

`solution/` has the finished file.

## Checkpoint

**Part A — verify the wiring without a key** (proves the fallback and the read side still work):

```bash
echo '{"session_id":"demo-3b","transcript_path":"./fixtures/sample-transcript.jsonl"}' | node session-memory.mjs precompact
echo '{"session_id":"demo-3b"}' | node session-memory.mjs prompt
# With no LLM_API_KEY, the note falls back to "(no summary — set LLM_API_KEY)" but
# the loop still round-trips — proof your blanks didn't break anything.
```

(Copy the [fixture](../../../docs/glossary.md#fixture) in first if you're working from your own folder: `cp -r ../fixtures .`)

**Part B — the real thing, with a key:**

```bash
export LLM_API_KEY=sk-...your-key...
export LLM_MODEL=gpt-4o-mini        # a REAL, public small model id
echo '{"session_id":"real-3b","transcript_path":"./fixtures/sample-transcript.jsonl"}' | node session-memory.mjs precompact
cat memories/real-3b.json
echo '{"session_id":"real-3b"}' | node session-memory.mjs prompt
```

✅ **You got it when:** the note's `projectContext` in `memories/real-3b.json` is no longer the literal placeholder you carried from 2.2 — **before**, the hardcoded string was `"Learning the Memento pattern in Part 2 of the harness course"`; **after**, it's a model-written line describing the sample transcript (the rolling-log work — something like `"A rolling-log harness module in the Part 2 course"`). `overallDirection` and `milestones` likewise describe that real transcript, and the `<session-memory>` block on read reflects the new summary.

### Part B without a key — stub the LLM (no token spent)

No paid key? You can still verify the exact same objective — that a model summary flows into the note — by **stubbing** the LLM with a canned reply. The summary path runs only when `callLlm` is handed a truthy key, so you pass a fake one and replace the network call with a stub. Drop this `stub-precompact.mjs` next to `session-memory.mjs`:

```js
// stub-precompact.mjs — verify the wiring with NO API key; no tokens spent.
import { writeMemory } from "./session-memory.mjs";

// Replace the one network call with a canned Responses-API reply.
globalThis.fetch = async () => ({
  ok: true,
  json: async () => ({
    output_text: JSON.stringify({
      projectContext: "A rolling-log harness module in the Part 2 course",
      overallDirection: "Wiring a model-written summary into the memory note.",
      newMilestones: ["Stubbed the LLM call to verify the integration offline"],
    }),
  }),
});

await writeMemory(
  {
    session_id: "stub-3b",
    transcript_path: "./fixtures/sample-transcript.jsonl",
  },
  "sk-stub-not-a-real-key", // truthy key → the summary path runs; fetch is stubbed
);
console.log("wrote memories/stub-3b.json");
```

```bash
node stub-precompact.mjs
cat memories/stub-3b.json
echo '{"session_id":"stub-3b"}' | node session-memory.mjs prompt
```

✅ **Same pass marker, offline:** `memories/stub-3b.json`'s `projectContext` is the stubbed line (`"A rolling-log harness module in the Part 2 course"`), **not** the placeholder — proof the model's fields land in the note. The `<session-memory>` block on read renders them. (This is exactly what the Part-2 CI check does: feed `callLlm` a canned JSON reply and assert the summary fields land in the note.)

**If the note shows `(no summary — set LLM_API_KEY)` even with a key set:** your key isn't exported in this shell, your `LLM_MODEL` 404'd (remember the cautionary tale — try a known-public id like `gpt-4o-mini`), or your `maxTokens` is still `0` — see troubleshooting below.

### Troubleshooting an empty/placeholder note

- **`maxTokens` left at `0`** (blank 1 unfilled): the budget is zero, so the model returns no text, `callLlm` returns `null`, and the note keeps the `(no summary …)` placeholder. Set `SUMMARIZE_ROLE.maxTokens` to a small number (the reference uses `8000`).
- **No `LLM_API_KEY` in this shell:** the summary path is skipped entirely; use the stub above, or `export` a real key.
- **`LLM_MODEL` 404'd:** a plausible-looking id can still be non-public — try `gpt-4o-mini`.

## Recap + next

The memory note is now a real, model-written summary — and you made the call that defines the harness's whole cost posture: cheap model-budget, runs often, model id from the environment. You also know the failure mode that hides behind fail-silent: a hardcoded, non-public model id turns memory into a silent no-op.

One last piece completes Part 2: **[2.4 — trace diagnosis + edit-history read-back](../2.4-trace-diagnosis/)**. The same `PreCompact` moment that writes memory can _also_ extract a lesson from the session — one parse, two outputs — and the read side can surface a file's recent edits when you mention it.
