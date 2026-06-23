# 2.2 — The write/read pair (Memento)

This is the lesson Part 2 is named for. You'll make a forgetful model behave as if it remembers — by writing a note to disk right before it forgets, and reading that note back on your next prompt. The whole memory system is this one loop.

📖 **Read alongside:** [The Memento pattern](../../../docs/the-memento-pattern.md).

## Objectives

By the end, you will be able to:

- **Write** a session-memory note to `memories/<session>.json` on the `PreCompact` event.
- **Re-inject** that note as a `<session-memory>` block on the `UserPromptSubmit` event.
- **Prove** the loop with a real `/compact` — no LLM involved yet.

Each objective maps to the Checkpoint below.

## Time

15–20 minutes.

## Before you start

> 🧠 **No peeking (recall from 2.1):** Why is the rolling log **append-only** instead of read-modify-write? What concretely goes wrong if two tool operations write at the same time?
>
> <details><summary>Answer</summary>Each tool op fires the hook as its own process. With read-modify-write, two processes can both read the same starting file, then both write back — and the second write overwrites the first one's new line, silently losing data. Appending one line per process can't conflict, because no process ever holds the whole file.</details>

Confirm 2.1 still works (you can append a line to a JSONL log). Then copy this lesson's `start/`:

```bash
cp -r start my-memory && cd my-memory
```

## The lesson

### Principle: the model is stateless — memory is the harness's job

On its own, the model remembers nothing. Every time the [context window](../../../docs/glossary.md#context-window-or-context) fills, Claude Code [compacts](../../../docs/glossary.md#compaction-context-compaction) the conversation — it throws away older turns to make room, and the detail of what you were just doing goes with them. The model isn't going to fix this for you. **Persistence is something you build around it.**

The [Memento pattern](../../../docs/glossary.md#memento-pattern) is the fix, and it's just two moves:

> **Write what matters to disk before the model forgets. Read it back at the start of the next turn.**

Named after the film whose hero tattoos notes to himself because he can't form new memories — the harness keeps re-handing the model its tattoo.

### Why two different events

The two halves ride on two different [lifecycle events](../../../docs/the-event-model.md), and keeping them straight is the whole skill:

| Half      | Event              | When it fires                                   | What you do      |
| --------- | ------------------ | ----------------------------------------------- | ---------------- |
| **Write** | `PreCompact`       | _Just before_ the transcript is discarded       | save the note    |
| **Read**  | `UserPromptSubmit` | _Before_ each of your prompts reaches the model | load + inject it |

They never run at the same instant; they hand a file between them like a relay baton. Notice the read side is the **same event** you used for "Hello, hook" in Part 1 — `UserPromptSubmit` is where a hook injects extra context for the model.

**Why `PreCompact` and not "after every message"?** Because rewriting the note on every turn would (a) cost you constantly once a real LLM is doing the writing, and (b) summarize barely-changed state over and over. `PreCompact` fires exactly when the window is about to be lost — the one moment a fresh note actually earns its keep.

### How the reference does it

The reference splits the two halves into two files: [`modules/precompact-llm.mjs`](../../../reference/hooks/unified/modules/precompact-llm.mjs) writes, [`modules/session-memory.mjs`](../../../reference/hooks/unified/modules/session-memory.mjs) reads and renders the `<session-memory>` block. Your lesson file keeps both halves together so you can see the loop at a glance, and it makes two deliberate simplifications:

- **The note is hardcoded** — a fixed string, no LLM. (Lesson 2.3b makes it real.)
- **There's no tool-count gate.** The reference skips short sessions (fewer than 5 tool calls); your version writes on _any_ compaction. That's what lets a single `/compact` produce a visible memory file right now.

We also skip the reference's **poison detection** (the guard that stops an empty note from overwriting a good one) — it's important production hardening, covered in the [Memento doc](../../../docs/the-memento-pattern.md), but it would clutter the core loop here.

### Build

Open `start/session-memory.mjs`. It's complete except for **two blanks marked `// TODO`** — one per side of the loop:

1. **Write side:** persist the `memory` object to `memoryPath` as JSON.
2. **Read side:** open the rendered note with the literal `<session-memory>` tag (the model uses that tag to recognize recovered memory).

Fill both. `solution/` has the finished file if you get stuck.

## Checkpoint

This checkpoint is **real**, not simulated — you'll fire `PreCompact` the way Claude Code does, with the `/compact` command.

**Part A — round-trip it by hand first** (proves your two blanks are right, no Claude Code needed):

```bash
# WRITE: simulate the precompact event
echo '{"session_id":"demo-002"}' | node session-memory.mjs precompact
cat memories/demo-002.json          # a JSON note exists, compactionCount: 1

# READ: simulate the next prompt
echo '{"session_id":"demo-002"}' | node session-memory.mjs prompt
```

The read should print a `<session-memory>` block. Compare it against [`fixtures/expected-session-memory.txt`](fixtures/expected-session-memory.txt) — that fixture was rendered from the hand-made memory file in [`fixtures/memories/sample-session.json`](fixtures/memories/sample-session.json), so you can also point your read side at the fixture to confirm the renderer:

```bash
mkdir -p memories && cp fixtures/memories/sample-session.json memories/
echo '{"session_id":"sample-session"}' | node session-memory.mjs prompt
# should match fixtures/expected-session-memory.txt exactly
```

**Part B — fire `PreCompact` for real.** Wire this file into your harness (the `precompact` and `prompt` branches of your router), start a Claude Code session, do a little work, then run:

```
/compact
```

That triggers a **real** `PreCompact`. Then submit your next prompt.

✅ **You got it when:**

1. After `/compact`, a `memories/<session>.json` file exists (your real session id, `compactionCount: 1`).
2. On your next prompt, the `<session-memory>` block is injected — the model can now see "Project / Direction / Progression" even though the transcript was just compacted.

> Because your skeleton has **no tool-count gate**, a single `/compact` is enough — you don't need to do a lot of work first. (The reference's gate would silently skip a tiny session; yours won't.)

## Recap + next

You built the Memento loop: a note written on `PreCompact`, read back on `UserPromptSubmit`, with zero AI cost. A forgetful model now keeps its bearings across a compaction.

But the note is a fixed string — it says the same thing no matter what actually happened. To make it a _real_ summary of the session, you need to call a model. First the plumbing: **[2.3a — your first LLM call](../2.3a-llm-plumbing/)** stands up a provider-neutral LLM client you'll run on three lines of text. Then [2.3b](../2.3b-wire-into-memory/) wires it into this exact loop.
