# Glossary

Plain-English definitions for every term used in this repo. If a word in a lesson made you pause, it's probably here. No prior AI-engineering knowledge assumed.

New to all of this? Read [What is a harness?](what-is-a-harness.md) first, then keep this open in a tab.

---

### Harness

The customization layer you build _on top of_ Claude Code — using its own hooks, commands, skills, agents, and MCP — to extend its built-in memory, verification, and automation beyond the defaults. (Claude Code is itself an agentic "harness" around the Claude model; here you're extending that harness.) This whole repo teaches you to build one.

### Claude Code

Anthropic's **agentic coding tool** for working with Claude. It reads your codebase, edits files, runs commands, and integrates with your dev tools — in the terminal, IDE, desktop app, and browser. Out of the box it already includes an agent loop, `CLAUDE.md` + auto memory, subagents, and compaction; the harness extends all of that.

### Hook

A small script that runs **automatically at a specific moment** while you use Claude Code — for example, right after it edits a file, or just before it forgets older conversation. You decide which script runs at which moment. Hooks are the foundation of the whole harness.

### Lifecycle event

One of the moments during a Claude Code session that a hook can attach to: the session **starts**, you **submit a prompt**, a **tool runs**, the conversation gets **compacted**, the session **stops**, and so on. See [the event model](the-event-model.md).

### `settings.json`

The configuration file where you list which script runs on which event. It's the **routing table** of the whole system: Claude Code reads it and, when an event fires, runs the script you mapped to it — change one mapping and you've changed a behavior. (Not a Wi-Fi router — it just maps each event to the right script.)

### Command (slash command)

A shortcut you type, like `/plan` or `/evolve`, that triggers a saved instruction. You write commands as Markdown files. Think "saved prompt with a name." (Claude Code has since **merged commands into skills**: a `.claude/commands/plan.md` and a `.claude/skills/plan/SKILL.md` both create `/plan`. The single-file command is the lightweight legacy form; both still work.)

### Skill

A packaged ability you hand Claude Code so it knows how to do a specific kind of task. Like a command, but it can ship helper scripts and the model can decide on its own when to use it.

### (Sub-)Agent

A separate Claude instance you delegate a focused job to, so it works in its own clean context and reports back. Useful for big jobs (like "review this whole change") that would otherwise clutter your main conversation.

### MCP (Model Context Protocol)

A standard way for Claude Code to talk to an external helper program. An **MCP server** exposes a few **tools** (and optionally data **resources** and reusable **prompts**) that Claude Code discovers and the model can call during a session — e.g. "summarize this file", "what depends on this function?". Under the hood it's a simple back-and-forth of JSON-RPC messages; see [MCP in plain terms](mcp-in-plain-terms.md).

### Context window (or "context")

Claude's short-term memory for the current conversation. It holds everything Claude is currently "aware of" — and it's limited in size. (Durable memory across sessions comes from `CLAUDE.md`, auto memory, and the harness's memory layer — not from the context window.)

### Compaction (context compaction)

When the context window fills up, Claude Code **summarizes the older conversation into a compact summary** and drops the verbatim detail to make room. The high-level thread (your requests, the files touched, the errors fixed) is kept; the **exact** earlier transcript — full tool outputs and intermediate reasoning — is gone. (`CLAUDE.md` and auto memory are re-read from disk afterward, so those survive.) This loss of specifics is what the harness's richer memory layer is built to soften.

### Token

The unit of text a model reads and writes — roughly a word-piece. You're billed **per token**, so "spending tokens" means using up budget and the model's limited attention. Fewer tokens in context = cheaper and sharper.

### Token economy

Being deliberate about which information is worth putting in front of the model, because every token costs money and attention. A recurring theme: _the cheapest token is one that never enters context._

### LLM (large language model)

The AI itself — Claude, GPT, Gemini, etc. The harness uses a small, cheap LLM in the background to summarize and diagnose your sessions.

### API key

A secret password that lets your computer use an AI provider's model. You create one on the provider's website and paste it into an environment variable. **Treat it like a password** — never commit it to a repo. See [What is an API key?](what-is-a-harness.md#what-is-an-api-key) for how to get one.

### Endpoint

The web address your tool sends AI requests to (e.g. `https://api.openai.com/v1`). Different providers have different endpoints.

### OpenAI Responses API vs. Chat Completions API

Two different request formats an AI provider can offer. The reference harness's background LLM client is written for the **Responses API** (used by OpenAI and Azure OpenAI). Many other providers ("OpenAI-compatible" ones like OpenRouter, Together, Groq, Ollama) speak the **Chat Completions** format instead — the long-established OpenAI API that predates Responses and is still fully supported, not deprecated. The two just aren't interchangeable on the wire — so the course ships a small adapter to let you use either. This distinction trips people up; it's why we're explicit about it.

### Environment variable

A named value your shell remembers, like `LLM_API_KEY=sk-...`. Programs read them at runtime. You set them with `export NAME=value` (macOS/Linux).

### Node.js (and ESM / `.mjs`)

**Node.js** is a program that runs JavaScript on your computer (outside a web browser); the harness's hook scripts need it (version 20 or newer). **ESM** is just the modern style of JavaScript file the hooks use; `.mjs` is its file extension. You don't need to understand ESM to follow along.

### stdin and stdout

The two default channels every command-line program has: **stdin** (standard input) is the text fed _into_ it; **stdout** (standard output) is the text it prints _out_. In `printf '{}' | node hook.mjs prompt`, the `printf` text flows into the hook's stdin, and whatever the hook prints comes back on stdout. Hooks read their payload from stdin; an MCP server is a loop that reads requests from stdin and writes replies to stdout.

### Payload

The bundle of information Claude Code hands your hook when an event fires — a small block of JSON describing what just happened (for a prompt event, the text you typed; for an edit event, which file changed). Your hook reads it from [stdin](#stdin-and-stdout) and parses it. "Read the payload" just means "read that JSON."

### File descriptor (fd 0)

A numbered channel a running program reads from or writes to. The only one you'll meet here is **fd 0**, which _is_ [stdin](#stdin-and-stdout) — so `readFileSync(0, "utf-8")` means "read everything piped into me." (fd 1 is stdout, fd 2 is stderr; you can ignore those for now.)

### JSONL

"JSON Lines" — a file where **each line is its own complete JSON object** (not one big JSON array). It's the natural shape for an append-only log: to add an entry you just append a line, with no need to read, re-parse, and rewrite the whole file. The rolling log and `lessons.jsonl` use it.

### Transcript

The on-disk record of a Claude Code session — the sequence of messages and tool calls, stored as [JSONL](#jsonl). Hooks like the pre-compaction summarizer read the transcript to figure out what happened before writing a memory.

### Fixture

A small, fixed piece of canned input or expected output, checked in alongside a lesson so you can verify your code against a known-good answer. "Diff your output against the fixture" means: compare what your code produced to the saved expected result.

### Deterministic

Always produces the same result from the same input. A checkpoint is **deterministic** when "did it work?" is a yes/no you can re-run and trust (a file appeared, a diff matches) — as opposed to a probabilistic check that might pass or fail by chance. The course prefers deterministic checkpoints.

### TypeScript

JavaScript with type-checking added. The MCP server is written in it, which means it has a **build step** (a compile) before it runs.

### Build step

An extra compile/processing stage some code needs before it can run. The hooks have none; the TypeScript MCP server does (the installer handles it).

### Fail-silent / graceful degradation

A design rule: if a customization breaks or a dependency is missing, it **quietly does nothing** instead of crashing your Claude Code session. A broken hook should never cost you your work.

### Verification gate

An automatic check that must pass before work is considered "done" — running tests, a type-check, or a reviewer agent. "If you can't verify it, don't ship it."

### Human-in-the-loop

The system **proposes** changes (e.g. "here's how I'd improve the harness") but a **person approves** before anything is applied. Automation suggests; you decide.

### Stateless model

The raw model doesn't remember anything between sessions on its own — any memory has to be **stored on disk** and fed back in. (Claude Code the tool adds some persistence on top via `CLAUDE.md` and auto memory; this entry is about the model underneath.) This fact is _why_ the Memento pattern exists.

### Memento pattern

The trick of **writing notes to disk** when the model is about to forget, then **re-reading them** at the start of the next prompt — so a memoryless model behaves as if it remembers. Named after the film _Memento_, whose protagonist tattoos notes to himself because he can't form new memories.

### Distilled intelligence over raw bytes

Feeding the model **short, processed summaries** of your code (a file's purpose, what depends on a function, a symbol's signature) instead of dumping whole files into context. Cheaper and clearer.

### Symbol / impact

A **symbol** is a named thing in code — a function, class, or variable. **Impact** is what else would break or change if you modified it (its dependents).

### Idempotent

Safe to run repeatedly. An idempotent installer can be re-run any number of times without double-installing or breaking what's already there.

### Templated setup

The installer generates your real config files from tracked **templates**, so you never hand-edit the live files (and your secrets stay out of the repo).

### Vendor diversity

Using a **different** AI provider to review work, on the principle that a model checking its own output isn't a real check — _a model reviewing its own work is theater._

### Rolling log

A running, append-only record of every tool operation Claude Code performs, written to disk with no AI cost. A searchable audit trail of "what happened."

### Diff

Comparing two versions of a file to see exactly what changed. "Diff your version against the solution" means "compare them to spot the difference."

### CI (continuous integration)

An automated system (here, GitHub Actions) that runs the project's checks on every change — for this repo, it verifies that lesson `solution/`s actually work and that no personal data leaked in.

### MVH (Minimum Viable Harness)

The smallest useful harness — memory, logging, a command, an agent, and a tiny MCP server — that runs on **one LLM key and nothing else**. You finish it at the end of Part 4. Everything after is additive.

### Reasoning effort

A dial on some newer models for how hard they "think" before answering (and how much they cost) per request. The harness uses **low** effort for cheap frequent jobs and **higher** effort for rare, important ones.

### WSL (Windows Subsystem for Linux)

A feature that lets Windows users run Linux commands. If you're on Windows, run this repo's commands inside WSL.

---

_Missing a term? It's a bug in this glossary — open an issue._
