# 4.2 — `semantic_lookup` (+ register) → the MVH is complete

In 4.1 your server had a working loop but only toy tools. Now you give it a tool that answers a real question about your _own_ repo — **"what is this file, and what does it export?"** — from a JSON index, returning a distilled summary instead of raw source. Then you **register the server with Claude Code** so the model can call it. When that works, you've finished the [Minimum Viable Harness](../../../docs/glossary.md#mvh-minimum-viable-harness).

> 🏔️ **This lesson completes the MVH.** A memory-keeping (Part 2), self-logging (Part 2), workflow-aware (Part 3), now **code-aware** harness — all on one LLM key. After this you _could_ stop and have a genuinely useful harness. (You won't want to — but you could.)

## Objectives

By the end, you will be able to:

- **Index** a repo into a plain JSON store (no database, no native modules) with the `--index` side-door.
- **Implement** `semantic_lookup` so it returns a file's _summary + symbols_, **never** its bytes.
- **Register** the server with `claude mcp add` and confirm it via `claude mcp list`.
- **Add** a second tool, `impact_check`, on the exact same registry pattern, and prove it finds a real importer.

Each objective maps to the Checkpoint below.

## Time

35–45 minutes.

## Before you start

> 🧠 **No peeking (recall from 4.1):** An MCP server reads a message, looks at one field to decide what to do, and writes a reply. What is that field called, and what are the three methods your `switch` handles?
>
> <details><summary>Answer</summary>The field is <code>method</code>. The three methods are <code>initialize</code> (handshake), <code>tools/list</code> (advertise tools), and <code>tools/call</code> (run one). Your <code>switch</code> dispatches on <code>req.method</code>; a bad message gets an error reply and the loop keeps going.</details>

Confirm 4.1's checkpoint still passes — your loop answers `initialize` and `tools/list`. Then copy this lesson's `start/` and install:

```bash
cp -r start my-mcp && cd my-mcp
npm install
```

This `start/` already contains the finished **loop, store, and indexer** from 4.1 plus new code. You only fill two small blanks — one per tool.

## The lesson

### Principle: distilled intelligence over raw bytes

Here is the move that makes an MCP server worth building. When the model asks "what does `store.ts` do and what does it export?", the expensive answer is to dump all 120 lines into [context](../../../docs/glossary.md#context-window-or-context) and let the model read them. The cheap answer is to hand back a one-line **summary** and the list of **exported [symbols](../../../docs/glossary.md#symbol--impact)** — computed once, at index time, by plain code. That's [Principle 5: distilled intelligence over raw bytes](../../../docs/principles.md#5-distilled-intelligence-over-raw-bytes), and it's the single biggest quality upgrade in the whole harness. Same question, a fraction of the tokens, and the answer isn't buried.

You'll see this concretely: the JSON store holds **no source at all** — only summaries, symbol names, and import edges. There are no bytes to leak because none were ever stored.

### Three pieces, two of them already done

Your `start/` ships three supporting files complete; you don't edit them, but know what they do:

- **`store.ts`** — the JSON-file store. Same shape as the [reference](../../../reference/plugins/context-layer/src/store.ts): `{ root, files, imports, brain }`. Loads once, saves atomically. No SQLite, so `npm install` never compiles anything.
- **`indexer.ts`** — a regex indexer. For each source file it records a cheap **summary** (leading comment/docstring), the **exported symbols**, and the **import edges**. Not a real parser — regex, dependency-free, TS/JS/Python.
- **`mcp-server.ts`** — the 4.1 loop, now with a real tool registry and a `--index` CLI side-door.

### How the reference does it

The reference's `semantic_lookup` ([`reference/plugins/context-layer/src/tools/semantic-lookup.ts`](../../../reference/plugins/context-layer/src/tools/semantic-lookup.ts)) does exactly what you're about to: match the requested path against indexed keys, then return `{ summary, symbols }` — and pointedly **not** the file. The reference adds Go support and grouped-import parsing in its indexer; yours is trimmed to stay readable. The tool surface is identical.

### Build — tool 1: `semantic_lookup`

Open `start/src/tools/semantic-lookup.ts`. The path-matching is done. The **one blank** is the result object: return `path`, `found: true`, the `summary`, and the `symbols` from the indexed `entry`. (The hint is right there.) That blank is the principle in one line — serve the distilled answer, not the source.

```bash
npm run build
```

Index this lesson's tiny sample repo into the store, then call the tool by hand:

```bash
node dist/mcp-server.js --index ../fixtures/sample-repo

printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"semantic_lookup","arguments":{"path":"src/logger.ts"}}}' \
  | node dist/mcp-server.js
```

The `text` in the reply should be a JSON blob whose `results[0]` has the **summary and `["log","LEVELS"]`** — and **no source code**. Compare against [`fixtures/expected-semantic-lookup.json`](fixtures/expected-semantic-lookup.json).

### Register it with Claude Code

> ℹ️ **`claude mcp add` and `claude mcp list` are built-in Claude Code commands** — not code you write. They register your server in Claude Code's own config. So if registration errors out, it's a Claude Code / path issue, not a bug in the server you just built (which the `printf` drive above already proved works).

A tool you can only drive with `printf` isn't much use. Register the **built** server so Claude Code can call it. Use the **absolute path** to `dist/mcp-server.js`:

```bash
claude mcp add my-context-layer -- node "$(pwd)/dist/mcp-server.js"
```

That's the same command the [reference README](../../../reference/plugins/context-layer/README.md) uses, just with your server's name. Now Claude Code knows to launch your server and offer its tools. (To point the store somewhere specific, set `CONTEXT_LAYER_STORE` — otherwise it lives at `<package>/.store/brain.json`.)

> 🎉 **The payoff:** in a Claude Code session in an indexed repo, ask _"use semantic_lookup on src/logger.ts"_ — the model calls your server and gets back the summary + exports, never the file. That's distilled code intelligence, served by code you wrote.

### Build — tool 2: `impact_check` (same pattern, second tool)

The registry pattern is proven, so the second tool is fast. `impact_check` answers **"what breaks if I change this?"** by scanning the import-edge map for files that depend on a target.

Open `start/src/tools/impact-check.ts`. The directory-aware resolver (`importRefersToPath`) and the symbol mode are done. The **one blank** is the path-mode loop: for each file, if any of its imports resolves to the target, it's a consumer — push it. Use the helper. Rebuild:

```bash
npm run build && node dist/mcp-server.js --index ../fixtures/sample-repo
```

## Checkpoint

Three things prove this lesson. **(1) Registration**, **(2) a summary (not bytes)**, **(3) a real importer found.**

**1 — The server is registered:**

```bash
claude mcp list
```

✅ `my-context-layer` appears in the list. (That's the MVH milestone — the model can now reach your code intelligence.)

**2 + 3 — Both tools answer correctly.** **Rebuild first** (you just edited `src/tools/impact-check.ts` — `node` runs the compiled `dist/`, so a stale build returns empty `consumers` and looks like your edit failed), re-index, then drive both tools plus a deliberately broken line:

```bash
npm run build && node dist/mcp-server.js --index ../fixtures/sample-repo
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"semantic_lookup","arguments":{"path":"src/logger.ts"}}}' \
  'broken line' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"impact_check","arguments":{"path":"src/logger.ts"}}}' \
  | node dist/mcp-server.js
```

✅ **You got it when:**

- `id:1` → `semantic_lookup` returns the **summary + `["log","LEVELS"]`** and **no source bytes** (matches [`fixtures/expected-semantic-lookup.json`](fixtures/expected-semantic-lookup.json)). If you see source code, you returned the file instead of the entry — re-check blank 1.
- the broken line → an `error` reply, and the loop keeps going (the next reply still comes).
- `id:2` → `impact_check` reports `consumers: ["src/app.ts"]` (matches [`fixtures/expected-impact-check.json`](fixtures/expected-impact-check.json)) — it found the file that imports the logger, with no test run. If `consumers` is empty, blank 2 isn't filled.

## Recap + next

You completed the MVH. Your harness now serves **distilled code intelligence**: `semantic_lookup` hands back a file's summary and exports instead of its bytes, `impact_check` computes a change's blast radius from an import graph — both for free in tokens, because plain code did the work. And it's registered, so the model can actually call it.

Next, **[4.3 — the brain + impact-hint](../4.3-brain-and-impact-hint/)** adds the last two pieces: a `brain_search` tool over your accumulated `lessons.jsonl`, and a `PostToolUse` hook that _nudges_ the model to run `impact_check` right when it edits an imported file. That's the MVH growing its first reflexes.
