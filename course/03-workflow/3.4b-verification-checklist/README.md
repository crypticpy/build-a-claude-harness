# 3.4b — Verification checklist + /freview

3.4a ran a _tool_ at the Stop event. This lesson's gate runs _nothing_ — no tool, no model. It just counts how many files you edited in the last turn, and if that's three or more, it injects a short self-review checklist before the model declares done. Then you wire `/freview`: the dual-agent layer that ties the whole part together — a command that spawns two review agents in parallel.

## Objectives

By the end, you will be able to:

- **Write** a `verification-check` module that counts the last turn's file edits and injects a self-review checklist when the count hits the threshold (3), and prove a 3-edit transcript triggers it while a 2-edit one stays quiet.
- **Author** the `/freview` command that spawns the `code-reviewer` and a completeness agent in parallel and aggregates their reports.

Each objective maps to the Checkpoint below.

## Time

12–18 minutes.

## Before you start

> 🧠 **No peeking (recall from 3.4a):** The quality gate runs on the same event as this checklist. What event is that, and what's the one thing the gate must _never_ do?
>
> <details><summary>Answer</summary>Both run on <b>Stop</b> (the end of a turn). The gate must <b>never throw / never hard-block</b> — it runs on every Stop, so a crash would break every turn. This checklist module shares that rule: any error returns <code>null</code> and it stays silent.</details>

Confirm 3.4a works (the gate blocks on the seeded failure, no-ops on the clean tree). Then copy this lesson's `start/`:

```bash
cp -r start my-verify && cd my-verify && cp -r ../fixtures .
```

## The lesson

### Principle: a burst of edits is a signal to slow down

The quality gate (3.4a) and this verification check are **two distinct modules on the same event**, and the difference is the point:

- **Quality gate** → runs a _tool_ (type-check / lint / test). External, objective: did the code compile?
- **Verification check** → runs _no tool_. It looks at the transcript and asks "how many files did the model edit this turn?" If that's ≥ 3 — a meaningful burst — it injects a checklist (scope creep? leftover TODOs? swallowed errors? hardcoded values?) before the model wraps up. Internal, reflective: did I actually finish, or just stop?

Both are **LLM-free**. The edit count is a deterministic read of the transcript — no judgment, no model call — which is exactly right for something that fires on every Stop. (That's the [cost ladder](../../../docs/where-to-spend-tokens.md) again: the highest-frequency moment gets the cheapest possible check.)

### Why it matters

The most common failure isn't writing wrong code — it's declaring done too early after a flurry of edits, when the easiest things to forget (a leftover TODO, an empty catch, scope that crept) are most likely. A free checklist injected at exactly that moment costs nothing and catches the predictable misses. It's the same instinct as a code review, dialed down to a self-prompt the model reads before it stops.

### How the reference does it

[`reference/hooks/unified/modules/verification-check.mjs`](../../../reference/hooks/unified/modules/verification-check.mjs) is the original: `EDIT_THRESHOLD = 3`, counts `Write`/`Edit` `tool_use` blocks in the **last assistant turn only**, tails just 50KB of a huge transcript, and returns `null` on any error so it never blocks Stop. Your version keeps all of that except the tail optimization (the fixtures are tiny, so you read the whole file).

### Then: `/freview` — the dual-agent layer

The checklist is the model reviewing _itself_. `/freview` is the heavier layer: a **command** (3.1) that spawns **two sub-agents** (3.3) — `code-reviewer` and a completeness scanner — **in parallel, in one message**, each in its own clean context, then aggregates their two reports into one blockers/non-blockers summary. This is the composition pattern from the docs: _the thing you type orchestrates the things that run on their own._ It's anchored to [`reference/commands/freview.md`](../../../reference/commands/freview.md).

> 🔁 **Callback to the cost ladder:** the checklist runs free on every Stop; `/freview` spawns real model agents but only **when you type it** — rare, on-demand, the [`recall`](../../../docs/where-to-spend-tokens.md) tier. Cheap-and-constant for the reflex check; expensive-and-seldom for the deep review. Same lesson Part 2 drilled.

### Build

Two files:

1. **`verification-check.mjs`** — fill the body of `countFileEdits()` (one TODO): count `tool_use` blocks named `Write`/`Edit` across the last turn's assistant entries.
2. **`freview.md`** — fill **blank 1**: the parallel-spawn instruction (both agents in a single message). The rest is given.

`fixtures/` ship `three-edits.jsonl` (a turn with 3 edits → triggers) and `two-edits.jsonl` (2 edits → stays quiet).

## Checkpoint

**1. Three edits triggers the checklist:**

```bash
echo '{"transcript_path":"./fixtures/three-edits.jsonl"}' | node verification-check.mjs
```

✅ Prints a `<verification-check>` block reading "Significant code changes detected (3 files modified this turn)" with the five-item self-check list.

**2. Two edits stays quiet (below threshold):**

```bash
echo '{"transcript_path":"./fixtures/two-edits.jsonl"}' | node verification-check.mjs   # (no output — correct)
```

✅ Nothing prints. The module is silent below the threshold — a couple of edits don't warrant the ceremony; a burst does. Both invocations exit 0 (it never blocks Stop).

**3. `/freview` reads as a valid dual-agent command:** open `freview.md` and confirm your blank-1 instruction says the two agents are spawned in a **single message, in parallel**. (This one is a structural read, not a runnable gate — `/freview` spawns live agents, which you'd see in a real session; the checklist above is the deterministic gate.)

## Recap + next

You built the verification layer two ways: the free, reflexive self-check that fires after a burst of edits, and `/freview` — the on-demand dual-agent review that composes a command, two sub-agents, and parallel execution into one workflow. That's every Part 3 primitive working together.

→ Back to the **[Part 3 overview](../README.md)** for the self-assessment (command vs skill vs agent, plus the cost-ladder callback), or on to **[Part 4 — MCP](../../04-mcp/)**, where the harness gains code intelligence and the Minimum Viable Harness is complete.
