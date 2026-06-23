# Part 0 — Orientation

**Difficulty:** Beginner · **Time:** ~20 minutes · **You build:** nothing yet.

This part is the only one where you write no code. That's deliberate. Before you bolt anything onto Claude Code, you need three things in your head: _what a harness actually is_, _how Claude Code lets you hook into it_, and _what the finished thing looks like_ so the later parts have somewhere to land. By the end you'll also have confirmed your machine is ready, so Part 1's first win goes smoothly.

If you've never customized a developer tool before, this is the gentlest the course gets — read it like a tour, not a manual.

## Objectives

By the end of Part 0 you will be able to:

- **State** in one sentence what a harness is and what compaction is.
- **Name** the Claude Code lifecycle event you'd use to react to a given moment (a prompt arriving, a file being edited, the window filling up).
- **Point** at the one file in the reference harness — the _router_ — that everything else hangs off of.
- **Confirm** your machine meets the requirements (Node 20+, a working `claude` command).

## The lessons

Do these in order. Each is a short read.

1. **[0.1 — What is a harness, and why?](0.1-what-and-why/)** — the one-sentence definition, and the single idea (compaction) that motivates half of what we build later.
2. **[0.2 — The event model and the router](0.2-event-model-and-router/)** — the lifecycle events Claude Code exposes, and how `settings.json` maps each event to a script.
3. **[0.3 — A shallow tour of `reference/`](0.3-shallow-tour/)** — a walk past the finished harness. You won't understand most of it yet, and that's fine — you anchor on exactly one file.
4. **[0.4 — Compatibility and setup check](0.4-setup-check/)** — the Claude Code version this course targets, and a 2-minute check that your tools are ready.

## Read alongside

These two background docs go deeper than the lessons and are worth keeping open:

- [What is a harness?](../../docs/what-is-a-harness.md)
- [The event model](../../docs/the-event-model.md)

## Self-assessment

At the end of 0.4 there's a single question to check the mental model stuck. If you can answer it without scrolling back, you're ready for Part 1.

---

_[Course home](../README.md) · Part 0 · [Part 1 →](../01-foundations/)_
