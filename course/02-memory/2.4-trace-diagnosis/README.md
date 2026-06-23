# 2.4 — Trace diagnosis + edit-history read-back

The last piece of Part 2 squeezes more value out of moments you've already built. The `PreCompact` event that writes memory can _also_ extract a lesson from the session — one transcript parse, two outputs. And the `UserPromptSubmit` event that re-injects memory can _also_ surface a file's recent edits when you mention that file. Same events, more signal, no extra cost.

## Objectives

By the end, you will be able to:

- **Extract** a session lesson on `PreCompact` and append it to `lessons.jsonl`.
- **Surface** a named file's recent edits on `UserPromptSubmit` when your prompt mentions it.

Each objective maps to the Checkpoint below.

## Time

15–20 minutes.

## Before you start

> 🧠 **No peeking (recall from 2.3b):** A teammate hardcodes a model id into the summarizer and every compaction's summary call silently 404s. Why didn't anything crash, and what's the one-word reason the memory just quietly went stale?
>
> <details><summary>Answer</summary>Because the harness is **fail-silent**: `callLlm()` returns `null` on an HTTP error instead of throwing, so a 404 is a no-op, not a crash. The memory simply stopped updating with no alarm. The fix is to never hardcode the id — read it from `LLM_MODEL` and document which ids actually work.</details>

Confirm 2.2/2.3 still work (you can write and read a memory note). Then copy this lesson's `start/` (it ships the fixtures you'll need):

```bash
cp -r start my-diagnosis && cd my-diagnosis && cp -r ../fixtures .
```

## The lesson

### Principle: one parse, two outputs

You already pay to read and parse the transcript on `PreCompact` to build memory. That parse is the expensive part. So extract _two_ things from it, not one: the narrative **memory** (2.3b) and an efficiency **lesson**. The reference does exactly this — a single `PreCompact` LLM call returns both a `memory` object and a `diagnosis` object, dispatched to two different files. It's the [token economy](../../../docs/where-to-spend-tokens.md) applied to work you've already done: don't parse twice, don't pay twice.

In this lesson the lesson-extraction is kept **deterministic** — it counts cheap signals from the transcript (tool calls, errors) rather than calling a model. That's the free floor the reference's LLM diagnosis builds on, and it keeps your checkpoint repeatable with no key. The lessons accumulate in `lessons.jsonl` with the **same append-only discipline** you learned in 2.1 — and later (Part 5) the `/evolve` and `/retrospective` commands mine that file.

### Principle: the read side can surface more than memory

`UserPromptSubmit` already re-injects memory. It can also read the **edit database** (`logs/file-edits.json`, which the rolling log maintains) and, when your prompt _names a file_, inject that file's recent change history. The point: when you're about to touch a file for the fourth time, the model should know it's already been churned three times — repeated edits to one file are a signal that something deeper might be off.

### How the reference does it

The reference splits these across two modules: [`modules/precompact-llm.mjs`](../../../reference/hooks/unified/modules/precompact-llm.mjs)'s `writeLesson` appends the diagnosis, and [`modules/edit-history.mjs`](../../../reference/hooks/unified/modules/edit-history.mjs)'s `checkEditHistory` does the file read-back (with extra high-churn-across-sessions detection we skip here). Your lesson file keeps both in one place and uses a simple `editCount >= 2` threshold.

### Build

Open `start/trace-diagnosis.mjs`. Fill **two blanks marked `// TODO`**:

1. **Write side:** append the lesson entry to `lessons.jsonl` (append-only, exactly like 2.1).
2. **Read side:** build the `FILE HISTORY:` warning line for a mentioned file.

`solution/` has the finished file. The `fixtures/` folder gives you a sample transcript (with a tool error) and a `logs/file-edits.json` so both sides have data to work against.

## Checkpoint

Make sure the fixtures are in place (`cp -r ../fixtures .` if you haven't), then:

**Write side — a lesson entry is written:**

```bash
echo '{"session_id":"demo-24","transcript_path":"./fixtures/sample-transcript.jsonl"}' | node trace-diagnosis.mjs precompact
cat context-layer/lessons.jsonl
```

✅ One JSON line appended, with `"type":"trace-diagnosis"`, a `lessons` array, and `stats` showing `totalToolCalls: 2` and `toolErrors: 1` (the sample transcript has two tool calls and one failed step).

**Read side — mentioning a file surfaces its edits:**

```bash
# Point the hook at the fixture edit database:
mkdir -p logs && cp fixtures/logs/file-edits.json logs/
echo '{"prompt":"can you clean up `src/app.js`?"}' | node trace-diagnosis.mjs prompt
```

✅ You see a `FILE HISTORY:` block reporting `src/app.js` was edited 3x, listing its recent changes:

```
FILE HISTORY: `src/app.js` has been edited 3x
Recent changes:
  1. Added the request handler
  2. Fixed the off-by-one in pagination
  3. Raised the test timeout
```

And a prompt that names a file with **no** history prints nothing:

```bash
echo '{"prompt":"open notes.txt"}' | node trace-diagnosis.mjs prompt   # (no output — correct)
```

## Recap + next

You finished Part 2. The same two events that carry memory now also carry a lesson out (`PreCompact` → `lessons.jsonl`) and a file's history back in (`UserPromptSubmit` → `FILE HISTORY`). One parse, two outputs; one read, two surfaces.

→ Back to the **[Part 2 overview](../README.md)** for the self-assessment, or on to **[Part 3 — Workflow layer](../../03-workflow/)**, where you build the things you trigger by hand: slash commands, skills, and sub-agents.
