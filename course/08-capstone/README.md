# Part 8 — Capstone

**Difficulty:** Intermediate · **Time:** ~50 minutes · **Status:** the finish line

You've built every piece. The capstone is where you stop following a course and start owning a harness: **assemble** the pieces you actually want into a personal harness (8.1), **depersonalize and publish** it so it's safe to share (8.2), and then **design something new** of your own against a transfer-task rubric. The last one is the real test — not "can you copy the reference," but "can you take a workflow annoyance you have and reason out the right harness piece to fix it."

📖 **Read alongside:** [The Ten Principles](../../docs/principles.md) — the capstone is where you check your design against all ten at once.

## The two lessons + a transfer task

| Lesson                                                    | You do                                                          | Checkpoint                                        |
| --------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------- |
| [8.1 Assemble your own](8.1-assemble/)                    | Compose the pieces you chose into one coherent personal harness | a checklist; your harness installs and runs clean |
| [8.2 Depersonalize & publish](8.2-depersonalize-publish/) | Strip secrets/personal data, rotate keys, gitignore runtime     | your harness passes a depersonalization check     |
| **Transfer task** (in 8.2)                                | Design a _new_ harness piece for an annoyance of your own       | self-score 5/5 on the rubric                      |

Do 8.1 then 8.2. The transfer task lives at the end of 8.2 and is graded against a 5-criterion rubric, with a **worked exemplar** that scores 5/5 in [`8-capstone-exemplar/`](8-capstone-exemplar/).

## The meta-moment

One thing is worth sitting with before you start. **This very repository was depersonalized from a private one.** The harness you've been learning from started life full of one person's absolute paths, their employer's name, their email, private repo names, a non-public model id, an API key env var. None of that is here now — because it was put through exactly the audit 8.2 teaches. **The depersonalization checker you'll run in 8.2 — [`scripts/check-depersonalized.sh`](../../scripts/check-depersonalized.sh) — is the real one this repo uses in CI.** It's not a toy made for the lesson; it's the worked example, still on guard. 8.2 has you read it, understand its two-pass design, and run a version of it against your own harness.

That's the whole arc of the course in one move: you learned to build a harness, and now you learn to make _yours_ safe to publish — using the exact tool that made _this_ one safe to publish.

## What "done" means

You finish the course with three things:

1. **A personal harness** — your chosen subset of the pieces (you do not need all of them; a memory-keeping harness on one LLM key is already complete), assembled and running.
2. **A clean publish** — no secrets, no personal data, runtime files gitignored, verified by a check you can re-run.
3. **A design you reasoned out yourself** — the transfer task, where you pick an annoyance and justify the event, the tool-type, the cost tier, the fail-silent behavior, and the checkpoint. That's the skill the whole course was building toward: not the reference code, the _judgment_.

## Self-assessment

Answer these before you call it done. If one is shaky, revisit the lesson it points to.

1. **Why does a public harness repo need an automated depersonalization _check_, rather than just a careful one-time cleanup?**
   <details><summary>Answer</summary>A one-time cleanup goes stale the moment you commit again — the next edit can reintroduce an absolute path, a private model id, or a pasted key. An automated check (run in CI, or pre-commit) makes "clean" a <i>property the repo enforces continuously</i>, not a state it was briefly in. That's the same logic as <a href="../../docs/principles.md#10-idempotent-templated-setup">idempotent setup</a>: encode the discipline in a re-runnable tool so it can't quietly rot. (Lesson 8.2.)</details>

2. **Callback to Part 2's cost ladder, applied to your own design:** in the transfer task you must justify a _cost tier_ for whatever LLM call your piece makes (if any). State the rule that decides cheap-vs-pricey.
   <details><summary>Answer</summary><b>Frequency vs. stakes.</b> A job that runs constantly (per-compaction summary, per-decision approval) must use a <i>cheap model at low effort</i>, because its cost is multiplied by how often it fires. A job that runs <i>rarely</i> and <i>matters</i> (a periodic <code>/evolve</code> synthesis, a one-shot architecture review) can afford a pricier model. And the cheapest tier of all is <b>no LLM call</b> — distilled by plain code (the rolling log, the MCP tools). Spend where it's rare and matters; economize where it's constant; and prefer free when code can do the job. (<a href="../../docs/where-to-spend-tokens.md">Where to spend tokens</a>.)</details>

3. **Why is "I'll know it works when I see it behave right" not an acceptable checkpoint for a harness piece you're designing?**
   <details><summary>Answer</summary>Because "looks right" isn't <a href="../../docs/principles.md#8-verification-gates">verifiable</a> — it's a vibe, and it can't be re-run or trusted by anyone but you in the moment. A real checkpoint observes a <b>concrete artifact</b>: a file written, a log line appended, an exit code, a fixture matched. The whole course insisted on solo-mechanically-verifiable checkpoints for this reason, and the rubric's 5th criterion makes you hold your <i>own</i> design to that bar. (Lesson 8.2 / the rubric.)</details>

---

_[Course map](../README.md) · [docs](../../docs/) · [reference](../../reference/)_
