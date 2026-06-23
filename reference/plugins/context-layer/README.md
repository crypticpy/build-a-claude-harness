# context-layer (reference MCP server)

A tiny **MCP server you can read in one sitting**. It gives an agent three
code-intelligence tools backed by a plain JSON file. The whole point of this
reference is to show that:

> An MCP server is just a JSON-RPC loop over stdin/stdout. No SDK required.

There is **no MCP SDK**, **no database**, and **no native modules** here. It is
all Node built-ins plus TypeScript. That means a fresh machine can `npm install`
it without compiling anything native.

## What it does

It indexes a repo into a JSON store, then exposes three (well, four) tools:

| Tool              | Input                      | Returns                                                                        | Teaching point                                        |
| ----------------- | -------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------- |
| `semantic_lookup` | `{ path }` or `{ paths }`  | A file's summary + exported symbols, **not** its bytes                         | Serve a summary instead of raw source to save tokens. |
| `impact_check`    | `{ path }` or `{ symbol }` | The files that import/reference it                                             | "What breaks if I change this?"                       |
| `brain_search`    | `{ query }`                | Matching notes from a persistent "brain", ranked by a simple keyword/tag score | Cross-session memory the model can query.             |
| `brain_remember`  | `{ text, tags? }`          | Appends a note so the brain isn't empty                                        | The write path for that memory.                       |

## How it's built

- `src/mcp-server.ts` — the JSON-RPC 2.0 loop. Reads messages from stdin
  (newline-delimited **or** `Content-Length`-framed — auto-detected per message),
  dispatches `initialize` / `tools/list` / `tools/call`, writes responses to
  stdout. A bad message gets a JSON-RPC error reply; it never kills the loop.
- `src/store.ts` — the JSON-file-backed store: file summaries, an import-edge
  map, and the notes list. Loads once, saves on change.
- `src/indexer.ts` — a small, regex-based, language-tolerant indexer. For each
  source file it records a cheap summary, the exported symbol names, and the
  import edges. No parser dependency — just regex, across TS/JS/Python/Go.
- `src/tools/*.ts` — one file per tool. Each takes the store + parsed args and
  returns a text string.

## Build

```bash
npm install
npm run build      # tsc -> dist/
```

That produces `dist/mcp-server.js` and friends. Node 20+ is required (ESM).

## Index a repo

The store starts empty. Point the indexer at any repo to populate it:

```bash
node dist/mcp-server.js --index /path/to/some/repo
```

This writes the JSON store (see "Where the store lives" below) and prints a
one-line summary to stderr.

## Register it with Claude Code

```bash
claude mcp add context-layer -- node /absolute/path/to/dist/mcp-server.js
```

Use the **absolute** path to the built file. After this, the three tools show up
in Claude Code and the model can call them.

## Where the store lives

By default the store is a single JSON file at `<package-dir>/.store/brain.json`.
Override it with an environment variable:

```bash
export CONTEXT_LAYER_STORE=/some/where/brain.json
```

There is no hardcoded home path — the package is relocatable.

## Try it without a client (smoke test)

You can speak the protocol by hand. Pipe two newline-delimited JSON-RPC
messages in; you get two responses out, then the server exits when stdin closes:

```bash
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
  | node dist/mcp-server.js
```

You should see an `initialize` result (protocol version + serverInfo) followed by
a `tools/list` result describing the tools. That is the entire MCP handshake.
