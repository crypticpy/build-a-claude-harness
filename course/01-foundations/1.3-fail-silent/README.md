# 1.3 — Fail-silent design

## Objectives

By the end of this lesson you will be able to:

- **Prove** that a hook which throws an error does not block the session — it still exits 0.
- **Codify** the three fail-silent rules (always exit 0 · wrap work in try/catch · guard optional dependencies) in your router.
- **Show** that a missing optional dependency (an uninstalled tool) is a no-op, not a crash.

## Time

~15 minutes.

## Before you start

> **No-peeking recall (from 1.2):** in one sentence, what is a dispatcher?
>
> <details><summary>check yourself</summary>One script that handles many events by branching on the event name it was passed.</details>

Confirm your 1.2 router still works:

```bash
printf '%s' '{"prompt":"pre-13 check"}' | node "$HOME/.claude/hooks/unified/unified-hook.mjs" prompt
tail -n 1 "$HOME/.claude/hello-hook.log"
```

You should see the `prompt: pre-13 check` line.

## The lesson

### Principle

Your hooks run **inside your turn**. Claude Code waits for them. That means a hook has power it shouldn't abuse: if it throws and exits with a failure code, it can disrupt the very work you're trying to do. A logging script must never be able to cost you a real edit.

So every hook in the harness obeys three rules. Together they're called **fail-silent design**:

1. **Always exit 0.** The hook's last reachable line is `process.exit(0)`. A non-zero exit is how a program signals "something went wrong, stop" — and we _never_ want a best-effort hook to send that signal. Success is the only thing we report.
2. **Wrap the work in `try/catch`.** A thrown error is caught and swallowed (optionally logged to stderr when `DEBUG` is set), so it can't leak out and become a non-zero exit.
3. **Guard optional dependencies.** If a feature needs a tool, file, or API key that might not be present, check first and do nothing when it's missing. A missing optional dependency is a **normal state** — a fresh machine, a CI box, a teammate without your tools — not an error to be loud about.

Note how rules 1 and 2 work together: the `try/catch` catches the throw, and the unconditional `exit(0)` guarantees the exit code regardless. Rule 3 prevents a whole _class_ of throws before they happen.

### Why this matters

This is the discipline that makes it _safe_ to wire a hook into every single event. Without it, one typo in your memory module could block every prompt you submit. With it, the worst case for any hook is "it quietly did nothing." That asymmetry — huge upside, near-zero downside — is why the reference harness can afford to run code on `SessionStart`, `UserPromptSubmit`, `PostToolUse`, `PreCompact`, and `Stop` without you ever worrying that a bug there will eat your work.

It's also what makes the harness portable. Your summarizer needs an API key; your formatter needs Prettier; your code-intelligence needs an MCP server. Rule 3 means none of those are _required_ — each feature lights up when its dependency is present and stays dark when it isn't. The harness works on a bare machine and gets better as you add tools.

### How the reference does it

Open [`reference/hooks/unified/unified-hook.mjs`](../../../reference/hooks/unified/unified-hook.mjs) and read its header comment — it names two design rules: **"LAZY LOADING"** and **"FAIL SILENT,"** and says _"Every path ends in `process.exit(0)`, and module work is wrapped so a thrown error, a missing file, or an unset API key is a no-op — never a crash that blocks the user's turn."_ That's rules 1, 2, and 3 in one sentence.

For rule 3 specifically, look at how the reference's `getApiKey()` (in `modules/api-key.mjs`) returns `null` when no key is set, with the comment _"Callers MUST treat null as 'skip the LLM step' and continue silently."_ And its `format-lint` module silently no-ops when the formatter isn't installed. You're building the same guards in miniature.

### What you build

Two things.

**1. A hook that fails on purpose — and survives.** Open [`start/broken-hook.mjs`](start/broken-hook.mjs). `doRiskyWork()` throws every time (stand-in for any real bug: a missing file, a bad property access). Two blanks:

- **Blank 1** — wrap the call in `try/catch` and swallow the error.
- **Blank 2** — add the `process.exit(0)` that reports success anyway.

Diff against [`solution/broken-hook.mjs`](solution/broken-hook.mjs) if needed.

