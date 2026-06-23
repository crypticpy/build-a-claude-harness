# Part 4 — Code intelligence (MCP)

**Difficulty:** Advanced ⛰️ · **Time:** 90–120 minutes

This is the hard climb of the course, and the one that completes the [Minimum Viable Harness](../../docs/glossary.md#mvh-minimum-viable-harness). You'll build a small [MCP server](../../docs/glossary.md#mcp-model-context-protocol) — a tool server the model can call — that answers questions about your _own_ code from an index: what a file does, what depends on it, and what your harness has learned over time.

📖 **Read alongside:** [MCP in plain terms](../../docs/mcp-in-plain-terms.md)

## The payoff (why it's worth the climb)

Picture this, in a real Claude Code session inside your own repo:

> **You:** "I want to change `logger.ts`. Use `semantic_lookup` and `impact_check` on it first."
>
> **Claude (calling your MCP server):**
> `semantic_lookup` → _"`logger.ts` — a one-function logging helper. Prefixes each line with a level. Exports: `log`, `LEVELS`."_
> `impact_check` → _"Consumers: `src/app.ts`. Changing `log`'s signature will affect 1 file."_

No file was dumped into context. The model got a one-line summary and the exact blast radius of the change — computed by **code you wrote**, for **free in tokens**, instead of reading the source and guessing. That is the single biggest quality upgrade in the whole harness: [distilled intelligence over raw bytes](../../docs/principles.md#5-distilled-intelligence-over-raw-bytes). Feed the model a processed answer, not a wall of source.

## Why this is the cliff (and how we handle it)

> ⛰️ This part introduces a **new language** ([TypeScript](../../docs/glossary.md#typescript)) and a **new idea** (MCP) at the same time — and it sits right at the "you could stop here" milestone. So we scaffold hard. Every `start/` ships **near-complete** code with one or two clearly-marked `// TODO` blanks per file. **You are filling in blanks, not writing a server from scratch.** If you only do one Advanced part's checkpoint, do Part 4's.

Two deliberate choices keep the climb survivable:

- **No native dependencies.** The store is a **plain JSON file** — no `better-sqlite3`, no node-gyp, nothing to compile. `npm install` can't brick on a fresh Mac. (Node 22+'s built-in `node:sqlite` is an _optional_ sidebar in 4.3, never required.)
- **The loop never changes.** You build the JSON-RPC loop once in 4.1. Every lesson after just adds a tool to the same registry. The hard part is front-loaded and then reused.

## The climb, three lessons

| Lesson                                                   | You build                                                     | New idea                                |
| -------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------- |
| [4.1 JSON-RPC loop](4.1-json-rpc-loop/)                  | The stdin/stdout MCP loop + three methods, no SDK             | an MCP server is a JSON-RPC loop        |
| [4.2 `semantic_lookup` + register](4.2-semantic-lookup/) | A JSON index + `semantic_lookup` + `impact_check`, registered | **← MVH COMPLETE**; distilled over raw  |
| [4.3 brain + impact-hint](4.3-brain-and-impact-hint/)    | `brain_search` over `lessons.jsonl` + a `PostToolUse` nudge   | push, not pull; stack-shaped heuristics |

Do them in order — each "Before you start" recalls the previous lesson, and 4.2 and 4.3 reuse the loop you build in 4.1.

> 🏔️ **The MVH is complete at the end of 4.2.** After that lesson you have a memory-keeping, self-logging, workflow-aware, **code-aware** harness running on one LLM key. 4.3 is the first additive step past the peak.

## Anchored to the reference

Everything you build here is a simpler teaching version of the shipped [`reference/plugins/context-layer/`](../../reference/plugins/context-layer/) — **same tool names** (`semantic_lookup`, `impact_check`, `brain_search`), **same JSON-store shape** (`{ root, files, imports, brain }`), **same registration command** (`claude mcp add`). When a lesson trims something (the reference handles Go, grouped imports, and LSP-style framing), it says so. You can read the reference any time you want the production version of a piece.

## What you'll have at the end

A registered MCP server exposing three tools — a file summarizer, a dependency tracer, and a searchable brain — plus a hook that nudges the model toward `impact_check` the moment it edits an imported file. All of it runs on plain code over a JSON file: free in tokens at call time, and impossible to brick on install.

## Self-assessment

Answer these before moving on. If one is shaky, revisit the lesson it points to.

1. **Why feed the model a file _summary_ and its _dependents_, instead of the whole file?**
   <details><summary>Answer</summary>Raw bytes are expensive and noisy. Dumping a 600-line file to answer "what does this do and what depends on it?" burns <a href="../../docs/glossary.md#token">tokens</a> and buries the answer under code the model has to wade through. A summary plus the dependents list is the processed answer — purpose, exports, blast radius — in a fraction of the context. That's <a href="../../docs/principles.md#5-distilled-intelligence-over-raw-bytes">distilled intelligence over raw bytes</a> (lessons 4.2–4.3), and it's why an MCP tool beats a file read for these questions.</details>

2. **Why does a bad message have to leave the server's loop running?**
   <details><summary>Answer</summary>The server is one long-lived process serving the whole session. If a single malformed line could throw and exit the loop, one bad request would take down every tool for the rest of the session. So a parse error or unknown method becomes a JSON-RPC <i>error reply</i>, and the loop reads the next line — the same fail-silent discipline as the Part 1 hooks. (Lesson 4.1.)</details>

3. **Callback to the cost ladder (Parts 2–3):** the per-compaction summarizer in Part 2 used a cheap model on every compaction; `/evolve` in Part 3's preview spends more, rarely. Where do these MCP tools sit on that ladder, and why?
   <details><summary>Answer</summary>They sit <b>off the LLM ladder entirely</b> — `semantic_lookup`, `impact_check`, and `brain_search` are computed by plain code (regex indexing, graph lookups, keyword scoring), so they cost <b>zero tokens</b> at call time and add no latency. The cost ladder is about <i>where to spend the LLM</i>; the whole point of a code-intelligence tool is to answer the repeatable questions <i>without</i> spending it. The one upstream LLM cost is Part 2 writing the lessons that 4.3's brain later searches for free. (Cost ladder: <a href="../../docs/where-to-spend-tokens.md">where to spend tokens</a>.)</details>

---

_[Course map](../README.md) · [docs](../../docs/) · [reference](../../reference/)_
