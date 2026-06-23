# The Course: Build Your Own Claude Code Harness

Build a working harness from an empty directory, one principle at a time.

> ✅ **Status: all nine parts authored; every `solution/` is CI-verified.** The map below is the plan of record, and the [reference harness](../reference/) is your answer key throughout. New to the terms below? Keep the [glossary](../docs/glossary.md) open.

## Your first win is fast

Part 1 opens with a **~15-minute "Hello, hook"**: one tiny script that makes Claude Code do something visible on every prompt. You'll have a working customization before any of the memory machinery — proof you can do this.

## Every lesson has the same shape

So you always know where you are. Each lesson's `README.md` follows this contract:

1. **Objectives** — 2–4 concrete "you'll be able to…" statements.
2. **Time** — an honest estimate (and your starting level changes it).
3. **Before you start** — a copy-pasteable check that the previous checkpoint still passes.
4. **The lesson** — the principle, why it matters, how the [reference harness](../reference/) does it, and what you build.
5. **Checkpoint** — a concrete, verifiable "you got it."
6. **Recap + next** — what you just proved, and where it leads.

Plus two folders per lesson:

- **`start/`** — a skeleton you edit (marked with `TODO`s).
- **`solution/`** — the working answer. [Diff](../docs/glossary.md#diff) (compare) your version against it when stuck.

Do the lessons in order (recommended) or jump to a part and pull missing pieces from [`../reference/`](../reference/).

## Map

| Part  | Title                                         | Difficulty           | You build                                                            | Read alongside                                                                                                   |
| ----- | --------------------------------------------- | -------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **0** | [Orientation](00-orientation/)                | Beginner             | nothing yet — mental model + a _shallow_ tour                        | [what-is-a-harness](../docs/what-is-a-harness.md), [the-event-model](../docs/the-event-model.md)                 |
| **1** | [Foundations](01-foundations/)                | Beginner             | "Hello, hook"; the event loop; fail-silent design                    | [the-event-model](../docs/the-event-model.md)                                                                    |
| **2** | [Memory (the Memento pattern)](02-memory/)    | Intermediate ⛰️‑lite | rolling log → session memory → LLM summaries → diagnosis             | [the-memento-pattern](../docs/the-memento-pattern.md), [where-to-spend-tokens](../docs/where-to-spend-tokens.md) |
| **3** | [Workflow layer](03-workflow/)                | Intermediate         | a slash command, a skill, a sub-agent, a verify gate                 | [commands-skills-agents](../docs/commands-skills-agents.md)                                                      |
| **4** | [Code intelligence (MCP)](04-mcp/)            | Advanced ⛰️          | a minimal MCP server: `semantic_lookup` + `impact_check` + a brain   | [mcp-in-plain-terms](../docs/mcp-in-plain-terms.md)                                                              |
| **5** | [Self-improvement loop](05-self-improvement/) | Intermediate         | `/evolve` + `/retrospective`                                         | [principles](../docs/principles.md)                                                                              |
| **6** | [Packaging & setup](06-packaging/)            | Intermediate         | `install.sh`, MCP registration, statusline                           | —                                                                                                                |
| **7** | [Level-up modules](07-level-up/)              | Mixed                | opt-in: token filter, auto-approve, multi-vendor review, Stream Deck | [principles](../docs/principles.md)                                                                              |
| **8** | [Capstone](08-capstone/)                      | Intermediate         | assemble + depersonalize + publish your own                          | [principles](../docs/principles.md)                                                                              |

**The [Minimum Viable Harness](../docs/glossary.md#mvh-minimum-viable-harness) (MVH) is complete at the end of Part 4** — a memory-keeping, self-logging, code-aware harness running on one LLM key. Parts 5–8 are additive.

> ⛰️ **Part 4 is the hard climb.** It introduces a new language ([TypeScript](../docs/glossary.md#typescript)) and a new idea ([MCP](../docs/glossary.md#mcp-model-context-protocol)), and it sits right at the "you could stop here" milestone. We scaffold its `start/` heavily and explain _why it's worth it_ — feeding the model distilled code intelligence is the single biggest quality upgrade in the whole harness. If you only skim one Advanced part, still do Part 4's checkpoint.

## How long?

Honest ranges, because under-promising time is how courses lose people:

- **Parts 0–4 (the MVH):** an afternoon if you're comfortable in a terminal; a weekend if these ideas are new. Each part lists its own estimate.
- **Parts 5–8:** come-back-later modules, an hour or two each.

Don't rush. Every checkpoint is a real capability you'll keep using.

## Conventions

- Hook scripts are Node [ESM](../docs/glossary.md#nodejs-and-esm--mjs) (`.mjs`); the MCP server is [TypeScript](../docs/glossary.md#typescript) — matching the reference harness. Requires [Node.js](../docs/glossary.md#nodejs-and-esm--mjs) 20+.
- Commands are written for macOS/Linux. On Windows, use [WSL](../docs/glossary.md#wsl-windows-subsystem-for-linux).
- Every `solution/` is verified to run in [CI](../docs/glossary.md#ci-continuous-integration) (our automated checker), so the answer keys are known-good.

---

_[Repo root](../README.md) · course · [docs](../docs/) · [reference](../reference/)_
