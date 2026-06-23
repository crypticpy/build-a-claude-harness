# Reference Harness

The finished, depersonalized harness — the destination the [course](../course/) builds toward. Install it, run it, and read it as the **answer key** when your own version (built in the course) diverges.

It runs on a single LLM API key. Nothing here needs paid CLIs or hardware; the optional [level-up tools](../course/07-level-up/) live behind their own flags.

## Read it in this order

The harness is small but everything connects. Read these five files, in order — they're the spine, and each one is heavily commented to explain _why_, not just _what_:

1. **[`hooks/unified/unified-hook.mjs`](hooks/unified/unified-hook.mjs)** — the **router**. One entry point; the event name arrives as `argv[2]` and dispatches to the right module. Start here to see the whole shape on one screen.
2. **[`hooks/unified/modules/session-memory.mjs`](hooks/unified/modules/session-memory.mjs)** + **[`precompact-llm.mjs`](hooks/unified/modules/precompact-llm.mjs)** — the **memory loop**. `precompact-llm` _writes_ a distilled summary right before the context window is compacted; `session-memory` _reads_ it back into the next prompt. That write-then-reinject pair is the whole "remember across compactions" trick.
3. **[`hooks/unified/modules/llm-call.mjs`](hooks/unified/modules/llm-call.mjs)** — the **one place the harness talks to a model**. Provider-neutral: swap env vars, every hook follows. Read the header comment for the Responses-vs-Chat fork.
4. **[`plugins/context-layer/src/mcp-server.ts`](plugins/context-layer/src/mcp-server.ts)** — the **MCP server**, which is "just" a JSON-RPC loop over stdin/stdout. This is what feeds the model _distilled_ code intelligence (a summary, the list of consumers) instead of raw bytes.
5. **[`install.sh`](install.sh)** — **idempotent setup**. Templates `settings.json`, builds the MCP, registers it, backs up anything it would overwrite.

> **Read `src/`, not `dist/`.** `install.sh` compiles the MCP to `plugins/context-layer/dist/` for you (that directory is git-ignored, so a fresh clone _builds_ it rather than shipping it). The generated `.js` files have no teaching comments anyway — always read the `.ts` sources under `src/`.

## How the files map to the course

| Reference area                                                                                                                    | You build it in                                             | Concept                                    |
| --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------ |
| `hooks/unified/unified-hook.mjs` + `settings.template.json`                                                                       | [Part 1 — Foundations](../course/01-foundations/)           | the event router; fail-silent design       |
| `hooks/unified/modules/{rolling-log,session-memory,precompact-llm}.mjs`                                                           | [Part 2 — Memory](../course/02-memory/)                     | the Memento pattern; where to spend tokens |
| `hooks/unified/modules/{format-lint,quality-gates,verification-check,skill-activation}.mjs` · `commands/` · `skills/` · `agents/` | [Part 3 — Workflow](../course/03-workflow/)                 | commands, skills, sub-agents, verify gates |
| `plugins/context-layer/`                                                                                                          | [Part 4 — Code intelligence (MCP)](../course/04-mcp/)       | a minimal MCP server                       |
| `hooks/unified/modules/{self-evolution,deep-retrospective}.mjs` · `commands/{evolve,retrospective}.md`                            | [Part 5 — Self-improvement](../course/05-self-improvement/) | the human-in-the-loop improvement loop     |
| `install.sh` · `mcp-servers.json` · `settings.template.json`                                                                      | [Part 6 — Packaging](../course/06-packaging/)               | idempotent, templated setup                |

The whole thing embodies the [ten principles](../docs/principles.md). New to a term below? Keep the [glossary](../docs/glossary.md) open; if you've never customized Claude Code before, start with [what is a harness?](../docs/what-is-a-harness.md).

## What's here

```
reference/
├── hooks/unified/         # the event router (unified-hook.mjs) + modules
│   ├── modules/           # memory, logging, diagnosis, formatting, gates, the LLM client
│   ├── config.json        # per-role token budgets (the cost knobs)
│   └── skill-rules.json   # which prompts activate which skill
├── commands/              # example slash commands (plan, evolve, retrospective, freview)
├── skills/                # one example skill
├── agents/                # example review agents
├── plugins/context-layer/ # local code-intelligence + memory MCP server (TypeScript)
├── settings.template.json # event → script routing (rendered to settings.json by install.sh)
├── mcp-servers.json       # MCP registration manifest
├── .env.example           # every env var the harness reads, documented
└── install.sh             # idempotent installer
```

## Quickstart

```bash
# 1. Bring an LLM key. Any small/cheap model works (a *-mini / *-flash / *-haiku tier).
export LLM_API_KEY=...                            # read ONLY from the environment
export LLM_MODEL=gpt-4o-mini                       # zero-config fallback; set your provider's current mini tier
export LLM_BASE_URL=https://api.openai.com/v1     # your provider's endpoint
# export LLM_API_FORMAT=chat                       # see the portability note below

# 2. Install into ~/.claude (idempotent — safe to re-run). This also:
#      - builds the TypeScript MCP server (npm install + compile)
#      - renders settings.json from settings.template.json (backing up any existing one)
#      - registers the MCP server with Claude Code
./install.sh
# (preview without writing anything: ./install.sh --dry-run)

# 3. Verify the MCP server registered, then start a session.
claude mcp list        # should list "context-layer"
```

Requires [Node.js](../docs/glossary.md#nodejs-and-esm--mjs) 20+. See [`.env.example`](.env.example) for every variable the harness reads.

### A portability caveat worth understanding

The background client defaults to the **OpenAI Responses API** (`LLM_API_FORMAT=responses`) — that's what this harness was originally built on, and it's what unlocks the `reasoning.effort` lever on reasoning models. But **"OpenAI-compatible" is not one thing.** Most providers that advertise an OpenAI-compatible endpoint (OpenRouter, Together, Groq, Ollama, …) implement the older **Chat Completions** API, _not_ Responses. For any of those, set `LLM_API_FORMAT=chat` and the same client speaks their dialect. This fork is the whole reason [`llm-call.mjs`](hooks/unified/modules/llm-call.mjs) exists — read its header.

## Notes

- **The MCP server is TypeScript** and has a compile step — `install.sh` handles it (`npm install` + build). The Node ESM hooks need no build.
- **Your key stays in the environment.** The harness never reads a key from a committed file, and runtime memory/log directories are git-ignored.
- **`reasoning.effort` is opt-in.** It's off by default because it's only valid on reasoning models; see `LLM_REASONING` in [`.env.example`](.env.example).
- **Where persistent notes live.** The MCP's brain store is a plain JSON file at `plugins/context-layer/.store/brain.json` (git-ignored, created on first write) — not under `~/.claude`. Delete it to reset the harness's memory.

---

_[Repo root](../README.md) · [course](../course/) · [docs](../docs/) · reference_
