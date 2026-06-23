# 0.2 — The event model and the router

## Objectives

By the end of this lesson you will be able to:

- **Name** the four Claude Code lifecycle events this course uses most, and the moment each one fires.
- **Read** a `settings.json` hook block and say which script runs on which event.
- **Explain** the one router pattern — one script, many events — that the reference harness uses everywhere.

## Time

~7 minutes. Reading only — no code.

## Before you start

Nothing to set up. Keep [The event model](../../../docs/the-event-model.md) open if you want the full list of events and their payload fields — this lesson covers just the ones you'll actually use.

## The lesson

### Principle

Claude Code runs through a **lifecycle**. As you work, it passes through named moments — a session starts, you submit a prompt, a tool runs, the context window fills up, Claude finishes its turn. At each of those moments, Claude Code can run a script you provide. Those moments are called **hook events**, and the scripts are called **hooks**.

The contract is dead simple, and it's the same for every event:

1. Claude Code reaches a moment (say, you submit a prompt).
2. It runs the command you registered for that event.
3. It hands the command a **JSON payload on standard input** describing what just happened.
4. Whatever your command **prints to standard output** gets surfaced back — for some events, as extra context for the model.
5. Your command exits. (As you'll see in Part 1.3, it should _always_ exit with status 0 — success — so a bug in your hook can never block your turn.)

That's the whole model. A hook is just "a program that reads JSON on stdin and optionally prints something."

### The events you'll use most

There are more events than this, but these four carry the course:

| Event              | Fires when…                                  | You'll use it for…                             |
| ------------------ | -------------------------------------------- | ---------------------------------------------- |
| `UserPromptSubmit` | you hit enter on a prompt                    | injecting context (memory, reminders)          |
| `PostToolUse`      | Claude finishes running a tool (e.g. `Edit`) | logging what changed, auto-formatting a file   |
| `PreCompact`       | the context window is about to be compacted  | writing memory to disk _before_ it's forgotten |
| `Stop`             | Claude finishes its turn                     | running quality gates before "done"            |

Notice how these line up with Part 0.1. `PreCompact` is the moment the Memento pattern hooks into. `UserPromptSubmit` is where the saved memory gets read back. You're already seeing the shape of Part 2.

> **Self-assessment preview:** "You want Claude to log every file it edits — which event, and why?" Hold that question; you'll answer it at the end of 0.4. (Hint: it's in the table above.)

### How events map to scripts: `settings.json`

You tell Claude Code "run _this_ script on _that_ event" in a file called `settings.json` (it lives in `$HOME/.claude/`). The hooks section is a map from event name to command. Here's a trimmed version of what the reference harness installs:

```jsonc
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "node $HOME/.claude/hooks/unified/unified-hook.mjs prompt",
          },
        ],
      },
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "node $HOME/.claude/hooks/unified/unified-hook.mjs post-edit",
          },
        ],
      },
    ],
  },
}
```

Read it top to bottom: on `UserPromptSubmit`, for any tool (`matcher: "*"`), run `node …/unified-hook.mjs prompt`. On `PostToolUse`, but _only_ when the tool was `Write` or `Edit` (`matcher: "Write|Edit"`), run the same file with the argument `post-edit`.

Two things to notice, because they're easy to trip on:

- **The `matcher`** filters _which_ tool fires `PostToolUse`. `"Write|Edit"` means "only file-writing tools." `"*"` means "everything."
- **The last word on each `command` line** (`prompt`, `post-edit`) is an argument _you_ chose. It's how a single script knows which event invoked it. That's the router, which is the next section.

### The router pattern: one script, many events

Look again at those two commands. They both call the **same file** — `unified-hook.mjs` — just with a different last argument. That is the central design choice of the reference harness, and you'll build it yourself in Part 1.2:

> **A router (or _dispatcher_) is one script that handles many events by branching on the event name it was passed.**

Instead of fifteen little scripts scattered across `settings.json`, there's one entry point. Claude Code passes the event name as an argument (`prompt`, `post-edit`, …); the script reads that argument and runs the right branch. One place to find everything, one place to fix a bug, one set of shared helpers.

You don't need to understand the reference router's internals today. You just need the picture: **`settings.json` says which events call the router and what name to pass; the router decides what to actually do.** That's the file you'll anchor on in the next lesson's tour.

### The gotcha worth knowing now: `$HOME` is expanded by Claude Code, not the installer

See `$HOME` in those command strings? When the harness installs itself (Part 6), it copies `settings.json` into place **verbatim** — it does _not_ substitute `$HOME` with your actual home path. The literal text `$HOME/.claude/hooks/...` is what ends up in the file.

That works because **Claude Code expands `$HOME` itself** when it runs the hook command, at hook-execution time. The installer stays dumb; the expansion happens later, in the right place.

Why flag this in Part 0? Because it's a classic confusion: people open their installed `settings.json`, see a literal `$HOME`, assume the installer is broken, and "fix" it by hardcoding a path — which then breaks portability. It's not broken. Leave the `$HOME`. (This is also why none of the code in this course hardcodes a home directory — we always use `$HOME` or Node's `os.homedir()`.)

### What you build

Nothing yet. You now have the vocabulary — _event_, _hook_, _matcher_, _router/dispatcher_, _payload on stdin_ — that the rest of the course assumes.

## Checkpoint

A knowledge checkpoint. Answer these from memory:

1. Which event fires when you submit a prompt? When Claude finishes editing a file? When the window is about to compact?
2. In the `settings.json` snippet above, what does the word `post-edit` at the end of the command line do?
3. In one sentence: what is a router?

Passing answers: (1) `UserPromptSubmit`, `PostToolUse`, `PreCompact`. (2) It's the argument that tells the single `unified-hook.mjs` script _which_ event invoked it. (3) "One script that handles many events by branching on the event name."

## Recap + next

You learned the event model (Claude Code runs your script at named lifecycle moments, handing it JSON on stdin), how `settings.json` wires events to scripts, and the router pattern that lets one file serve every event. You also learned not to "fix" the `$HOME` in an installed settings file.

Next: **[0.3 — A shallow tour of `reference/`](../0.3-shallow-tour/)** — we'll walk past the finished harness and you'll spot the router in the wild.

---

_[← 0.1](../0.1-what-and-why/) · 0.2 · [0.3 →](../0.3-shallow-tour/)_
