# MCP in Plain Terms

> [MCP](glossary.md#mcp-model-context-protocol) sounds like a heavyweight spec. It isn't. This page strips the jargon down to the one sentence that matters, then shows the whole thing fits on a page.

## What MCP actually is

> **An MCP server is a tool server the model can call** — a small program that exposes a few functions ("tools"), which Claude Code can discover and invoke during a session.

That's it. Where a [skill or command](commands-skills-agents.md) is instructions for the model, an MCP server is _running code_ the model can ask to do something — look up a file's summary, list what depends on a function, search your notes. The model asks; the server answers. (Tools are the part we use. MCP servers can also expose data **resources** and reusable **prompts** — a code-intelligence server just needs tools.)

## "Just a JSON-RPC loop over stdin/stdout"

Under the hood of a local (**stdio**) server like the one we build, there's no framework and no network server. It's a loop:

1. Read a message from [stdin](glossary.md#stdin-and-stdout).
2. Look at the message's `method` (the name of what's being asked).
3. Do the thing, write an answer to stdout.
4. Repeat.

(MCP also defines remote transports — HTTP, SSE, WebSocket — for servers that run as a network service. We use the simplest one, **stdio**: a loop over standard in/out, no network involved.)

The format of those messages is **JSON-RPC**. Here is what that means:

> **JSON-RPC** is a tiny convention for "call a function in another program by sending it JSON." You send `{ "method": "the function name", "params": {…the arguments…}, "id": 7 }`; you get back `{ "id": 7, "result": {…} }` (or an `error`). The `id` just lets you match each answer to its question. That's the entire idea — a function call, mailed as JSON.

Claude Code is the **client** (it sends the requests); your MCP server is the **server** (it answers). The whole conversation is JSON objects passed back and forth over a pipe.

## Our whole server is three methods

The reference server, [`reference/plugins/context-layer/src/mcp-server.ts`](../reference/plugins/context-layer/src/mcp-server.ts), is **hand-rolled — no SDK** — precisely to show how little there is to it. It implements just three methods:

| Method       | The client is asking…                    | The server replies with…                        |
| ------------ | ---------------------------------------- | ----------------------------------------------- |
| `initialize` | "Hello — what version, what can you do?" | protocol version + capabilities + server name   |
| `tools/list` | "What tools do you have?"                | each tool's name, description, and input schema |
| `tools/call` | "Run _this_ tool with _these_ args."     | the tool's text result                          |

MCP itself is larger — it also defines **resources** (data you `@`-mention) and **prompts** (that surface as `/`-commands), plus housekeeping like `ping`. We implement only the `tools/*` slice because that's all a code-intelligence server needs.

The dispatch is a plain `switch` on `req.method` — read a request, match the method, write a JSON-RPC reply. A bad message gets an error reply and the loop keeps going; nothing crashes it. If you've read [the event model](the-event-model.md), this will feel familiar: it's the same "read input, dispatch by name, write output" shape, just over a long-lived pipe instead of one event.

## Why feed a summary, not the file

This is what makes an MCP server worth building. The reference server's tools don't return raw source — they return **distilled intelligence** ([Principle 5](principles.md#5-distilled-intelligence-over-raw-bytes)):

- **`semantic_lookup`** → a file's stored _summary_ and its exported [symbols](glossary.md#symbol--impact), **without** the file's contents.
- **`impact_check`** → the list of downstream consumers (what would break if you change this), **without** reading every file by hand.
- **`brain_search` / `brain_remember`** → recall and record cross-session notes — a persistent memory the model can query.

Why is that better than just handing the model the file? Because raw bytes are expensive and noisy. Dumping a 600-line file to answer "what does this do and what depends on it?" burns [tokens](glossary.md#token) and buries the answer. A small program that has already _indexed_ the repo can hand back the processed answer — purpose, exports, dependents — in a fraction of the [context](glossary.md#context-window-or-context). You're trading a big dump of source for a small, precise answer. That single move — distilled answers over raw files — is described by the reference docs as the biggest quality upgrade in the whole harness.

## When to reach for an MCP server

Reach for an MCP server when the model keeps needing the _same kind of processed answer_ about your codebase or data — "summarize this file," "what calls this?", "what did we decide last week?" Anything you'd rather compute once and serve cheaply, instead of re-deriving from raw files every time, is a candidate for a tool.

## Where this shows up

- **Course [Part 4: Code intelligence (MCP)](../course/04-mcp/)** — the hard-but-worth-it climb: you build a minimal server with `semantic_lookup`, `impact_check`, and a brain. It's the last piece of the [Minimum Viable Harness](glossary.md#mvh-minimum-viable-harness).
- **Reference:** the hand-rolled server in [`reference/plugins/context-layer/src/mcp-server.ts`](../reference/plugins/context-layer/src/mcp-server.ts).
- **The principle this embodies:** [distilled intelligence over raw bytes](principles.md#5-distilled-intelligence-over-raw-bytes). **A note on cost:** these answers are computed by plain code, not an LLM, so they're [free in tokens](where-to-spend-tokens.md) at call time.

---

_[docs index](README.md) · [glossary](glossary.md) · [principles](principles.md)_
