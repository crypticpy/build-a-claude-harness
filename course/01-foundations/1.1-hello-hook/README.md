# 1.1 — Hello, hook

> **Your first win.** In about 15 minutes you'll have a working customization of Claude Code: a tiny script that runs on every prompt and writes a line to a file. Nothing to install but Node. No API key. Proof you can do this.

## Objectives

By the end of this lesson you will be able to:

- **Write** a `UserPromptSubmit` hook that reads the prompt [payload](../../../docs/glossary.md#payload) from [stdin](../../../docs/glossary.md#stdin-and-stdout) and appends a line to a log file.
- **Wire** that hook into `settings.json` so Claude Code runs it on every prompt.
- **Verify** the hook ran by reading the line it appended.

## Time

~15 minutes.

## Before you start

You finished Part 0, so `node --version` is `v20+` and `claude --version` works. One quick confirm:

```bash
node --version   # want v20.x or higher
```

You'll edit one file (`start/hello-hook.mjs`) and paste a small block into `settings.json`. That's the whole job.

## The lesson

### Principle

A hook is **a program that reads JSON on stdin and optionally prints something** (you met this in 0.2). That's the entire contract. The smallest useful hook reads the payload, does one thing, and exits. We're going to write exactly that: read the prompt you submitted, append it to a log file as proof.

This is the atom every later feature is built from. Memory, logging, formatting, quality gates — all of them are this same shape with a more interesting middle.

### Why this matters

Two reasons to start this small. First, **a fast win is real**: you'll have customized Claude Code before any of the harder machinery, which makes the rest of the course feel reachable. Second, the log-a-line pattern _is_ the rolling log of Part 2.1, almost unchanged. You're not building a throwaway — you're building the seed.

### How the reference does it

The reference harness never has a standalone `hello-hook.mjs` — by the time you see it, this logic lives inside the router's `prompt` case and the `rolling-log` module. But the bones are identical: read the payload, append a line, exit 0. In [`reference/hooks/unified/unified-hook.mjs`](../../../reference/hooks/unified/unified-hook.mjs) you can see `readFileSync(0, "utf-8")` to read stdin and `process.exit(0)` to finish — the two moves you'll make here. You're writing the simplest possible version of the real thing.

### What you build

A single file, `hello-hook.mjs`, that:

1. Reads the `UserPromptSubmit` payload from stdin and parses the JSON.
2. Pulls the prompt text out of the payload.
3. Appends a timestamped line to `$HOME/.claude/hello-hook.log`.
4. Prints a one-line confirmation to stdout.
5. Exits 0 — always.

Open [`start/hello-hook.mjs`](start/hello-hook.mjs). The file is complete except for **two marked blanks** (`TODO (1 of 2)` and `TODO (2 of 2)`). You're filling in blanks, not writing from scratch.

- **Blank 1** — the payload field that holds the prompt text. The `UserPromptSubmit` payload names this field after exactly what it holds.
- **Blank 2** — the line to append. It must end in `\n` so each prompt lands on its own line.

If you get stuck on either, diff against [`solution/hello-hook.mjs`](solution/hello-hook.mjs).

### Wire it up

**1. Fill in the two blanks first.** Make sure you've completed `TODO (1 of 2)` and `TODO (2 of 2)` in `start/hello-hook.mjs` before copying — you want to install _your edited file_, not the skeleton with the blanks still in it.

**2. Put the script where Claude Code can find it.** A common spot is `$HOME/.claude/hooks/`:

```bash
mkdir -p "$HOME/.claude/hooks"
cp start/hello-hook.mjs "$HOME/.claude/hooks/hello-hook.mjs"
```

**3. Register it on the `UserPromptSubmit` event.** Open `$HOME/.claude/settings.json` (create it if it doesn't exist) and add the `UserPromptSubmit` block from [`start/settings.snippet.json`](start/settings.snippet.json) into the `hooks` object. The command line is:

```json
"command": "node $HOME/.claude/hooks/hello-hook.mjs"
```

If you **already have** a `settings.json` with a `hooks` object, don't replace the whole file — paste just the `UserPromptSubmit` entry _inside_ the existing `hooks: { }`, and watch for a comma between entries (JSON needs one between siblings, none after the last).

Remember from 0.2: leave the literal `$HOME` in place — Claude Code expands it at run time.

**Confirm you didn't break the file.** A misplaced comma is the most common slip here, and it fails _silently_ — Claude Code just ignores a settings file it can't parse. Check it before restarting:

```bash
node -e "JSON.parse(require('fs').readFileSync(process.env.HOME + '/.claude/settings.json','utf8')); console.log('settings.json is valid JSON ✓')"
```

If it prints the ✓ you're good. If it throws `SyntaxError`, you have a stray (or missing) comma or brace — fix it and re-run before moving on.

**4. Start (or restart) a Claude Code session** so it picks up the new settings, and submit any prompt — `hi` will do.

## Checkpoint

**You can verify this two ways. The offline test proves your code is correct without touching Claude Code; the live test proves the wiring.**

### Offline (proves the code)

Run your edited hook with a fake payload and inspect the log file:

```bash
printf '%s' '{"prompt":"hello from the checkpoint"}' \
  | node "$HOME/.claude/hooks/hello-hook.mjs"

tail -n 1 "$HOME/.claude/hello-hook.log"
```

**Pass:** the command prints `hello-hook: logged your prompt`, and the last line of the log looks like:

```
2026-06-23T05:52:39.313Z  prompt: hello from the checkpoint
```

(Your timestamp will differ; the `prompt: hello from the checkpoint` part must match.) If the line is missing or the prompt text is empty, blank 1 or blank 2 isn't filled in correctly — diff against `solution/`.

### Live (proves the wiring)

First make sure the copy in `$HOME/.claude/hooks/` is your **edited** file (re-copy if you changed it after wiring up):

```bash
cp start/hello-hook.mjs "$HOME/.claude/hooks/hello-hook.mjs"
```

With the hook registered and a fresh session started, submit a prompt in Claude Code, then:

```bash
tail -n 1 "$HOME/.claude/hello-hook.log"
```

**Pass:** the last line shows the prompt you just submitted. That line is your file artifact — concrete proof the hook ran inside a real Claude Code session.

## Recap + next

You wrote a real hook, wired it to an event, and watched it leave a trace on disk. That read-payload-then-append shape is the foundation for everything ahead. You also exited 0 unconditionally without thinking much about it — in 1.3 you'll learn exactly why that one line is load-bearing.

Next: **[1.2 — From two hooks to one router](../1.2-two-hooks-one-router/)** — you'll add a _second_ hook, feel the duplication, and merge both into a single dispatcher.

---

_[← Part 1 home](../README.md) · 1.1 · [1.2 →](../1.2-two-hooks-one-router/)_
