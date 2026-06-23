# What Is a Harness?

> The gentlest possible introduction. If you've never written a hook or touched an API key, start here. No jargon goes undefined.

## The one-minute version

Claude Code is an agentic coding tool — it reads your codebase, edits files, and runs commands, and it even remembers some things across sessions on its own. But two everyday gaps remain:

1. **It forgets the specifics.** Every so often it compacts (this is called [compaction](glossary.md#compaction-context-compaction)) — summarizing the older conversation and dropping the exact detail of what you were just doing. Claude Code _does_ carry some memory across sessions (a `CLAUDE.md` you write, plus auto memory it keeps), but it's coarse — the fine-grained story of a session still resets.
2. **It does the same things repeatedly,** and you re-type the same instructions, re-explain your preferences, and re-discover the same mistakes.

A **harness** is a thin layer you build _on top of_ Claude Code to close those gaps. It's not a different tool — it's _your_ Claude Code, extended. (Claude Code is itself an agentic "harness" around the Claude model; here you're extending that harness through its own seams.) With a harness, Claude can:

- **Remember** what happened across sessions (write notes to disk, read them back).
- **Run your shortcuts** (type `/plan` instead of a paragraph of instructions).
- **Check its own work** before declaring it done.
- **Suggest its own improvements** over time, for you to approve.

That's it. The rest of this repo is just _how_.

## What is a harness made of?

Five kinds of pieces. You'll learn each one in its own lesson — don't worry about mastering them now:

| Piece                                                | In one sentence                                                                       | Lesson   |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------- | -------- |
| [Hooks](glossary.md#hook)                            | Little scripts that run automatically at set moments (e.g. when Claude edits a file). | Part 1–2 |
| [Commands](glossary.md#command-slash-command)        | Shortcuts you type, like `/plan`, that expand into saved instructions.                | Part 3   |
| [Skills](glossary.md#skill)                          | Packaged abilities Claude can choose to use on its own.                               | Part 3   |
| [Agents](glossary.md#sub-agent)                      | Helper Claude instances you hand a focused job to.                                    | Part 3   |
| [MCP server](glossary.md#mcp-model-context-protocol) | A small program Claude can ask about your code, or use to store memory.               | Part 4   |

The clever part is that **all of it is wired together by one file**, [`settings.json`](glossary.md#settingsjson), which says "when _this_ happens, run _that_ script." Learn that one idea and the whole system becomes legible.

## Why build your own instead of installing one?

You _can_ just install the finished [reference harness](../reference/) and use it. But the goal of this course is bigger: once you understand the handful of patterns, you can build exactly the harness _you_ want — and customize Claude Code for your own workflow, team, or company. Claude Code ships its own version of some of these pieces (memory, subagents); building them yourself is how you learn to control them and push past the defaults. The reference harness is the worked example, not the destination.

## What you need (and what you don't)

**You need:**

- [Claude Code](https://docs.claude.com/en/docs/claude-code) installed and working.
- [Node.js](glossary.md#nodejs-and-esm--mjs) version 20 or newer. _Not sure if you have it?_ Run `node --version` in your terminal. If that errors or shows a number below 20, install the latest from [nodejs.org](https://nodejs.org).
- One [LLM API key](glossary.md#api-key) for the memory features (next section explains this).
- Willingness to copy-paste commands and read error messages. That's the real prerequisite.

**You do _not_ need:**

- To be an AI engineer or know machine learning.
- Any paid hardware or extra subscriptions for the core (those are optional [Part 7](../course/07-level-up/) add-ons).
- To understand TypeScript deeply — we scaffold the one TypeScript part heavily.

## What is an API key?

An **API key** is a secret password that lets your computer use an AI provider's model in the background. The harness uses a small, cheap model to summarize and diagnose your sessions — that needs a key.

**How to get one (one-time, ~5 minutes):**

1. Pick a provider that offers a small, cheap model. Any will do; common choices are OpenAI, Azure OpenAI, or an "OpenAI-compatible" service.
2. Create an account and find the "API keys" page in its dashboard.
3. Create a new key and **copy it** (it usually starts with letters like `sk-`). You won't be able to see it again, so paste it somewhere safe for a moment.
4. Tell the harness about it by setting [environment variables](glossary.md#environment-variable) in your terminal:

   ```bash
   export LLM_API_KEY=sk-your-key-here
   export LLM_MODEL=your-providers-small-model     # the model's name from the provider's docs
   export LLM_BASE_URL=https://api.openai.com/v1   # your provider's endpoint
   ```

> ⚠️ **One important wrinkle.** The reference harness talks to the [OpenAI _Responses_ API](glossary.md#openai-responses-api-vs-chat-completions-api). OpenAI and Azure OpenAI support it directly. Many cheaper "OpenAI-compatible" providers (OpenRouter, Together, Groq, Ollama, and others) only speak the older _Chat Completions_ format — so the course gives you a small **adapter** to use them. If you're brand new, just start with OpenAI to avoid the detour; switch later.

**Cost:** the background model is tiny and runs at low effort, so typical use is **cents per day** — on a very heavy day, low single-digit dollars. We make every cost tradeoff explicit as we go; see [Where to spend tokens](where-to-spend-tokens.md).

**Safety:** your key is a password. Put it in an environment variable, never in a file you commit to git. The reference harness only ever reads it from the environment for exactly this reason.

## Ready?

- Want the ideas next? → [The event model](the-event-model.md) and [the Memento pattern](the-memento-pattern.md).
- Want to start building? → [Course Part 0: Orientation](../course/00-orientation/).
- Hit an unfamiliar word anywhere? → [Glossary](glossary.md).
