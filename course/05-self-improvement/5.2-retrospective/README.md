# 5.2 — `/retrospective`: the wide-angle view

`/evolve` reads one file (`lessons.jsonl`) and asks "what keeps going wrong?"
`/retrospective` zooms all the way out. It reads **everything** the harness has
accumulated — session-memory summaries, the file-edit history, the rolling tool
logs — and asks a different question: not "what went wrong in a session" but
"how does this person _work_, across months and projects?" The output isn't
fixes; it's **meta-learnings** — the patterns you can only see from altitude.
"You re-edit the same auth file in four out of five sessions." "Your test runs
fail because the command assumes the wrong runner." Things no single session
would reveal.

Like `/evolve`, it ends in a **report file** for a human to read. It applies
nothing.

📖 **Read alongside:** [Principles](../../../docs/principles.md).

## Objectives

By the end, you will be able to:

- **Extract** three data sources — session memories, file-edit churn, tool logs
  — each into a small summary.
- **Aggregate** them into one object and synthesize meta-learnings with the
  `recall` role (the same rare, richer budget as `/evolve`).
- **Produce** a dated report file in `evolution/` — the deliverable a human reads.

Each objective maps to the Checkpoint below.

## Time

20–30 minutes.

## Before you start

> 🧠 **No peeking (recall from 5.1):** `/evolve` found recurring mistakes and
> drafted fixes. What is the one thing it deliberately does **not** do, and why
> does that make it safe to run?
>
> <details><summary>Answer</summary>It does **not apply** any proposal. It writes
> them to `proposals.md` tagged `[ ] Pending review` and stops — a human decides
> what to change. The model proposes; the human disposes. `/retrospective`
> follows the same rule: it writes a report, it changes nothing.</details>

This lesson ships a small slice of history in `fixtures/` (three session
memories, a file-edit DB, a month of tool logs). Copy the `start/` folder and
drop the fixtures into place:

```bash
cp -r start my-retro && cd my-retro
mkdir -p memories logs
cp ../fixtures/memories/*.json memories/
cp ../fixtures/logs/*           logs/
```

## The lesson

### Principle: distilled intelligence over raw bytes — at the portfolio scale

You met "[distilled intelligence over raw bytes](../../../docs/principles.md)"
in Part 4: feed the model a _summary_, not the whole file. `/retrospective` is
that same principle applied to your **entire history**. You will never paste
months of transcripts into a prompt — it wouldn't fit, and it would cost a
fortune. Instead each `extract*` function distills one raw source into a few
counts and top-N lists: themes, churn hotspots, tool-error frequencies. The
LLM then reasons over the _distillate_, not the bytes. That's what makes a
"read everything" command affordable.

### Why this runs rarely — and on the same `recall` role

`/retrospective` is the rarest job in the harness: run it every ~50 sessions,
not every day. That rarity is exactly why it can afford the **`recall`** role —
the same richer budget `/evolve` uses. (Recall the [Part-5
self-assessment](../#part-5-self-assessment): a pricier model is safe precisely
_because_ the job is infrequent.) Where `/evolve` and `/retrospective` differ is
the **input width**, not the cost tier: `/evolve` reads one file;
`/retrospective` reads three sources and looks for cross-cutting patterns.

### How the reference does it

The reference's
[`modules/deep-retrospective.mjs`](../../../reference/hooks/unified/modules/deep-retrospective.mjs)
reads _seven_ sources — it also pulls Claude Code's own global prompt history,
per-project memory files, and a stats cache from `~/.claude` when present, and
it caps the assembled prompt so years of history still fit. Your version keeps
three module-owned sources, which is enough to carry the principle and produce a
real report.

### Build

Open `start/deep-retrospective.mjs`. The three extractors, the prompt builder,
the report formatter, and the entry point are **done**. You fill **two blanks**:

1. **`aggregateAll` (TODO 1)** — compose the three extractors into one object.
2. **`synthesize` (TODO 2)** — the same `recall`-role call you wrote in 5.1:
   pull `config.llm?.recall`, then `callLlm(...)` asking for JSON.

`solution/` has the finished file.

## Checkpoint

The proof is offline — the shipped `retrospective.test.mjs` stubs the LLM with a
canned reply, runs the analysis over the fixtures, and asserts a report file is
produced:

```bash
cd my-retro   # the folder you copied from start/
node retrospective.test.mjs
```

✅ **You got it when** every line prints `ok`, ending with:

```
All checks passed: a retrospective report file was produced.
```

The test asserts the deliverable exists and is well-formed: a
`retrospective-YYYY-MM-DD.md` with a **Meta-Learnings** section and a **Harness
Recommendations** section, containing the synthesized insight.

> 🔑 **Have a real key?** Run it for real:
>
> ```bash
> export LLM_API_KEY=sk-...   ;   export LLM_MODEL=gpt-4o-mini
> echo '{}' | node deep-retrospective.mjs
> cat evolution/retrospective-*.md
> ```
>
> The report will name the churn hotspot (`src/auth/middleware.ts`, edited in 4
> sessions) and the test-runner error from the logs — patterns visible only when
> you read across the whole history. Still: it writes a report, it changes
> nothing.

## Recap + next

You built the harness's most zoomed-out lens: a command that reads everything,
distills each source, and reports meta-learnings — without applying a single
change. Together with `/evolve`, the harness can now notice its own patterns at
two scales (one file vs. all of history) and propose improvements that a human
approves.

> 📋 **Self-assessment** for the whole part — including the cost-ladder question
> "why is it safe for `/evolve` to use a pricier model than the per-compaction
> summarizer?" — lives on the [Part 5 landing](../#part-5-self-assessment).

Next, **[Part 6 — Packaging & setup](../../06-packaging/)** makes all of this
installable: one `install.sh` that wires the hooks, registers the MCP server, and
drops in the statusline — idempotently, so re-running is always safe.
