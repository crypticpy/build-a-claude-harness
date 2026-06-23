# The Memento Pattern

> The single most useful thing a harness does: make a forgetful model behave as if it remembers. This is [Principle 1: stateless model, disk-backed memory](principles.md#1-stateless-model-disk-backed-memory).

## The problem: the model forgets, twice over

The raw model is [**stateless**](glossary.md#stateless-model) — on its own it remembers nothing between sessions. It also loses detail _mid-session_: when the [context window](glossary.md#context-window-or-context) fills up, Claude Code [compacts](glossary.md#compaction-context-compaction) the conversation — summarizing older turns and dropping their **verbatim** detail to make room. The gist survives in the summary, but the specifics of what you were just doing are gone.

So persistence isn't a feature you bolt on. It's a simple pair of moves:

> **Write what matters to disk before the model forgets. Read it back at the start of the next turn.**

That read/write pair _is_ the memory system. Everything else is plumbing.

> **Claude Code ships a version of this now.** Its built-in _auto memory_ writes notes to disk and reloads them each session — the same write-then-reload move. Building it yourself (this chapter) is how you learn the pattern and take control of exactly _what_ gets remembered and _how_ it's distilled: a structured per-session summary you shape, not just freeform notes.

## Why "Memento"?

In the film _Memento_, the protagonist can't form new memories, so he tattoos notes to himself and reads them each morning to reconstruct where he is. The harness does exactly that for the model: just before it forgets, it writes a distilled note to disk; at the start of the next prompt, it reads the note back in. The model is just as forgetful as before — but it _looks_ like it remembers, because the harness keeps re-handing it the tattoo.

The two halves map cleanly onto two [lifecycle events](the-event-model.md):

| Half      | Event              | Reference file                                                                        |
| --------- | ------------------ | ------------------------------------------------------------------------------------- |
| **Write** | `PreCompact`       | [`modules/precompact-llm.mjs`](../reference/hooks/unified/modules/precompact-llm.mjs) |
| **Read**  | `UserPromptSubmit` | [`modules/session-memory.mjs`](../reference/hooks/unified/modules/session-memory.mjs) |

## The write side: `PreCompact`

Right before Claude Code throws away the running transcript, the `precompact` branch runs **one** LLM call that distills the just-completed window into a small JSON memory file (`memories/<session>.json`). It captures the high-level shape, not the keystrokes:

- `projectContext` — one line: what codebase is this.
- `overallDirection` — the current goal, in a sentence or two.
- `milestones` — an **append-only punch list** of major events (decisions, things reached). New ones are added; old ones are kept, oldest dropping off past a cap.
- `longTermNarrative` — a 2–3 sentence story of the session so far.

The key design choice is **distill, don't dump.** A summary is worth far more context than the raw transcript ([Principle 5](principles.md#5-distilled-intelligence-over-raw-bytes)) — and because this call runs on _every_ compaction, it deliberately uses the cheap [`summarize` role](where-to-spend-tokens.md), not the expensive one ([Principle 4](principles.md#4-token-economy)).

Two guard rails keep the memory trustworthy:

- **Too-short sessions are skipped.** Fewer than five tool calls? Nothing worth learning — no LLM call at all.
- **Poison detection.** A failed or empty LLM call would otherwise overwrite good memory with an empty stub. The write side detects that "poisoned" shape and instead **carries the prior memory forward verbatim**, just bumping the compaction count. A bad write never clobbers a good memory.

> The same `PreCompact` call also writes an _efficiency diagnosis_ to a separate sink (`lessons.jsonl`) — one transcript parse, one LLM call, two outputs. That second output feeds [self-improvement](principles.md#7-human-in-the-loop-self-improvement); see [`/evolve`](commands-skills-agents.md). Here we care only about the memory output.

## The read side: `UserPromptSubmit`

On your very next prompt after a compaction, the `prompt` branch reads `memories/<session>.json` back and renders it as a `<session-memory>` block printed to stdout — which Claude Code feeds to the model as context. It looks roughly like:

```text
<session-memory>
Compaction #3 | Session: 2h 14m

Project: build-a-claude-harness — a teaching repo for Claude Code harnesses
Direction: Authoring the five concept docs under docs/

Narrative: Built the reference harness, then began the course + docs…

Progression (punch list of major events):
  • [#1] Scaffolded the repo and locked the curriculum
  • [#2] Finished the reference hooks and MCP server
  • [#3] Started the docs concept pages
</session-memory>
```

The post-compaction window has lost the transcript, but it still sees _the project, the direction, and the punch list of what happened._ It keeps its bearings. The read side is strictly read-only — it never writes — and it shares the same `isPoisonedMemory` guard, so a bad memory is never shown even if one slipped through.

## The whole loop

```text
…work…  →  context fills  →  PreCompact: distill → memories/<id>.json
                                                          │
   transcript discarded  ←──────────────────────────────┘
                                                          │
   you submit next prompt  →  UserPromptSubmit: read ─────┘ → <session-memory> to the model
```

One write before forgetting, one read after. That loop is the difference between a post-compaction window that has lost the thread and one that still carries your project's direction and history across hours and sessions.

## Where this shows up

- **Course [Part 2: Memory](../course/02-memory/)** — you build this loop in stages: rolling log → session memory → LLM summaries → diagnosis. This is the lesson the Memento pattern _is_.
- **Reference:** [`modules/precompact-llm.mjs`](../reference/hooks/unified/modules/precompact-llm.mjs) (write) and [`modules/session-memory.mjs`](../reference/hooks/unified/modules/session-memory.mjs) (read).
- **Cost side of the same coin:** why the write call is cheap and runs constantly — [Where to spend tokens](where-to-spend-tokens.md).
- **The events it rides on:** [the event model](the-event-model.md).

---

_[docs index](README.md) · [glossary](glossary.md) · [principles](principles.md)_
