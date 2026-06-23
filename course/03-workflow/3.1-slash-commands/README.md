# 3.1 — Slash commands

A slash command is the simplest workflow primitive: a paragraph of instructions you got tired of re-typing, saved under a name. You type `/scope add retry logic`, and Claude Code expands the file into your conversation as if you'd pasted it — with everything after the name dropped in where `$ARGUMENTS` sits. No code compiles; it's just Markdown with a little frontmatter.

## Objectives

By the end, you will be able to:

- **Write** a slash command as a Markdown file with `name` / `description` / `argument-hint` frontmatter and an `$ARGUMENTS` placeholder.
- **Expand** that command deterministically — strip the frontmatter, substitute the arguments — and prove the output matches a shipped fixture.

Each objective maps to the Checkpoint below.

## Time

10–15 minutes.

## Before you start

> 🧠 **No peeking (recall from Part 2):** Your harness writes a session-memory note on `PreCompact` and re-injects it on `UserPromptSubmit`. Which of those two events is the _read_ side — the one that pulls saved context back in front of the model before your prompt reaches it?
>
> <details><summary>Answer</summary><code>UserPromptSubmit</code> (the <code>prompt</code> event) is the read side. A slash command rides the same idea: when you invoke it, its expanded text is injected into the conversation before the model responds — except here <i>you</i> pull the trigger by typing the name, instead of a hook firing automatically.</details>

Confirm Part 2 still works (you can write and read a memory note). Then copy this lesson's `start/`:

```bash
cp -r start my-command && cd my-command
```

## The lesson

### Principle: a command is a saved prompt with a placeholder

The whole mechanism is two steps. The file has **frontmatter** (metadata: the command's name, a one-line description for the picker, an `argument-hint`) and a **body** (the instructions). When you type `/scope <text>`, Claude Code throws away the frontmatter and pastes the body into your conversation — after replacing the literal token `$ARGUMENTS` with `<text>`. That's it. The model never sees the frontmatter; it sees the expanded body.

### Why it matters

Anything you find yourself typing the same way twice is a candidate. `/plan`, `/evolve`, `/retrospective`, `/freview` in the reference harness are all just saved prompts — the value is that the instruction is _consistent and versioned_, not retyped (and subtly different) each time. A command is the cheapest primitive: it costs nothing until you invoke it, and it adds zero machinery to the harness.

### How the reference does it

Look at [`reference/commands/plan.md`](../../../reference/commands/plan.md). Its frontmatter is minimal —

```yaml
---
name: plan
description: Produce a short implementation plan before coding. Scale planning effort to task size.
argument-hint: <task description>
---
You are planning before implementation for: $ARGUMENTS
```

— and the body is a multi-step instruction set. Your `/scope` command is the same shape, scoped smaller: restate a task, draw an in/out boundary, name a verification, stop. (See also [commands-skills-agents](../../../docs/commands-skills-agents.md) for how commands sit next to skills and agents.)

### Build

Two files in `start/`:

1. **`scope.md`** — a near-complete command. Fill **two blanks** (both marked `<!-- TODO -->`): the `$ARGUMENTS` placeholder, used twice in the body. This is the token Claude Code substitutes.
2. **`expand.mjs`** — a faithful, testable model of what Claude Code does to the file before the model sees it. Fill **two function bodies** (marked `// TODO`): `stripFrontmatter` returns the body after the closing `---`, and `expandCommand` replaces every `$ARGUMENTS` with the arguments. The real expansion is internal to Claude Code; this script lets your checkpoint _diff_ it.

`solution/` has both finished.

## Checkpoint

Expand your command with a fixed argument string and diff it against the shipped fixture:

```bash
node expand.mjs scope.md "add retry logic to the API client" > my-expansion.txt
diff my-expansion.txt ../fixtures/expected-expansion.txt && echo "MATCH"
```

✅ `diff` prints nothing and you see `MATCH`. That proves three things at once:

- the **frontmatter was stripped** (the output starts with `You are writing…`, not `---`),
- **both** `$ARGUMENTS` occurrences were replaced (the phrase "add retry logic to the API client" appears twice, and the literal `$ARGUMENTS` appears zero times),
- the expansion is **deterministic** — same input, same bytes, every time.

If `diff` shows a difference, you either left a `$ARGUMENTS` un-substituted (blank in `scope.md`) or your `expandCommand` didn't replace _all_ occurrences (blank in `expand.mjs`).

> 👀 **You should also see…** when you drop `scope.md` into a real `.claude/commands/` directory and type `/scope`, Claude Code offers it in the command picker and expands it live. That live behavior is the payoff — but the **diff above is the gate**, because it's the part you can verify solo with no model in the loop.

## Recap + next

You built the simplest workflow primitive: a saved prompt with one placeholder, plus a testable model of the expansion Claude Code does for you. The trigger is _you_ typing the name.

→ **[3.2 — Skills](../3.2-skills/)**, where the trigger moves to _Claude_: a skill the model invokes for itself based on its description — plus a hook that suggests it, and a decoy file that will cost you an afternoon of debugging if you don't know it's there.
