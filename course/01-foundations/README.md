# Part 1 — Foundations

**Difficulty:** Beginner · **Time:** ~45–60 minutes · **You build:** "Hello, hook" → a one-file event router → fail-silent design.

This is where the harness starts to exist. You'll write your first hook — a tiny script that makes Claude Code do something visible on every prompt — in about 15 minutes. Then you'll add a second hook, feel the duplication, and fold both into a single **router** (the exact shape the reference harness uses everywhere). Finally you'll make a hook crash on purpose and prove the session survives, which is the one discipline that makes it safe to wire hooks into _every_ event later.

Everything you build here is plain Node — no API key, no model calls, nothing to install beyond Node itself.

## Objectives

By the end of Part 1 you will be able to:

- **Write** a `UserPromptSubmit` hook that appends a line to a file, and **verify** it ran by reading that file.
- **Refactor** two standalone hooks into one `unified-hook.mjs` dispatcher that branches on the event name.
- **Prove** that a hook which throws does not kill the session, and **codify** the three rules (exit 0, wrap in try/catch, guard optional dependencies) that guarantee it.

## The lessons

Do these in order — each builds directly on the file from the last.

1. **[1.1 — Hello, hook](1.1-hello-hook/)** — your first win. One `UserPromptSubmit` hook, one appended line, one checkpoint you can see.
2. **[1.2 — From two hooks to one router](1.2-two-hooks-one-router/)** — add a second hook, feel the copy-paste, then merge both into a single dispatcher keyed on the event name.
3. **[1.3 — Fail-silent design](1.3-fail-silent/)** — break a hook deliberately and watch the session shrug it off; lock in the rules that make every later hook safe.

Each lesson ships a `start/` skeleton (you fill in 1–2 marked blanks) and a `solution/` (the working answer to diff against when stuck).

## Read alongside

- [The event model](../../docs/the-event-model.md) — the lifecycle events and payload shapes the lessons reference.

## Self-assessment

A single question at the end of 1.3 checks the one idea that matters most going into Part 2: what happens when a hook reaches for a tool that isn't installed.

---

_[← Part 0](../00-orientation/) · Part 1 · [Part 2 →](../02-memory/)_
