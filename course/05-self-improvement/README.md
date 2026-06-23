# Part 5 — Self-improvement loop

**Difficulty:** Intermediate · **Time:** ~60 minutes

You finished the [Minimum Viable Harness](../../docs/glossary.md#mvh-minimum-viable-harness)
at the end of Part 4. It keeps memory, logs itself, runs your workflow commands,
and answers questions about your own code. You _could_ stop here — it's a real,
useful harness.

Here's the reason not to. Everything you've built so far has been **quietly
collecting evidence about how you and Claude actually work**: the lessons
written on every compaction, the session summaries, the file-edit history, the
tool logs. That pile of data has been accumulating for one purpose, and this is
it. Part 5 closes the loop — the harness reads its own history back and proposes
how to improve itself.

> 🔁 **The harness that improves itself.** Two commands, both human-gated. Neither
> changes a thing on its own — they surface evidence-backed proposals and you
> decide. That gate is the whole point: a self-improving system you can trust
> precisely because it never edits itself behind your back.

## The two lenses

| Lesson                                     | Reads                        | Asks                                        | Produces                   |
| ------------------------------------------ | ---------------------------- | ------------------------------------------- | -------------------------- |
| [5.1 `/evolve`](5.1-evolve/)               | `lessons.jsonl`              | "What recurring mistakes can we fix?"       | `proposals.md` (you apply) |
| [5.2 `/retrospective`](5.2-retrospective/) | sessions + edits + tool logs | "How does this person work, across months?" | a dated report (you read)  |

Same `recall` LLM role for both — the rare, richer end of the
[cost ladder](../../docs/where-to-spend-tokens.md). The difference is **how wide
the input is**: one file vs. your whole history.

📖 **Read alongside:** [Principles](../../docs/principles.md).

## The principle that ties Part 5 together

**The model proposes; the human disposes.** A harness that edits its own
`CLAUDE.md` can drift away from what you want without you noticing. So both
commands stop at a **file** — proposals to review, a report to read — and leave
the act of changing the system to a deliberate human step. The intelligence is
automated; the authority is not.

Do the lessons in order — 5.2's `synthesize` reuses the exact `recall`-role
pattern you write in 5.1.

## Part 5 self-assessment

1. **Why is it safe for `/evolve` to use a pricier model (the `recall` role)
   than the per-compaction summarizer (the `summarize` role)?**
   <details><summary>Answer</summary>Because **frequency sets the spend, not
   importance.** The summarizer runs on *every* compaction, so a small budget
   keeps the compounded cost low. `/evolve` runs *rarely*, so a big budget is
   affordable even though it's the same model id. Spend a lot, seldom — never a
   lot, often.</details>

2. **Callback (Part 2):** Which event writes the `lessons.jsonl` that `/evolve`
   reads back, and which event re-injects session memory at the start of a turn?
   <details><summary>Answer</summary>`PreCompact` writes the lessons (the
   trace-diagnosis half of 2.4); `UserPromptSubmit` re-injects memory (the read
   side of the Memento pattern, 2.2). `/evolve` is the delayed consumer of what
   `PreCompact` has been depositing.</details>

> 🏁 **Where this leaves you:** after Part 5 the harness can notice its own
> patterns and draft its own improvements. [Part 6](../06-packaging/) makes the
> whole thing installable in one idempotent script.