**2. The optional-dependency guard.** Open [`start/unified-hook.mjs`](start/unified-hook.mjs). The `post-edit` branch wants to format the edited file with Prettier — but Prettier may not be installed. One blank:

- **Blank 1** — wrap the formatting block in `if (isToolAvailable("prettier")) { ... }` so a missing formatter is a silent no-op. (`isToolAvailable` is written for you — it returns `false` instead of throwing when the tool isn't on `PATH`.)

Diff against [`solution/unified-hook.mjs`](solution/unified-hook.mjs).

## Checkpoint

Two proofs, both runnable offline. First copy your **edited** files into place (otherwise you'll test the stale, un-filled versions and think your code is broken):

```bash
cp start/broken-hook.mjs "$HOME/.claude/hooks/broken-hook.mjs"
cp start/unified-hook.mjs "$HOME/.claude/hooks/unified/unified-hook.mjs"
```

### Proof 1 — a broken hook does NOT kill the session

```bash
printf '%s' '{}' | node "$HOME/.claude/hooks/broken-hook.mjs"
echo "exit=$?"
```

**Pass:** `exit=0`, even though `doRiskyWork()` threw. The error was caught and the hook reported success — Claude Code sees a clean exit and your turn continues untouched. (Add `DEBUG=1` before `node` to _see_ the swallowed error printed to stderr while the exit code stays 0 — proof it threw, proof it was contained.)

If you see a non-zero exit or a stack trace on stdout, blank 1 or 2 isn't right — diff against `solution/`.

### Proof 2 — a missing optional tool is a no-op

The `post-edit` branch logs the edit and _then_ tries to format. With or without Prettier installed, the edit must still be logged and the hook must still exit 0:

```bash
HOOK="$HOME/.claude/hooks/unified/unified-hook.mjs"
printf '%s' '{"tool_input":{"file_path":"src/app.ts"}}' | node "$HOOK" post-edit
echo "exit=$?"
tail -n 1 "$HOME/.claude/hello-hook.log"
```

**Pass:** `exit=0`, and the log shows the `edit: src/app.ts (.ts)` line. If Prettier isn't installed, the guard skipped formatting silently and you'll see _no_ `formatted the edit` line — that absence is the point: the missing dependency turned the feature off without complaint. The edit still got logged.

You can confirm the guard's logic directly: it returns `false` for a tool that doesn't exist and `true` for one that does — so the formatting branch only ever runs when it safely can.

## Part 1 self-assessment

> **Your hook calls a tool that isn't installed — what should happen, and how do you guarantee it?**

<details>
<summary>Answer</summary>

**What should happen:** nothing. A missing tool is a normal state (fresh machine, CI, a teammate without it), so that feature should quietly turn off — a silent no-op — while the rest of the hook runs and the session is never disrupted.

**How you guarantee it (the three rules together):**

1. **Guard the optional dependency** — probe for the tool first (`isToolAvailable("prettier")`, or `getApiKey()` returning `null`) and skip the feature when it's absent. This prevents the throw before it happens.
2. **Wrap the work in `try/catch`** — so if the tool _is_ present but errors anyway (a bad file, a non-zero exit), the throw is caught, not propagated.
3. **Always `process.exit(0)`** — so even an unexpected failure can never become a non-zero exit code that blocks your turn.

The guard handles the expected-missing case; the try/catch handles the unexpected-failure case; the exit-0 is the backstop for everything. That layering is fail-silent design.

</details>

## Recap + next

You proved the thing that makes the whole harness safe: a hook can fail, and your work survives. You codified the three rules — exit 0, try/catch, guard optional dependencies — that every later module relies on. From here, every feature you add (memory, LLM summaries, MCP tools) can assume its worst case is "quietly did nothing."

That's the end of Part 1. You have a fail-silent event router — the spine the rest of the harness hangs off.

Next: **[Part 2 — Memory](../../02-memory/)** — you'll give the harness a memory that survives compaction, starting with a rolling log that costs nothing.

---

_[← 1.2](../1.2-two-hooks-one-router/) · 1.3 · [Part 2 →](../../02-memory/)_
