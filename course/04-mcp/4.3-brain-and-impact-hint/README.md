# 4.3 — The brain + the impact-hint (MVH+)

You finished the MVH in 4.2. This lesson adds two reflexes on top of it. First, a **brain**: a `brain_search` tool that recalls the lessons your harness has been writing to `lessons.jsonl` since Part 2 — so a mistake made weeks ago is one query away. Second, a **nudge**: a `PostToolUse` hook that watches your edits and, the moment you touch a file other code imports, reminds the model to run `impact_check`. Memory you can query, plus a push that surfaces code intelligence without anyone asking for it.

## Objectives

By the end, you will be able to:

- **Implement** `brain_search` so a keyword query retrieves a relevant prior lesson from `lessons.jsonl`.
- **Wire** an `impact-hint` `PostToolUse` hook that nudges `impact_check` when you edit an imported file.
- **Explain** why the nudge's heuristics are stack-shaped, and how an SQLite store would differ from the JSON one (optional).

Each objective maps to the Checkpoint below.

## Time

30–40 minutes.

## Before you start

> 🧠 **No peeking (recall from 4.2):** `semantic_lookup` returns a file's summary and exported symbols. What does it pointedly **not** return, and why does that save tokens?
>
> <details><summary>Answer</summary>It never returns the file's source bytes — there are none in the store to return. Serving a one-line summary plus a symbol list instead of 120 lines of source is distilled intelligence over raw bytes (Principle 5): the model gets the answer without paying to read (and wade through) the whole file.</details>

Confirm 4.2's checkpoint still passes — `semantic_lookup` and `impact_check` both answer. Then copy this lesson's `start/` (it already contains the finished 4.2 server) and install:

```bash
cp -r start my-mcp && cd my-mcp
npm install
```

## The lesson

### Principle: distilled intelligence over raw bytes — now over your own history

The brain extends the same principle from files to **time**. In Part 2, every compaction wrote a short lesson to `lessons.jsonl` ("3 tool errors this window," "raise `max_output_tokens` if the summary is empty"). That file just grows; nothing reads it. `brain_search` turns it into queryable memory: ask _"why did the summary come back empty?"_ and get the lesson back, ranked by a transparent keyword score — no embedding model, so you can see exactly why each lesson matched. Distilled, cheap, and now it spans sessions.

### Build — tool 3: `brain_search`

Open `start/src/tools/brain-search.ts`. The file-reading (it loads `lessons.jsonl`, tolerant of missing or corrupt lines) and the flattening are done. The **one blank** is `scoreLesson()` — the keyword scoring:

- +2 if a query word matches the lesson's `type` (high signal),
- +1 for each query word found in the lesson text,
- +1 bonus if the whole query appears as a substring.

Fill it in. The tool is already registered in `mcp-server.ts` as the third tool (note its handler ignores the code `store` — it reads `lessons.jsonl` directly). Build and try it against this lesson's fixture lessons:

```bash
npm run build
LESSONS_PATH=../fixtures/lessons.jsonl printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"brain_search","arguments":{"query":"empty output tokens budget"}}}' \
  | LESSONS_PATH=../fixtures/lessons.jsonl node dist/mcp-server.js
```

You should get back the "raise the budget" lesson, with a `score` above 0.

### Principle: push, not pull

`semantic_lookup` and `impact_check` are **pull** — the model has to think to call them. The best intelligence is **push**: surfaced exactly when it's relevant, without anyone remembering to ask. That's the `impact-hint` hook. When you edit a file that other files import, it prints a one-line reminder — _"`logger.ts` is imported by 1 file: `src/app.ts`. Run `impact_check` if you changed any exports."_ — and the model sees it as added context. The model didn't ask; the harness offered.

### Heuristics are stack-shaped

