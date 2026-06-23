# 4.1 — What an MCP server is (the JSON-RPC loop)

[MCP](../../../docs/glossary.md#mcp-model-context-protocol) has a reputation for being heavy. It isn't. By the end of this lesson you'll have written a working MCP server — the whole thing — and seen that it's **a loop that reads JSON from stdin and writes JSON to stdout.** No framework, no network server, no SDK. If you've built the Part 1 [router](../../01-foundations/), this will feel familiar: read input, dispatch by name, write output.

> 🧗 **You're at the cliff.** This is the part that introduces [TypeScript](../../../docs/glossary.md#typescript) and MCP at the same time — so the `start/` here is heavily scaffolded. You are filling in **two blanks**, not writing a server from scratch. The landing page ([../README.md](../README.md)) shows the payoff and why it's worth it.

## Objectives

By the end, you will be able to:

- **Build** a stdin/stdout JSON-RPC loop that survives a malformed message without crashing.
- **Implement** the three MCP methods — `initialize`, `tools/list`, `tools/call` — as a plain `switch`.
- **Prove** the server speaks the protocol by driving it with four lines of JSON by hand.

Each objective maps to the Checkpoint below.

## Time

25–35 minutes. (Add 10 if TypeScript or `tsc` are new — you don't write much TS here, but you do compile it once.)

## Before you start

> 🧠 **No peeking (recall from Part 3):** You have three ways to extend Claude Code — a slash command, a skill, and a sub-agent. Which one is _running code the model can call mid-task_, as opposed to instructions the model reads?
>
> <details><summary>Answer</summary>None of those three, actually — that's the gap Part 4 fills. A command and a skill are <i>instructions</i> (text the model reads); a sub-agent runs the <i>same</i> model in a clean context. An <b>MCP server</b> is the missing fourth thing: a separate program exposing <i>functions the model can invoke</i> and getting real computed answers back. That's what you build now.</details>

> 🆕 **One-minute [TypeScript](../../../docs/glossary.md#typescript) primer (the course was all `.mjs` until now).** TypeScript adds type annotations to JavaScript. `arg: string` means "arg is text"; `: void` means "returns nothing"; `interface X { … }` names a shape. The compiler checks these; otherwise treat them as documentation — skim the types, focus on the logic.

Confirm your toolchain. You need Node 20+ and the ability to compile TypeScript:

```bash
node --version          # expect v20 or higher
```

📖 **Read alongside:** [MCP in plain terms](../../../docs/mcp-in-plain-terms.md) — the one-page version of everything below.

Then copy this lesson's `start/` folder somewhere you can edit it, and install the one dev dependency (the TypeScript compiler):

```bash
cp -r start my-mcp && cd my-mcp
npm install            # installs typescript + @types/node, nothing native
```

## The lesson

### Principle: an MCP server is a JSON-RPC loop over stdin/stdout

Strip away the name and an [MCP server](../../../docs/glossary.md#mcp-model-context-protocol) is a small program that:

1. **Reads** a message from [stdin](../../../docs/glossary.md#stdin-and-stdout).
2. **Looks at** the message's `method` — the name of what's being asked.
3. **Does the thing** and writes an answer to [stdout](../../../docs/glossary.md#stdin-and-stdout).
4. **Repeats.**

The messages are **JSON-RPC**: you receive `{ "method": "...", "params": {…}, "id": 7 }` and reply `{ "id": 7, "result": {…} }` (or `{ "id": 7, "error": {…} }`). The `id` just matches each answer to its question. That's the entire idea — a function call, mailed as JSON. Claude Code is the **client** (it sends requests); your server is the **server** (it answers).

### Why only three methods

The whole protocol surface you need is three methods:

| Method       | The client asks…                         | You reply with…                                 |
| ------------ | ---------------------------------------- | ----------------------------------------------- |
| `initialize` | "Hello — what version, what can you do?" | protocol version + capabilities + server name   |
| `tools/list` | "What tools do you have?"                | each tool's name, description, and input schema |
| `tools/call` | "Run _this_ tool with _these_ args."     | the tool's text result                          |

Dispatch is a plain `switch` on `req.method`. A bad message gets an error reply and the loop keeps going — **nothing crashes it.** That robustness rule is not optional: this server runs for the whole session, and one malformed line must never take it down.

### How the reference does it

The reference server, [`reference/plugins/context-layer/src/mcp-server.ts`](../../../reference/plugins/context-layer/src/mcp-server.ts), is **hand-rolled — no SDK** — for exactly this reason: to show how little there is. It implements the same three methods with the same `switch`. The one thing it does that we skip: it also reads LSP-style `Content-Length`-framed messages (some clients send those). We only do **newline-delimited JSON** — one message per line — because it's easier to read and you can test it with `printf`. The dispatch logic is identical.

### Build

Open `start/src/mcp-server.ts`. Read it top to bottom — most of it is done. The two blanks are both inside `handleRequest()`, and they are the two places **the tool registry meets the protocol**:

1. **Blank 1 (`tools/list`):** turn the `TOOLS` array into the list the client expects — each tool's `name`, `description`, and `inputSchema`, but **not** its handler (the client never sees your code).
2. **Blank 2 (`tools/call`):** run the matched tool's handler with the call's arguments, and return its text.

The two placeholder tools (`echo`, `add`) are intentionally trivial — they exist only to prove the call path works. In 4.2 you replace them with real code-intelligence tools; this loop won't change.

Compile it:

```bash
npm run build          # runs tsc -> dist/mcp-server.js
```

`tsc` will compile even before you fill the blanks (the placeholders are valid TypeScript) — but `tools/list` will return an empty list and `tools/call` will return empty text until you do. The Checkpoint is how you know they're filled correctly.

## Checkpoint

Drive the compiled server by hand. Pipe four newline-delimited messages in — an `initialize`, a deliberately **broken** line, a `tools/list`, and a `tools/call` — and read the four replies out:

> **Rebuild first.** Unlike the `.mjs` lessons in Parts 0–2, `.ts` doesn't run directly — `node` runs the compiled `dist/`. After editing `src/mcp-server.ts`, run `npm run build` or you'll drive a stale build and think your edit failed.

```bash
npm run build
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' \
  'not json at all' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
  '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"add","arguments":{"a":2,"b":40}}}' \
  | node dist/mcp-server.js
```

✅ **You got it when** you see **four** replies, in order:

1. `id:1` → a `result` with `serverInfo.name` = `"my-context-layer"` and a `protocolVersion`.
2. `id:null` → an `error` with `code: -32700` ("Parse error") — **the broken line did not crash the loop; it answered and moved on.**
3. `id:2` → a `result` whose `tools` array lists **both** `echo` and `add` with their schemas. (If this is `[]`, blank 1 isn't filled.)
4. `id:3` → a `result` with `content: [{ "type": "text", "text": "42" }]`. (If the text is `""`, blank 2 isn't filled.)

> **Seeing `[]` or `""` even though you filled the blanks?** You're almost certainly driving a stale build — `node` ran the old `dist/`. Re-run `npm run build`, then the checkpoint command again. Only if it's _still_ empty after a fresh build is the blank actually unfilled.

That sequence — handshake, survive garbage, list tools, run a tool — is the entire MCP server contract. Compare against [`solution/src/mcp-server.ts`](solution/src/mcp-server.ts) if any reply is off.

## Recap + next

You built a real MCP server: a JSON-RPC loop with three methods and a tool registry, robust against bad input. The two placeholder tools prove the wiring; they don't do anything useful yet.

Next, **[4.2 — `semantic_lookup` (+ register)](../4.2-semantic-lookup/)** replaces those placeholders with a tool that answers questions about your _own_ repo from a JSON index, then registers the server with Claude Code via `claude mcp add`. **That lesson completes the Minimum Viable Harness.**
