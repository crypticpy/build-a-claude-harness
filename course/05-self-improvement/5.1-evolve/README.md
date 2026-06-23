# 5.1 — `/evolve`: the harness proposes its own improvements

Your harness has been quietly keeping a diary. Every compaction, the
trace-diagnosis hook from [2.4](../../02-memory/2.4-trace-diagnosis/) appended a
lesson to `lessons.jsonl` — "guessed the test runner again," "edited a shared
export without an impact check." That pile of lessons is data. `/evolve` reads
it back, finds the patterns that **repeat**, and asks an LLM to turn them into
concrete proposals: change this line in CLAUDE.md, add this config, write this
hook. Then it stops — and hands the proposals to **you**.

That final step is the core idea of this lesson. The harness can notice its own
recurring mistakes and draft fixes. It does **not** apply them. A human reads
the proposals and decides. This is the safety rail that makes a self-improving
system trustworthy.

📖 **Read alongside:** [Principles](../../../docs/principles.md).

## Objectives

By the end, you will be able to:

- **Aggregate** `lessons.jsonl` into a frequency view (which lessons repeat,
  across how many sessions).
- **Synthesize** that aggregate into proposals with the `recall` role — a
  pricier budget than the per-compaction summarizer, justified because it runs
  rarely.
- **Prove** the human-in-the-loop guarantee: proposals are written to a file
  and **nothing is auto-applied** to CLAUDE.md or config.

Each objective maps to the Checkpoint below.

## Time

20–30 minutes.

## Before you start

> 🧠 **No peeking (recall from Part 2's cost ladder):** The per-compaction
> summarizer and `/evolve` can use the **same model**. What is the one knob
> that makes the summarizer cheap and `/evolve` richer — and which job runs more
> often?
>
> <details><summary>Answer</summary>The knob is the **token budget** (`maxTokens`
> on the role), not the model. The summarizer runs on **every compaction**
> (high-frequency → small budget, the `summarize` role). `/evolve` runs
> **rarely** (low-frequency → big budget, the `recall` role). Frequency decides
> the spend.</details>

You need a `lessons.jsonl` with a few sessions in it. This lesson ships one in
`fixtures/`. Copy the `start/` folder and drop the fixture into place:

```bash
cp -r start my-evolve && cd my-evolve
mkdir -p context-layer && cp ../fixtures/lessons.jsonl context-layer/
```

## The lesson

### Principle: the model proposes, the human disposes

A harness that edits its own CLAUDE.md is a harness that can quietly drift away
from what you actually want — and you'd find out only when its behavior changed
under you. So `/evolve` draws a hard line. Its job ends at **writing a file**
(`evolution/proposals.md`), each proposal tagged `[ ] Pending review`. Applying
a proposal is a separate, human, deliberate act. The intelligence to spot the
pattern is automated; the authority to change the system is not.

This is [human-in-the-loop](../../../docs/principles.md) by construction. The
feedback loop is real — lessons in, proposals out — but the loop is **open** at
exactly one point: a person closes it.

### Why a pricier model is safe here (the cost ladder, revisited)

You met the `summarize` role in [2.3b](../../02-memory/2.3b-wire-into-memory/):
small budget, low effort, because it fires on **every compaction**. `/evolve`
uses a different role from the same config — `recall` — with a **bigger budget
and higher effort**. Why is that safe?

Because **frequency, not importance, sets the spend.** A call that runs once a
week can afford 30K tokens of thinking; the same spend on a call that runs forty
times a day would be reckless. `/evolve` is the rare, high-value end of the
[cost ladder](../../../docs/where-to-spend-tokens.md): spend a lot, seldom. Same
model id (`LLM_MODEL`), different `maxTokens`. (That is exactly the Part-5
self-assessment question — you'll answer it again at the end.)

### How the reference does it

The reference's
[`modules/self-evolution.mjs`](../../../reference/hooks/unified/modules/self-evolution.mjs)
does what you're building plus more: it also folds in session-memory summaries,
filters out "poisoned" memories, and tracks a health score across runs. Your
version keeps the spine — collect lessons, aggregate, synthesize with `recall`,
write proposals, apply nothing — which is the part that carries the principle.

### Build

Open `start/self-evolution.mjs`. The orchestration (`evolve`), the
minimum-sessions gate, the proposal formatter, and the file writes are **done**.
You fill **three function bodies** marked `// TODO`:

1. **`collectLessons` (TODO 1)** — parse each JSON line; skip malformed lines
   silently (a crashed hook can leave a half-written line — it must not throw).
2. **`aggregate` (TODO 2)** — tally distinct sessions and flatten the lesson and
   improvement arrays. Frequency is the signal.
3. **`synthesize` (TODO 3a/3b)** — pull the **`recall`** role from config (not
   `summarize`), then call `callLlm(...)` asking for JSON.

`solution/` has the finished file if you get stuck.

## Checkpoint

The proof here is offline — no key, no network — and it asserts the two things
that matter: a proposals file appears, and nothing was applied. The shipped
`evolve.test.mjs` stubs the LLM with a canned reply and checks both:

```bash
cd my-evolve   # the folder you copied from start/
node evolve.test.mjs
```

✅ **You got it when** every line prints `ok`, ending with:

```
All checks passed: proposals emitted, nothing auto-applied.
```

Concretely, the test asserts:

- `evolution/proposals.md` **is written**, with each proposal `[ ] Pending review`.
- `config.json` and a sample `CLAUDE.md` are **byte-for-byte unchanged** — the
  harness was not mutated.

> 🔑 **Have a real key?** Run it for real to see the synthesis quality:
>
> ```bash
> export LLM_API_KEY=sk-...   ;   export LLM_MODEL=gpt-4o-mini
> mkdir -p context-layer && cp ../fixtures/lessons.jsonl context-layer/
> echo '{}' | node self-evolution.mjs
> cat evolution/proposals.md
> ```
>
> The proposals will reflect the recurring patterns in the fixture (the
> test-runner guessing, the missing impact checks). Still nothing is applied —
> reading and editing the targets is the `/evolve` command's job, with your
> approval, one proposal at a time.

## Recap + next

You closed the feedback loop — but left it open at the one point that keeps a
self-improving harness honest: a human applies the changes. You also re-used the
cost ladder, spending `recall`-tier budget on a job that runs rarely.

Next, **[5.2 — `/retrospective`](../5.2-retrospective/)** widens the lens. Where
`/evolve` reads only `lessons.jsonl`, the retrospective reads **everything** —
session memories, the file-edit history, the tool logs — and asks for
_meta-learnings_ that span projects and months. Same `recall` role, much wider
input.
