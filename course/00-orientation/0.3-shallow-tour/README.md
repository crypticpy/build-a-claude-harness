# 0.3 — A shallow tour of `reference/`

## Objectives

By the end of this lesson you will be able to:

- **Locate** the reference harness's router file and recognize it as the one piece you've already met.
- **Name** the rough job of each top-level area of `reference/` without reading its code.
- **Resist** the urge to understand everything — and know which one file to anchor on.

## Time

~5 minutes. Reading and clicking around — no code.

## Before you start

Open the [reference harness README](../../../reference/README.md) in another tab. This lesson is a guided skim of it; you'll click into one file and out again.

## The lesson

### Principle

The fastest way to feel lost is to open a finished codebase and try to understand it linearly, top to bottom. The fastest way to _not_ feel lost is to open it knowing **exactly one thing to look for** and treating everything else as "I'll meet you later."

Your one thing is the **router**. You already know what it is from 0.2. Everything else on this tour, you are allowed — encouraged — to not understand yet.

### The map of `reference/`

Here's the shape of the finished harness. Read the right column; skip the rest for now.

```
reference/
├── hooks/unified/
│   ├── unified-hook.mjs    ← THE ROUTER. This is your anchor. Start here.
│   ├── modules/            ← one file per job (memory, logging, formatting…)
│   ├── config.json         ← the cost/behavior knobs the modules read
│   └── skill-rules.json    ← which prompts suggest which skill (Part 3)
├── commands/               ← slash commands like /plan (Part 3)
├── skills/                 ← an example skill (Part 3)
├── agents/                 ← example review sub-agents (Part 3)
├── plugins/context-layer/  ← the MCP code-intelligence server (Part 4)
├── settings.template.json  ← the event → script wiring you saw in 0.2
├── mcp-servers.json        ← MCP registration manifest (Part 6)
└── install.sh              ← the idempotent installer (Part 6)
```

That's the entire harness. Notice the right column is basically the table of contents for the rest of the course — each area gets its own part. You are not behind for not knowing what an "MCP server" is. You'll build one in Part 4.

### Anchor on one file

Open **[`reference/hooks/unified/unified-hook.mjs`](../../../reference/hooks/unified/unified-hook.mjs)** now. Don't read it closely. Just scroll it once and find the part that looks like this (it's a `switch` statement maybe a third of the way down):

```js
switch (eventType) {
  case "session-start": {
    /* … */ break;
  }
  case "prompt": {
    /* … */ break;
  }
  case "precompact": {
    /* … */ break;
  }
  case "post-edit": {
    /* … */ break;
  }
  case "stop": {
    /* … */ break;
  }
  // …
}
```

**That's the router you learned about in 0.2.** `eventType` is the last word from the `settings.json` command line (`prompt`, `post-edit`, …). Each `case` is one event's branch. This single `switch` is the spine of the whole harness — every feature you build hangs off one of these cases.

Two details you can notice now and fully understand later:

- Near the top of the file, there's a comment about **"FAIL SILENT"** and a `process.exit(0)`. That's the discipline you'll build in Part 1.3 — a broken hook must never block your turn.
- Each `case` calls `loadModule(...)` and then `import()`s a file from `modules/`. That's **lazy loading** — a `prompt` event never pays to load the code for compaction. You'll see why that matters when the modules get expensive.

Everything else in that file — the `Promise.all`s, the specific module names — is detail you'll meet one part at a time. Close it. You've found your anchor.

### How the reference does it (and how you'll get there)

The reference harness looks like a lot because it's _finished_. The course builds it the opposite way: one tiny piece at a time, each piece verifiable on its own. By the end of Part 1 you'll have written a baby version of that exact `switch`. By Part 4 you'll have a working subset of the whole map above — what the course calls the **Minimum Viable Harness**.

So when this tour feels overwhelming: that's expected, and it's temporary. You're looking at the destination, not the road.

### What you build

Nothing. You located the router and gave every other area a name. That's the whole job.

## Checkpoint

A knowledge checkpoint:

1. Without scrolling up, what is the full path of the router file inside `reference/`?
2. In that file's `switch (eventType)`, what does each `case` correspond to?
3. Name two areas of `reference/` you were told you'll build in a _later_ part (you don't need to know what they do).

Passing answers: (1) `hooks/unified/unified-hook.mjs`. (2) one Claude Code lifecycle event (the name passed by `settings.json`). (3) any two of: `plugins/context-layer/` (Part 4), `commands/` or `skills/` or `agents/` (Part 3), `install.sh` (Part 6).

## Recap + next

You skimmed the finished harness, named each area, and anchored hard on the one file that ties it together — the router. You also spotted, in passing, the two ideas (fail-silent, lazy loading) you'll build deliberately later.

Next: **[0.4 — Compatibility and setup check](../0.4-setup-check/)** — a two-minute check that your machine is ready, then the Part 0 self-assessment.

---

_[← 0.2](../0.2-event-model-and-router/) · 0.3 · [0.4 →](../0.4-setup-check/)_
