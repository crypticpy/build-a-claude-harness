# 6.3 — Statusline + context-report: feedback at a glance

Two small pieces of always-on feedback. The **statusline** is the one-line
dashboard under your prompt — model, how full the context window is, session
cost. The **context-report** is a single, well-timed warning: when you cross
~90% of the auto-compact threshold, it tells you once so you can wrap up the
current task before a compaction interrupts it. Both are read-only — they observe
and report, they never change anything.

## Objectives

By the end, you will be able to:

- **Render** a statusline from the JSON Claude Code pipes in: sum the token types,
  draw a context bar, color it by how close compaction is.
- **Emit** a context warning exactly **once** per session, using an atomic marker
  file so concurrent hook runs can't double-warn.
- **Locate** the statusline source correctly — and not be fooled by the
  data-only `powerline/` directory.

Each objective maps to the Checkpoint below.

## Time

20–25 minutes.

## Before you start

> 🧠 **No peeking (recall from Part 1's fail-silent design):** The context-report
> runs on every `UserPromptSubmit`. If its transcript read throws — bad JSON, a
> missing file — what must it do, and what must it **never** do?
>
> <details><summary>Answer</summary>It must **return null and stay silent** —
> the whole body is wrapped in try/catch, and every guard returns null. It must
> **never throw**, because a hook that crashes on a malformed transcript would
> break the user's turn. Degrade quietly; a missing warning is fine, a broken
> turn is not.</details>

Copy this lesson's `start/`:

```bash
cp -r start my-statusline && cd my-statusline
```

## The lesson

### Principle: observe and report, never mutate

Both pieces here are pure observers. The statusline reads the JSON Claude Code
hands it and prints a string — it writes nothing. The context-report reads the
transcript and returns a string or null — its only write is a tiny marker file
whose entire purpose is to _not_ warn twice. Feedback layers earn their place by
being cheap and safe: if either one broke, your session would keep working
exactly as before.

### How the statusline works

Claude Code pipes a JSON blob to the script's stdin on every render and prints
its stdout. You pull out the model, the four token counts, and the session cost;
sum the tokens; and draw a 10-character bar whose **fill** is the percentage
toward the auto-compact threshold and whose **color** warns as you approach it
(green → yellow → red). The threshold is `WINDOW × ~80%` — where Claude Code's
auto-compact actually fires.

### The once-per-session warning (and why the marker comes first)

The context-report could fire on every prompt once you're past 90% — that would
be noise. So it writes a per-session **marker file** the first time it warns, and
every later call sees the marker and stays silent. The subtle part: it records
the marker **before** emitting, using an atomic `writeFileSync(..., { flag: "wx" })`
that fails if the file already exists. If two hook processes race, exactly one
wins the write and warns; the loser sees the failed write and stays quiet. Record
first, emit second — that ordering is what makes "exactly once" hold under
concurrency.

### Gotcha: `powerline/` is a pricing table, not the statusline

> ⚠️ When you go looking for "the statusline code" in a harness, you'll see a
> `powerline/` directory and assume that's it. **It isn't.** `powerline/usage/
pricing.json` is **data only** — a per-model price table (USD per million
> tokens) that a fancier statusline _reads_ to turn token counts into dollars.
> The actual bar-drawing logic is `statusline-command.sh`. Don't edit
> `powerline/` looking for rendering code; there's none there. (This lesson ships
> a sample `pricing.json` in `fixtures/powerline/` so you can see exactly what
> kind of file it is.)

### How the reference does it

The reference ships its renderer as a top-level
[`statusline-command.sh`](../../../reference/statusline-command.sh) (the same
model + context-bar + cost core you're building) next to the data-only
[`powerline/usage/pricing.json`](../../../reference/powerline/usage/pricing.json)
price table — exactly the decoy split above: the renderer draws, `powerline/`
only holds prices. Its
[`context-report.mjs`](../../../reference/hooks/unified/modules/context-report.mjs)
locates the transcript itself from the session id under `~/.claude/projects`.
Both files are copied into `~/.claude` by the reference `install.sh`, and
`settings.template.json` wires `statusLine` at the installed
`statusline-command.sh`. Your versions keep the cores — the bar + cost, and the
once-per-session warning — which carry both principles.

### Build

**Statusline** — open `start/statusline-command.sh`, fill **two blanks**:

1. **TODO 1** — sum the four token types into `ctx_tokens`.
2. **TODO 2** — choose `bar_color` by how much room remains (`≤10000` red,
   `≤50000` yellow, else green).

**context-report** — open `start/context-report.mjs`, fill the **two-step block**:

1. **TODO 1** — below `warnAt` → `return null` (stay silent).
2. **TODO 2** — at/past threshold → `recordWarned()` first; if it returns false,
   `return null` (another run already warned).

`solution/` has both finished files.

## Checkpoint

**A — the warning fires exactly once.** The shipped test pins the window, feeds a
near-full transcript, and asserts: first call warns, second call (same session)
is silent, a below-threshold session never warns.

```bash
cd my-statusline
node context-report.test.mjs
```

✅ ends with `All checks passed: near-full context emits exactly ONE warning.`

**B — the statusline renders.** Pipe a sample blob in (needs `jq`):

```bash
echo '{"model":{"display_name":"Opus"},"cost":{"total_cost_usd":1.23},"context_window":{"current_usage":{"input_tokens":40000,"output_tokens":1500,"cache_read_input_tokens":110000,"cache_creation_input_tokens":2000}}}' \
  | CLAUDE_CODE_AUTO_COMPACT_WINDOW=200000 bash statusline-command.sh ; echo
```

✅ **You got it when:** part A prints the one-warning success line, and part B
prints a line like `Opus  ██████████░ 153k/160k (95%)  $1.23` — model, a **red**
bar (95% is deep in the danger zone), the token ratio, and the cost. Filling
TODO 1 with `0` would show `0%`; filling TODO 2 wrong would mis-color the bar —
both are visible in the render.

> 🖥️ **On a real machine,** install.sh (6.1) already dropped
> `statusline-command.sh` next to `settings.json`, and the template's
> `statusLine` block points Claude Code at it. Start a new session and the bar
> appears under your prompt automatically.

## Recap + next

You added the always-on feedback layer: a context/cost statusline and a
fire-once context warning, both pure observers that can't break a session. You
also sidestepped the `powerline/` decoy — it's a pricing table, not the renderer.

That completes the harness's packaging. See the
[Part 6 landing page](../) for the self-assessment, including the idempotency
question — and where to go next.
