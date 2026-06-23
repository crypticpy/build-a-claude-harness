# The Event Model

> How the harness gets a chance to run at all. If you understand this one page, every other behavior in the system is just "which script runs on which event." This is the heart of [Principle 2: `settings.json` is the router](principles.md#2-settingsjson-is-the-router).

## The idea in one sentence

Claude Code raises named **events** at fixed moments in a session, and a [hook](glossary.md#hook) is a script you ask it to run when a given event fires. That's the whole mechanism.

You don't poll, you don't run a background daemon, you don't patch Claude Code. You just answer the question: _"when **this** happens, run **that**."_

## The lifecycle events

Here are the events the reference harness attaches to, roughly in the order you meet them in a session:

| Event              | Fires when…                                                                               | The harness uses it to…                                                          |
| ------------------ | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `SessionStart`     | a session opens                                                                           | print a one-shot project snapshot (stack, git, prior memory)                     |
| `UserPromptSubmit` | you press enter on a prompt                                                               | inject extra context — including [re-reading memory](the-memento-pattern.md)     |
| `PreToolUse`       | just **before** a tool runs                                                               | (optional) gate or auto-approve a risky action                                   |
| `PostToolUse`      | just **after** a tool finishes                                                            | format an edited file, log the operation, hint at impact                         |
| `PreCompact`       | just before Claude [compacts](glossary.md#compaction-context-compaction) the conversation | [write memory to disk](the-memento-pattern.md) before it's forgotten             |
| `Stop`             | Claude finishes its turn                                                                  | run [verification gates](glossary.md#verification-gate) (type-check, self-check) |

There are more events than this (Claude Code adds them over time), but these six carry the whole reference harness. You attach to the ones you need and ignore the rest.

## `settings.json` is the router

The mapping from event to script lives in one file. Here's the real wiring from the reference harness's [`settings.template.json`](../reference/settings.template.json) — note that **every event points at the same script**, with a different word at the end:

```jsonc
"hooks": {
  "SessionStart":     [{ "matcher": "*", "hooks": [{ "type": "command",
    "command": "node $HOME/.claude/hooks/unified/unified-hook.mjs session-start" }] }],
  "UserPromptSubmit": [{ "matcher": "*", "hooks": [{ "type": "command",
    "command": "node $HOME/.claude/hooks/unified/unified-hook.mjs prompt" }] }],
  "PreCompact":       [{ "matcher": "*", "hooks": [{ "type": "command",
    "command": "node $HOME/.claude/hooks/unified/unified-hook.mjs precompact" }] }],
  "PostToolUse":      [{ "matcher": "Write|Edit", "hooks": [{ "type": "command",
    "command": "node $HOME/.claude/hooks/unified/unified-hook.mjs post-edit" }] },
                       { "matcher": "*",          "hooks": [{ "type": "command",
    "command": "node $HOME/.claude/hooks/unified/unified-hook.mjs post-tool" }] }],
  "Stop":             [{ "matcher": "*", "hooks": [{ "type": "command",
    "command": "node $HOME/.claude/hooks/unified/unified-hook.mjs stop" }] }]
}
```

Two things to notice:

- **`matcher`** narrows _which_ tool an event applies to. `"*"` means "any tool"; `"Write|Edit"` means "only file edits." That's why `PostToolUse` has **two** rows — one special branch for edits, one catch-all for everything else.
- The last argument (`session-start`, `prompt`, `precompact`, …) is the **event name**, passed to the script so it knows which branch to run. It's not magic; it's just `argv`.

To read any behavior, find its row. To change one, change its line. There's no framework hiding between the event and the script — `settings.json` _is_ the system.

## How a hook actually receives its event

When an event fires, Claude Code runs your command and hands it the event two ways at once:

1. **The event name arrives as a command-line argument** (`process.argv[2]`) — the `prompt` / `precompact` / `stop` word above.
2. **The event payload arrives as JSON on [stdin](glossary.md#nodejs-and-esm--mjs)** — the session id, the transcript path, the tool name and its inputs, and so on. Your script reads stdin and `JSON.parse`s it.

Anything your script prints to **stdout** is fed back to the model as extra context for that event. That's the entire contract: read the arg, read stdin, optionally print something. The reference router opens exactly like this:

```js
const input = readFileSync(0, "utf-8"); // the payload, from stdin
const event = input ? JSON.parse(input) : {};
const eventType = process.argv[2]; // the event name, from the arg
```

## One script, many events: the "unified hook"

You could write one tiny script per event. The reference harness instead points _every_ event at a single file — [`reference/hooks/unified/unified-hook.mjs`](../reference/hooks/unified/unified-hook.mjs) — that `switch`es on the event name and dispatches to the right module:

```js
switch (eventType) {
  case "session-start":
    /* project snapshot */ break;
  case "prompt":
    /* inject memory + context */ break;
  case "precompact":
    /* write memory to disk */ break;
  case "post-edit":
    /* format + log + impact hint */ break;
  case "stop":
    /* verification gates */ break;
}
```

Why one file instead of six? Two reasons, both worth keeping:

- **Lazy loading.** Each branch only `import()`s the modules it needs, so a `prompt` event never pays to parse the retrospective code.
- **[Fail-silent](glossary.md#fail-silent--graceful-degradation) by construction** ([Principle 3](principles.md#3-fail-silent)). Every branch is wrapped so a thrown error, a missing file, or an unset API key becomes a no-op — the script always `exit(0)`s and never blocks your turn. A customization that crashes your session is worse than no customization.

## Where this shows up

- **Course [Part 0: Orientation](../course/00-orientation/)** — the shallow tour that introduces these events as the skeleton everything hangs on.
- **Course [Part 1: Foundations](../course/01-foundations/)** — you build "Hello, hook" against `UserPromptSubmit`, then meet the event loop and fail-silent design directly.
- **Reference:** the router [`hooks/unified/unified-hook.mjs`](../reference/hooks/unified/unified-hook.mjs) and the wiring in [`settings.template.json`](../reference/settings.template.json).
- **Next idea:** what the `PreCompact` and `UserPromptSubmit` branches actually do — [the Memento pattern](the-memento-pattern.md).

---

_[docs index](README.md) · [glossary](glossary.md) · [principles](principles.md)_
