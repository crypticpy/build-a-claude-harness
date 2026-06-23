# 2.1 — The rolling log (free memory)

The first piece of memory you'll build costs nothing — no AI, no API key, no tokens. It's just a list of "what happened," appended to a file. Start here: it's the gentlest on-ramp to Part 2, and it teaches one discipline you'll rely on for the rest of the course.

## Objectives

By the end, you will be able to:

- **Append** every tool operation to a per-session JSONL log with no LLM call.
- **Explain** why the log is append-only and never read-modify-write.

Each objective maps to the Checkpoint below.

## Time

10–15 minutes. (Add 5 if Node or the terminal still feel new.)

## Before you start

> 🧠 **No peeking (recall from Part 1):** Your hook calls a tool that isn't installed. What should happen to the user's session, and which one design rule guarantees it?
>
> <details><summary>Answer</summary>Nothing bad — the session continues. A missing optional tool is a **no-op**. You guarantee it with **fail-silent design**: exit 0, wrap the work in `try/catch`, and guard optional dependencies so a failure becomes "do nothing," never a crash. You'll see that exact pattern again in this lesson's `try/catch`.</details>

Confirm your Part 1 checkpoint still works: you have a `unified-hook.mjs` (or at least one working hook) and `node --version` prints 20 or higher.

```bash
node --version   # expect v20+ ; if not, install from nodejs.org
```

Then copy this lesson's `start/` folder somewhere you can edit it:

```bash
cp -r start my-rolling-log && cd my-rolling-log
```

## The lesson

### Principle: token economy starts free

Memory does not have to mean "call an AI." The cheapest possible memory is a plain record of what your tools did, written straight to disk. No model ever sees it at write time, so it costs **$0.00** and adds zero latency. Reach for an LLM only when you need _judgment_; for a _record_, a file is enough. That's the [token economy](../../../docs/where-to-spend-tokens.md) in its simplest form — and it's where every harness's memory should begin.

A [**rolling log**](../../../docs/glossary.md#rolling-log) is exactly this: an append-only file, one line per tool operation, that becomes a searchable audit trail of the session.

### Why append-only, never read-modify-write

This is the step most people get wrong on their first try. The naive way to add a line to a file is:

> read the whole file → add my line in memory → write the whole file back.

That's **read-modify-write**, and it's a trap here. Claude Code can run several tools _at the same time_, and **each tool operation fires this hook as its own separate process.** Picture two of them racing:

```
process A: reads file (3 lines) ─┐
process B: reads file (3 lines) ─┤   ← both saw 3 lines
process A: writes back 4 lines  ─┤
process B: writes back 4 lines  ─┘   ← B's copy had A's line missing → A's write is gone
```

The second writer overwrites the first writer's line. You silently lose data, and only sometimes, which is the worst kind of bug.

`appendFileSync(path, line)` avoids the whole problem: each process only ever **tacks its own line onto the end.** No process reads or holds the full file, so no process can clobber another's work. The fix isn't a lock or a mutex — it's choosing an operation that can't conflict.

### How the reference does it

The reference module [`reference/hooks/unified/modules/rolling-log.mjs`](../../../reference/hooks/unified/modules/rolling-log.mjs) does the same `appendFileSync` at its core, then layers on production concerns we're skipping for now: it also maintains a `file-edits.json` database (you'll meet that in lesson 2.4), prunes old entries once an hour, and can optionally enrich each edit with a cheap LLM summary. Strip all of that away and the beating heart is one line — append a JSON record and a newline. That's what you're building.

### Build

Open `start/rolling-log.mjs`. The file is complete except for **two blanks marked `// TODO`**:

1. Build `sessionLogPath` — the path to `logs/<session_id>.jsonl`.
2. **Append** the entry as one JSON line. Those two steps are the entire pattern.

Fill them in. (If you get stuck, the finished file is in `solution/` — diff against it.)

## Checkpoint

Run the hook twice with two different fake tool events and confirm **both** lines land in the log — it accumulates, it doesn't overwrite:

```bash
echo '{"session_id":"demo-001","tool_name":"Edit","tool_input":{"file_path":"src/app.js"},"tool_output":"ok"}' | node rolling-log.mjs post-tool
echo '{"session_id":"demo-001","tool_name":"Bash","tool_input":{"command":"npm test"},"tool_output":"All tests passed"}' | node rolling-log.mjs post-tool

cat logs/demo-001.jsonl
wc -l < logs/demo-001.jsonl     # expect: 2
```

✅ **You got it when:** `logs/demo-001.jsonl` has **two** lines (the count keeps climbing every time you run the hook), and the first line matches the shape in [`fixtures/expected-log-line.jsonl`](fixtures/expected-log-line.jsonl) (your timestamp will differ — everything else should match):

```json
{
  "timestamp": "...",
  "tool_name": "Edit",
  "output_summary": "ok",
  "metadata": { "tool": "Edit", "file": "src/app.js", "ext": ".js" }
}
```

If the file gets _replaced_ instead of _growing_ (count stays at 1), you used a write instead of an append — re-check blank 2.

## Recap + next

You built free memory: every tool op is now recorded on disk for nothing, and you know _why_ it's append-only — parallel hook processes can't be allowed to read-modify-write the same file.

A raw log of "what happened" is useful, but it's not yet "the model remembers." Next, **[2.2 — the write/read pair](../2.2-write-read-pair/)** builds the actual [Memento loop](../../../docs/the-memento-pattern.md): write a note when the model is about to forget, read it back on the next prompt.
