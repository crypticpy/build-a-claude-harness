# 3.4a — Quality gates

The first three lessons built things you _trigger_. The last two build things that _gate_ — automatic checks that stand between "I think it's done" and actually stopping. This one is the `Stop`-time quality gate: when your turn ends, if files changed, it runs your type-checker (or lint, or tests) and surfaces any failure. Two rules make it safe: it runs **only when something changed**, and it **never throws**.

## Objectives

By the end, you will be able to:

- **Write** a `Stop`-time gate that runs a configured check only when files changed and is a no-op on a clean tree.
- **Prove** the gate surfaces a failing check (so "done" is blocked) while still exiting cleanly — it never crashes the turn.

Each objective maps to the Checkpoint below.

## Time

10–15 minutes.

## Before you start

> 🧠 **No peeking (recall from Part 1):** You make a hook throw an exception on purpose. Does the session die? What two habits from Part 1 guarantee a broken hook can't take down a turn?
>
> <details><summary>Answer</summary>The session survives. The two habits: <b>exit 0</b> regardless, and wrap the work in <b>try/catch</b> so an error becomes a no-op instead of a crash (plus the optional-dependency guard — a missing tool is a no-op too). A quality gate lives or dies by exactly this discipline: it runs on <i>every</i> Stop, so if it ever threw, it would break every turn.</details>

Confirm Part 1's fail-silent design is fresh. Then copy this lesson's `start/`:

```bash
cp -r start my-gate && cd my-gate
```

## The lesson

### Principle: a gate runs only on change, and never throws

A quality gate fires on the `Stop` event — the moment a turn ends. Two non-negotiable rules:

1. **Only when files changed.** Type-checking a project where nothing changed is wasted time on the highest-frequency event there is. So the gate checks "did anything change this turn?" first; a clean tree is a no-op. (The reference uses a git heuristic — `git diff` / untracked files; this lesson uses a `.changed` marker file so the checkpoint is deterministic without a throwaway repo.)
2. **Never throw, never hard-block.** A gate that crashed would break _every_ turn, since it runs on every Stop. So a failing check is **surfaced** (printed, so "done" doesn't slide past a broken type-check) but the gate still exits cleanly. It reports; it does not crash.

This is the [token economy](../../../docs/where-to-spend-tokens.md) and Part 1's fail-silent design meeting at one event: the gate costs **nothing** (no LLM — it's a deterministic "did files change / did the check pass"), and it can never take the session down.

### Why it matters

"I'll just declare it done" is the most common way a broken change ships. A gate at the Stop event is the cheapest possible insurance: it re-runs the check you'd run by hand anyway, automatically, exactly when you're about to walk away — and because it's free and fail-silent, there's no reason not to leave it on.

### How the reference does it

[`reference/hooks/unified/modules/quality-gates.mjs`](../../../reference/hooks/unified/modules/quality-gates.mjs) is the template: `hasFilesChanged(cwd)` gates the run, the check command comes from config (`npx tsc --noEmit` for a TypeScript project, `null` for stacks with no gate), failures go to stderr via `console.error`, and the whole thing is wrapped so it "never break[s] Stop." Your version keeps that exact shape with the marker-file change check.

### Build

One file: **`quality-gate.mjs`**. Fill **two function bodies** (marked `// TODO`):

1. `hasFilesChanged(cwd)` — return whether a `.changed` marker exists.
2. `runGate(cwd, config)` — the no-op guard: if nothing changed, return `{ ran: false, reason: "no-change" }` and skip the check entirely.

The rest (running the check, catching a failure, exiting 0) is given. The `fixtures/` ship three scenarios: `passing/` (changed + a check that exits 0), `failing/` (changed + a seeded check that exits 1), and `clean/` (no marker — and its `check.mjs` would fail loudly _if it ever ran_, which it must not).

## Checkpoint

Run the gate against all three fixture scenarios. Each runs from inside the scenario dir so `node check.mjs` resolves:

**1. Failing check blocks "done" (but the gate still exits 0):**

```bash
( cd ../fixtures/failing && node "$OLDPWD/quality-gate.mjs" . ) ; echo "exit=$?"
```

✅ Prints `CHECK FAILED — do not call this done:` and the seeded `error TS2345…`, and `exit=0`. The failure is _surfaced_, not thrown — the turn doesn't crash, but you've been told not to call it done.

**2. Clean tree is a no-op (the check never runs):**

```bash
( cd ../fixtures/clean && node "$OLDPWD/quality-gate.mjs" . ) ; echo "exit=$?"
```

✅ Prints `skipped (no-change) — nothing to verify.` and `exit=0`. Crucially, the scenario's `check.mjs` (which prints `BUG: gate ran on a clean tree` and exits 1) **does not run** — proof the change guard short-circuits before the expensive check.

**3. Passing check (sanity):**

```bash
( cd ../fixtures/passing && node "$OLDPWD/quality-gate.mjs" . ) ; echo "exit=$?"
```

✅ Prints `check passed.` and `exit=0`.

Three scenarios, three correct behaviors: **block on failure, skip on no-change, pass on success** — and `exit 0` every time. That last part is the whole safety story: a gate reports, it never crashes the turn.

## Recap + next

You built a gate that runs your check exactly when it's worth running and never takes the session down — the Part 1 fail-silent discipline applied to the Stop event, at zero token cost.

→ **[3.4b — Verification checklist](../3.4b-verification-checklist/)**, the gate's companion: instead of running a tool, it injects a short self-review checklist when you've edited several files in one turn — and then `/freview`, the dual-agent review layer that ties 3.3 and 3.4 together.
