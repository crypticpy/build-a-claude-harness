# 0.4 — Compatibility and setup check

## Objectives

By the end of this lesson you will be able to:

- **Confirm** Node.js 20+ is installed.
- **Confirm** the `claude` command runs and report its version.
- **Recognize** that hook payload shapes and the `claude mcp` CLI are version-coupled, so a future Claude Code may differ from what this course shows.
- **Answer** the Part 0 self-assessment from memory.

## Time

~3 minutes. One or two commands to run; no code to write.

## Before you start

You'll run a couple of commands in your terminal. That's the only prerequisite — a terminal you can paste into.

## The lesson

### Principle

Every part of this course ends in a **checkpoint you can verify yourself**. A setup check is just the very first one: before you build anything, prove your machine has the two tools the whole course depends on. Two minutes here saves a confusing hour in Part 1 when a hook "doesn't run" only because Node is too old.

### The version this course targets

This course was authored against **Claude Code 2.1.x** and **Node.js 20+**. Those are the moving parts worth naming:

- **Claude Code is versioned and evolves.** Two things in particular are **version-coupled**, meaning a future release could change them:
  - The **hook payload shape** — the JSON fields Claude Code hands your hook on stdin (`session_id`, `tool_name`, `tool_input`, …). The fields this course relies on are stable today, but if a payload field is missing in your version, that's the first place to check.
  - The **`claude mcp` CLI surface** — the commands you'll use in Parts 4 and 6 to register an MCP server (`claude mcp add`, `claude mcp list`). Its flags can shift between releases.
- **Node 20+** is required because the hooks are Node ES modules (`.mjs`) and use modern built-ins. Node 18 will fail in ways that are annoying to diagnose. Node 20, 22, or newer are all fine.

If your Claude Code is much newer than 2.1 and something in a lesson doesn't match exactly, the **reference harness** is the source of truth — it's the working, installed code, and it's kept current.

### How the reference does it

The reference harness doesn't hard-fail on version mismatches; it's built to **degrade gracefully** (the fail-silent design you'll write in Part 1.3). A missing payload field becomes a no-op, not a crash. That's the right posture for version drift — and it's another reason fail-silent is worth the discipline.

### What you build

Nothing. Run the checks below and you're done with Part 0.

### Run the checks

Paste these into your terminal one at a time.

**1. Node is version 20 or higher:**

```bash
node --version
```

You want `v20.x` or higher. If you see `v18` or lower (or "command not found"), install a current Node from [nodejs.org](https://nodejs.org) or via your version manager (`nvm install 20`), then re-run.

**2. Claude Code runs and reports a version:**

```bash
claude --version
```

You want a version string (e.g. `2.1.186 (Claude Code)`). If this errors, Claude Code isn't installed or isn't on your `PATH` — install it before going further.

**3. (Optional) Confirm where your harness will live:**

```bash
echo "$HOME/.claude"
```

This is the directory the installer (Part 6) writes to and where `settings.json` lives. You don't need to create it now — just know that `$HOME` resolves to a real path (it should print something like `/home/you/.claude` or `/Users/you/.claude`). Remember from 0.2: in the _settings file_ the literal text `$HOME` is left alone and expanded by Claude Code at run time — but in your _shell_, `echo` expands it immediately. Same variable, two moments of expansion.

## Checkpoint

You pass this lesson when both required checks succeed:

- `node --version` prints `v20.0.0` or higher.
- `claude --version` prints a version string without erroring.

If both printed cleanly, your machine is ready and **Part 0 is complete**.

## Part 0 self-assessment

One question. Answer it from memory before moving on — if you can, the event model stuck.

> **You want Claude to log every file it edits. Which event do you hook, and why?**

<details>
<summary>Answer</summary>

**`PostToolUse`**, matched to the file-writing tools (`Write|Edit`).

Why: file edits happen _through tools_, and `PostToolUse` fires right after a tool finishes — so that's the moment you know an edit just occurred and can read which file it touched from the payload. You'd narrow it with a matcher of `"Write|Edit"` so the hook only runs for file-writing tools, not every tool. (You'll wire exactly this in Part 1.2, and it becomes the rolling log in Part 2.1.)

If you reached for `UserPromptSubmit` instead: that fires when _you_ submit a prompt, before any tool runs — too early to know what got edited. The "after a tool ran" timing is the whole reason `PostToolUse` is the answer.

</details>

## Recap + next

Your machine is verified (Node 20+, working `claude`), you know which version the course targets and which surfaces drift between versions, and you've recalled the event model under test. That's the entire on-ramp.

Next: **[Part 1 — Foundations](../../01-foundations/)** — you write your first hook and see it work in about 15 minutes.

---

_[← 0.3](../0.3-shallow-tour/) · 0.4 · [Part 1 →](../../01-foundations/)_