Read the top of `impact-hint.mjs`: it fires only on `.ts/.tsx/.js/.jsx/.mjs/.cjs/.py` files and skips tests, `.d.ts`, and `dist/`. Those defaults assume a **JS/TS/Python** repo — the same assumption the [reference's hint](../../../reference/hooks/unified/modules/impact-hint.mjs) makes (it even special-cases `app/api/route.ts`). A Rust or Ruby project would tune the extensions and skip list. A nudge is only as smart as the stack it was written for; that's expected, not a flaw — just know to retune it when your stack changes.

### Build — the nudge: `impact-hint.mjs`

Open `start/impact-hint.mjs`. This is a hook (`.mjs`), same shape as your Part 1–2 hooks: read the event from stdin, print any hint, exit 0. It reads the **same JSON store** your MCP server built in 4.2 — the import-edge map _is_ the dependency graph, so no grep needed. The **one blank** is in `countImporters()`: a file is an importer of the edited file if any of its import targets shares the edited file's basename. Fill it in.

To make this fire for real in Claude Code, wire it as a `PostToolUse` hook on `Edit|Write` in your `settings.json` (the Part 1 router pattern) — but you can verify it by hand first, below.

### Optional sidebar — make it persistent/fast with SQLite

> 🧪 **Optional, skip on a first pass.** Everything above uses a plain JSON file — zero native dependencies, so `npm install` never compiles anything (the reason we didn't reach for `better-sqlite3`, whose node-gyp fallback can brick a fresh-Mac checkpoint). If your index grows to thousands of files and you want indexed queries instead of loading the whole JSON each call, Node 22+ ships a built-in, no-native-build SQLite at `node:sqlite`:
>
> ```js
> import { DatabaseSync } from "node:sqlite";
> const db = new DatabaseSync("index.db");
> ```
>
> Same tool surface, a different storage engine behind `store.ts`. The lesson's point stands either way: the tools serve distilled answers; where those answers live is an implementation detail. Stay on JSON unless you measure a reason not to.

## Checkpoint

Two artifacts prove this lesson.

**1 — A prior lesson is retrievable.** With `brain_search` filled in — **rebuild first** (you edited `src/tools/brain-search.ts`; `node` runs the compiled `dist/`, so a stale build returns empty `matches` and looks like your edit failed):

```bash
npm run build
LESSONS_PATH=../fixtures/lessons.jsonl node dist/mcp-server.js <<'EOF'
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"brain_search","arguments":{"query":"register mcp absolute path"}}}
EOF
```

✅ The reply's `matches[0].text` is the "registers MCP servers by absolute path" lesson, with `score` ≥ 1. (If `matches` is empty, the scoring blank isn't filled.)

**2 — Editing an imported file nudges an impact check.** First index the sample repo so the store has an import graph, then simulate two edits:

```bash
CONTEXT_LAYER_STORE=/tmp/clp-store.json node dist/mcp-server.js --index ../fixtures/sample-repo

# Editing logger.ts (which app.ts imports) → a hint:
echo '{"tool_name":"Edit","tool_input":{"file_path":"src/logger.ts"}}' \
  | CONTEXT_LAYER_STORE=/tmp/clp-store.json node impact-hint.mjs

# Editing a README (not source) → silence:
echo '{"tool_name":"Edit","tool_input":{"file_path":"README.md"}}' \
  | CONTEXT_LAYER_STORE=/tmp/clp-store.json node impact-hint.mjs
```

✅ **You got it when** the first command prints `Impact hint: logger.ts is imported by 1 file: src/app.ts. ...`, and the second prints **nothing** (and exits 0). If editing `logger.ts` is silent, the `countImporters` blank isn't filled. If the README edit produces a hint, the source-extension filter isn't working.

## Recap + next

Your harness now remembers across sessions (`brain_search` over `lessons.jsonl`) and pushes the right intelligence at the right moment (the impact-hint nudge). That's the full code-intelligence layer: distilled answers about files, about change blast-radius, and about your own accumulated lessons — plus a reflex that surfaces them unprompted.

That completes **Part 4** and the **[Minimum Viable Harness](../../../docs/glossary.md#mvh-minimum-viable-harness)**. Before you move on, take the [Part 4 self-assessment](../README.md#self-assessment) on the landing page. Then **[Part 5 — the self-improvement loop](../../05-self-improvement/)** turns the lessons your brain stores into proposed upgrades to the harness itself.
