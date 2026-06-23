# 8.1 — Assemble your own harness

You've built the pieces in isolation, each in its own lesson folder. This lesson is about composition: taking the subset you actually want and wiring them into **one coherent harness** that installs once and runs clean. There's no new code here — the skill is _selection and integration_, deciding what belongs in your harness and confirming the parts cooperate instead of colliding.

## Objectives

By the end, you will be able to:

- **Select** a coherent subset of the pieces you built (and justify leaving pieces out).
- **Assemble** them into one harness directory with a single `settings.json` router wiring every hook.
- **Verify** the assembled harness installs idempotently and every wired hook fires without error.

Each objective maps to the Checkpoint below.

## Time

20–30 minutes.

## Before you start

> 🧠 **No peeking (recall from Part 6):** What makes an installer _idempotent_, and why does that property matter specifically for a directory like `~/.claude`?
>
> <details><summary>Answer</summary>Idempotent = running it N times leaves the same result as running it once — it generates live config from tracked <b>templates</b> and never double-installs or corrupts existing state. It matters for <code>~/.claude</code> because that directory holds your real, live configuration: a non-idempotent installer could duplicate hook entries, clobber settings you'd hand-edited, or corrupt a half-written file on a re-run. Idempotence makes "just run install again" always safe. (Part 6.)</details>

This lesson has no `start/` — you're composing files you already built across Parts 1–7. Work in a fresh directory you'll call your harness.

## The lesson

### Principle: a harness is a router plus the pieces it points to

Step back and look at what you've built. Every single piece plugs into the same socket: **`settings.json` maps an event to a script** ([Principle 2](../../../docs/principles.md#2-settingsjson-is-the-router)). The rolling log, the session-memory writer, the impact-hint nudge, the quality gate, tokf, cf-approve — they are all just rows in that router table. Assembling a harness is therefore not a big integration project. It's: gather the scripts you want, write the router rows that fire them, and confirm nothing collides.

That's the liberating realization the course was building toward. There's no framework to satisfy, no plugin lifecycle to honor. A harness is **a folder of small scripts and one table that says when each runs.**

### Choose your subset — you do not need all of it

The [MVH](../../../docs/glossary.md#mvh-minimum-viable-harness) was complete at the end of Part 4: memory, self-logging, code intelligence, on one LLM key. Everything after is additive. So choose deliberately:

- **Always worth keeping:** the rolling log (free), the Memento write/read pair (the memory spine), fail-silent discipline (every hook).
- **Keep if the cost fits:** the per-compaction LLM summary (a metered call, but cheap and high-value), the MCP code-intelligence server.
- **Keep if it matches your workflow:** slash commands and agents you'll actually use, the quality gate (great in a typed repo, noise in a scratch repo), the verification checklist.
- **Opt-in level-ups (Part 7):** add tokf if your commands are loud, cf-approve if permission prompts tax you (and you accept the bill), Chorus if you have a second vendor, claude-deck if you have the hardware.

Leaving something out is a _valid design decision_, not an incomplete harness. A lean, memory-keeping harness on one key is a real, finished harness. Don't carry a piece you won't use — every wired hook is a thing that runs on your events and a thing you have to keep working.

### Integration: where pieces can collide

Two things to watch when you wire multiple pieces into one router:

1. **Event ordering on the same event.** If two hooks both fire on `PostToolUse` (say, the rolling log and the impact-hint), they run in the order you list them. None of yours depend on each other's output, so order is free — but know that the table is ordered, and a hook that _blocks_ (a `Stop`-time gate) should be deliberate about its position.
2. **Shared resources.** Pieces that read the same state file (the MCP store, `lessons.jsonl`) must agree on its shape and path. You built them to — the store shape and lesson format were fixed in Parts 2 and 4 precisely so the pieces compose. Confirm every piece points at the _same_ paths in your assembled `settings.json`.

Neither is hard; both are the kind of thing that silently half-works if you don't check. The checklist below makes you check.

### How the reference does it

The reference harness is exactly this: one `settings.json` (generated from a template by the installer), a folder of hook modules dispatched by a single unified hook, an MCP server registered separately, and a set of commands/agents/skills. It's not a special architecture — it's the same router-plus-pieces shape you're assembling, just with more pieces. Open the reference's `settings.json` to see a fully-populated version of the table you're about to write.

## Build — the assembly checklist

Work through this in your harness directory. Check each box.

**Structure**

- [ ] One directory holds the harness: the hook scripts, an MCP server folder (if you're including it), commands/agents/skills folders (if any), and an installer.
- [ ] One `settings.json` **template** (not a live `settings.json` with your paths baked in) — the installer generates the live file. Secrets and absolute paths live in the _generated_ file or in env, never in the tracked template.

**Router wiring**

- [ ] Every piece you chose has a row in the `settings.json` template: the right event, the right matcher, the right script path.
- [ ] No piece you _didn't_ choose is still wired (no dangling rows pointing at scripts you dropped).
- [ ] Hooks that share an event are listed in an order you've thought about.

**Shared state**

- [ ] Every piece that reads/writes a shared file (MCP store, `lessons.jsonl`, memory dir) points at the same path, and that path is configurable (env or template var), not hardcoded to your home dir.

**Fail-silent (the non-negotiable)**

- [ ] Every hook catches its own errors and exits 0. A broken piece degrades to a no-op; it never kills the session.
- [ ] Every optional dependency (tokf, an MCP tool, an LLM key) is allowed to be missing — its absence is a no-op, not a crash.

**Install**

- [ ] The installer is **idempotent**: running it twice leaves generated config byte-identical (`git diff --exit-code` on generated files is clean after a second run).
- [ ] MCP registration skips cleanly if a server binary is missing.

## Checkpoint

Two observations prove the harness is assembled and live.

**1 — It installs idempotently.** Run your installer twice:

```bash
./install.sh && ./install.sh && git diff --exit-code -- <your-generated-config>
```

✅ **You got it when** the second run changes nothing and `git diff --exit-code` returns 0. A non-idempotent installer fails here — exactly the property you recalled in _Before you start_.

**2 — Every wired hook fires without error.** Start a Claude Code session and exercise the events your pieces hook: submit a prompt (fires `UserPromptSubmit`), edit a file (fires `PostToolUse`), trigger a compaction if you wired memory.

✅ **You got it when** each wired piece produces its expected artifact — a line in the rolling log, a memory file on compaction, a nudge on an imported-file edit — and **nothing throws** (the session runs normally even if an optional piece is a no-op). If a piece is silent when it should act, its row is mis-wired; if the session breaks, a hook isn't fail-silent.

## Recap + next

You composed a harness out of the pieces you chose, wired them into one router, and confirmed it installs idempotently and fires cleanly — leaving out what you won't use, because a lean finished harness beats a bloated one carrying dead rows. The skill here was _judgment and integration_, not new code.

→ **[8.2 — Depersonalize & publish](../8.2-depersonalize-publish/)**: make your harness safe to share — strip secrets and personal data, rotate any key that touched the repo, gitignore runtime files — verified by the same depersonalization check this repo uses on itself. Then design something new against the capstone rubric.
