# Part 2 — Memory (the Memento pattern)

**Difficulty:** Intermediate ⛰️-lite · **Time:** 75–110 minutes

This is the first real climb of the course — and the part most people would otherwise bounce off of, so it's built gently. You'll turn a forgetful model into one that remembers your project across compactions and sessions, one small piece at a time. By the end, your harness has the single most valuable thing a harness can have: **memory.**

📖 **Read alongside:** [The Memento pattern](../../docs/the-memento-pattern.md) · [Where to spend tokens](../../docs/where-to-spend-tokens.md)

## Why this part matters

On its own, the model is [**stateless**](../../docs/glossary.md#stateless-model): every [compaction](../../docs/glossary.md#compaction-context-compaction) wipes the running transcript and it starts the next turn from zero. The [Memento pattern](../../docs/glossary.md#memento-pattern) fixes that with two moves — **write a note to disk before the model forgets, read it back on the next prompt.** Everything in this part is built around that one loop.

## The climb, gentlest-first

Each lesson adds exactly one idea. The first two cost nothing; the LLM (and its first real cost) doesn't appear until 2.3, which we split into plumbing and integration so the climb stays gentle.

| Lesson                                          | You build                                                             | Cost        | New idea                                 |
| ----------------------------------------------- | --------------------------------------------------------------------- | ----------- | ---------------------------------------- |
| [2.1 Rolling log](2.1-rolling-log/)             | Append every tool op to a JSONL log                                   | free        | append-only, never read-modify-write     |
| [2.2 Write/read pair](2.2-write-read-pair/)     | Write a note on `PreCompact`, read it on `UserPromptSubmit`           | free        | the Memento loop (hardcoded note)        |
| [2.3a LLM plumbing](2.3a-llm-plumbing/)         | A provider-neutral `callLlm()`, run on three lines of text            | first $     | one choke point; the empty-output gotcha |
| [2.3b Wire into memory](2.3b-wire-into-memory/) | Replace the hardcoded note with a real `summarize` call               | cheap/often | cost escalation; parameterize the model  |
| [2.4 Trace diagnosis](2.4-trace-diagnosis/)     | Also write a lesson on `PreCompact`; surface a file's edits on prompt | free        | one parse → two outputs                  |

Do them in order — each lesson's "Before you start" recalls the previous one.

## What you'll have at the end

A working memory system: a free audit log of every tool op, a session-memory note that's written before each compaction and re-injected on your next prompt, an efficiency lesson accumulating in `lessons.jsonl`, and edit-history surfacing when you mention a file. All of it runs on one LLM key — and the parts that don't need judgment (the logs) run on no key at all.

## Self-assessment

Answer these before moving on. If one is shaky, revisit the lesson it points to.

1. **Why write memory on `PreCompact` rather than after every message?**
   <details><summary>Answer</summary>Two reasons. <b>Cost:</b> once a model writes the note, doing it every message means paying constantly to re-summarize barely-changed state; `PreCompact` fires only when the window is actually about to be lost — the one moment a fresh note earns its keep. <b>Signal:</b> right before compaction is when the most has happened since the last note, so there's something real to summarize. The write is event-driven, not clock-driven. (Lesson 2.2 / 2.3b.)</details>

2. **Why must the rolling log be append-only instead of read-modify-write?**
   <details><summary>Answer</summary>Parallel tool calls fire parallel hook processes. With read-modify-write, two processes can both read the same file and both write back, and the second silently overwrites the first's line. Appending one line per process can't conflict. (Lesson 2.1.)</details>

3. **Your background summary comes back empty, with no error. First fix?**
   <details><summary>Answer</summary>Raise the token budget (`maxTokens`). On the Responses API, `max_output_tokens` covers reasoning too, so a tiny budget can leave no text — empty output is not an error. (Lesson 2.3a.)</details>

4. 🔁 **Callback to Part 1 — which lifecycle event re-injects the memory, and what else did you use that same event for in Part 1?**
   <details><summary>Answer</summary><code>UserPromptSubmit</code> (the <code>prompt</code> event). It's the read side of the Memento loop — and it's the very same event as Part 1's "Hello, hook," where a hook appended a line on every prompt. <code>UserPromptSubmit</code> is the place a hook injects extra context for the model before your prompt reaches it.</details>

## Where this leads

Memory is the backbone the rest of the harness hangs off. **[Part 3 — Workflow layer](../03-workflow/)** adds the things you trigger by hand (slash commands, skills, sub-agents); **[Part 4 — MCP](../04-mcp/)** adds code intelligence and completes the [Minimum Viable Harness](../../docs/glossary.md#mvh-minimum-viable-harness); and **[Part 5](../05-self-improvement/)** mines the `lessons.jsonl` you started filling in 2.4.

---

_[Course map](../README.md) · [docs](../../docs/) · [reference](../../reference/) · [glossary](../../docs/glossary.md)_
