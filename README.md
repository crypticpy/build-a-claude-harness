# Build Your Own Claude Code Harness

[![CI](https://github.com/crypticpy/build-a-claude-harness/actions/workflows/ci.yml/badge.svg)](https://github.com/crypticpy/build-a-claude-harness/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Node 20+](https://img.shields.io/badge/node-20%2B-brightgreen)

> Learn to turn Claude Code from a chat tool into a system that **remembers across sessions, checks its own work, and improves itself** — by building one, principle by principle.

> ✅ **Complete and CI-verified** — all nine course parts, the concept docs, and the runnable [reference harness](reference/) are authored, and CI builds every lesson's answer key and runs its self-tests on each push. _([Found a rough edge walking a lesson? Tell us.](.github/ISSUE_TEMPLATE/lesson_feedback.md))_

> **New here?** Start with **[What is a harness?](docs/what-is-a-harness.md)** — plain-English, zero jargon assumed. Then come back.

## The problem this solves

[Claude Code](docs/glossary.md#claude-code) is powerful out of the box. But its memory of the conversation gets cleared periodically to free up space (this is called [compaction](docs/glossary.md#compaction-context-compaction)), and when it does, the detail of what just happened is gone. So teams rebuild the same context every session, re-explain the same preferences, and re-discover the same mistakes.

A **harness** is the layer you wrap around Claude Code to fix that — [hooks](docs/glossary.md#hook), [commands](docs/glossary.md#command-slash-command), [skills](docs/glossary.md#skill), [agents](docs/glossary.md#sub-agent), and a small [MCP server](docs/glossary.md#mcp-model-context-protocol) that together give the assistant persistent memory, verification gates, and a self-improvement loop. _(Don't know those five words yet? That's fine — [What is a harness?](docs/what-is-a-harness.md) defines each one, and every term links to the [glossary](docs/glossary.md).)_

This repo teaches you to build one, organized around **transferable principles**, using one real, working harness as the worked example. You'll finish able to build _your own_ — not just copy this one.

## What you'll be able to do

- **Stop re-explaining yourself** — give Claude memory that survives [compaction](docs/glossary.md#compaction-context-compaction), so it remembers decisions across sessions.
- **Move faster with your own shortcuts** — author slash commands, skills, and sub-agents tailored to your workflow.
- **Trust the output more** — wire verification gates so nothing is called "done" until something checks it.
- **Make Claude code-aware** — build a tiny MCP server that answers questions about your codebase instead of re-reading whole files.
- **Let the system improve itself** — add a human-in-the-loop loop that proposes its own upgrades for you to approve.
- **Reason about cost** — learn [where to spend tokens](docs/where-to-spend-tokens.md): cheap, high-frequency calls vs. expensive, rare ones.

## How this repo is organized

```
build-a-claude-harness/
├── reference/   # the finished, depersonalized harness — install and run it
├── course/      # build it yourself, lesson by lesson (start/ + solution/ each)
└── docs/        # the concepts and principles, explained in plain language
```

**Three ways to use it — pick yours:**

| You want to…                                            | Start here                                               |
| ------------------------------------------------------- | -------------------------------------------------------- |
| **Understand the ideas** first (recommended for anyone) | [`docs/what-is-a-harness.md`](docs/what-is-a-harness.md) |
| **Learn by building** from an empty directory           | [`course/`](course/00-orientation/) → Part 0             |
| **Run a working harness now**, then tinker              | [`reference/`](reference/) → follow its README           |

Most people do all three: skim the docs, build through the course, and keep the reference open as the answer key.

## Prerequisites

- **[Claude Code](https://docs.claude.com/en/docs/claude-code)** installed and a working session.
- **[Node.js](docs/glossary.md#nodejs-and-esm--mjs) 20+.** Check with `node --version`; if it errors or shows < 20, install from [nodejs.org](https://nodejs.org).
- **One [LLM API key](docs/glossary.md#api-key)** for the memory/diagnosis features. Never gotten one? [What is an API key?](docs/what-is-a-harness.md#what-is-an-api-key) walks you through it.
- Willingness to copy-paste commands and read error messages. You do **not** need to be an AI engineer — Part 0 starts from "what is a hook."

> **Which model?** Any small/cheap model works — the course uses a provider-neutral `LLM_API_KEY` / `LLM_MODEL` / `LLM_BASE_URL`, so the name is yours to choose.
>
> ⚠️ **One honest caveat:** the reference harness's background client speaks the **[OpenAI Responses API](docs/glossary.md#openai-responses-api-vs-chat-completions-api)** (OpenAI and Azure OpenAI support it directly). Many cheaper "OpenAI-compatible" providers (OpenRouter, Together, Groq, Ollama) only speak the older _Chat Completions_ format — so the course ships a small **adapter** to use them. Brand new? Start with OpenAI to skip the detour.

> **Cost:** the core runs for **cents per day** (low single-digit dollars on a very heavy day). The memory summarizer fires often but uses a cheap model at low reasoning effort; the deeper "recall" features run rarely. We make the cost tradeoffs explicit as we go — that's [a principle](docs/principles.md#4-token-economy), not an afterthought.

## The idea in one line

Treat the model as a capable but **forgetful, blind-to-itself** collaborator: give it memory, feed it carefully, remove its busywork, and never let it grade its own homework — all wired so the setup is reproducible.

That unpacks into **[ten principles](docs/principles.md)**. The four you'll feel first:

1. **Stateless model, disk-backed memory** — persistence is just _write a note before the model forgets, read it back next turn._
2. **`settings.json` is the router** — every behavior is one event mapped to one script. Learn that and the system is legible.
3. **Fail-silent** — a broken customization quietly does nothing; it never breaks your session.
4. **Token economy** — the cheapest token is one that never enters context.

The full set — including verification gates, vendor-diverse review, and self-improvement — lives in **[docs/principles.md](docs/principles.md)**, and each lesson names the principle it teaches.

## Where you're headed

By the end of **Part 4** you'll have a **[Minimum Viable Harness](docs/glossary.md#mvh-minimum-viable-harness)**: a memory-keeping, self-logging, code-aware harness that runs on **one LLM key and nothing else**. Parts 5–8 are additive.

## Level-up modules (optional)

The core needs only one LLM key. Four optional modules — covered in [Part 7](course/07-level-up/) — add power at the cost of extra setup: a token-compression filter, an auto-approval gate, multi-vendor peer review, and a Stream Deck for physical controls. Each is clearly marked with what it requires (extra CLIs, paid keys, or hardware), so you opt in deliberately.

## License

MIT — see [LICENSE](LICENSE). Build on it freely.

**Want to contribute?** The most valuable contribution to a teaching repo is telling us where a lesson lost you — [open a lesson-feedback issue](.github/ISSUE_TEMPLATE/lesson_feedback.md). For fixes and improvements, see [CONTRIBUTING.md](CONTRIBUTING.md) (the answer keys must stay CI-green, so it has a couple of ground rules).

---

_Repo root · [course](course/) · [docs](docs/) · [reference](reference/)_
