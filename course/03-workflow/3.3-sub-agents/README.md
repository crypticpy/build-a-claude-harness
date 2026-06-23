# 3.3 — Sub-agents

A command runs in your conversation. A skill runs in your conversation. A **sub-agent** runs somewhere else: its own clean context window. You hand it one focused job — review this diff, read these forty files — and it does the sprawling work in its own space and reports back only its conclusion. Your main conversation stays uncluttered. This lesson builds a `code-reviewer` agent with a fixed report shape, and reads (does not run) the cautionary tale of an agent that tried to do something agents can't.

## Objectives

By the end, you will be able to:

- **Write** a sub-agent definition that gives it one objective and a strict output shape, and **prove** a report in that shape passes a structural validator.
- **Explain** the no-wakeup gotcha — why a sub-agent cannot notify or wake the main session mid-run — from the annotated `pr-babysitter` example.

Each objective maps to the Checkpoint below.

## Time

12–18 minutes.

## Before you start

> 🧠 **No peeking (recall from 3.2):** You added a skill-activation rule and it never fires, even on prompts that clearly match. You edited `skills/skill-rules.json` at the top level. What's wrong, and where does the real rule belong?
>
> <details><summary>Answer</summary>The top-level <code>skills/skill-rules.json</code> is a <b>decoy</b> — a <code>{"redirect": true}</code> stub the activation hook deliberately skips. The canonical rules file is <code>hooks/unified/skill-rules.json</code>. A sub-agent has its own version of "where does this actually live" surprises — read on.</details>

Confirm 3.2 works (your matcher test passes 5/5). Then copy this lesson's `start/`:

```bash
cp -r start my-agent && cd my-agent && cp -r ../fixtures .
```

## The lesson

### Principle: a job with its own clean context, returning one fixed shape

A sub-agent is a separate Claude instance you delegate a focused job to. Two properties matter:

- **Clean context.** The agent reads the diff, reasons line by line, maybe reads helper files — and none of that noise lands in your main conversation. You get back the conclusion, not the forty-file slog.
- **A fixed output shape is the contract.** You tell the agent exactly what to return — which headers, which fields, in what order — so the parent (or a script) can rely on the structure without re-reading the agent's reasoning. A good agent gets _one objective, the files it owns, and the exact report shape expected back._

### Why it matters

Two reasons. First, **context hygiene**: a big review or a wide search would otherwise fill your window with bytes you'll never look at again. Second, **parallelism**: independent agents run at once (that's how `/freview` runs its two reviewers — you'll wire that in 3.4b). The cost is real, though — spawning an agent has overhead, so you don't reach for one for a job that fits in a single tool call.

### How the reference does it

Your `code-reviewer` is a trimmed [`reference/agents/principal-code-reviewer.md`](../../../reference/agents/principal-code-reviewer.md): same frontmatter (`name`, `description`, `color`), same "flag only these three categories / never flag these" discipline, same fixed report block. The `description` is how the parent decides to delegate — just like a skill's description, but the agent runs elsewhere. (See [commands-skills-agents](../../../docs/commands-skills-agents.md).)

### ⚠️ The no-wakeup gotcha (read, don't run)

A sub-agent is **one call, one return**. The parent spawns it, it does bounded work, it returns a final message, the parent reads it. There is **no channel back into the parent while the agent is running** — no "ping me when X happens," no timer, no wake-up. The deprecated `pr-babysitter` agent was written as if it could watch a PR for ten minutes and notify the main session on each new comment. It can't, and `fixtures/no-wakeup-annotated.md` walks through exactly why, line by line.

**Read [`fixtures/no-wakeup-annotated.md`](fixtures/no-wakeup-annotated.md) now.** It is a read-only annotation — there is nothing to launch and no checkpoint attached to it. The "watch and notify" pattern belongs to a polling loop the _main session_ owns (writing state to disk, read on the next prompt — the Part 2 Memento idea), not to a sub-agent. The rule to carry: if your design needs the agent to "keep going" or "tell me when," that's a loop/hook job, not an agent job.

### Build

Two things:

1. **`code-reviewer.md`** — fill **two blanks**: the `description` (blank 1) and the `**Scope**:` line in the output format (blank 2). The shape checker greps for that Scope line and the three headers.
2. **`check-shape.mjs`** — fill the body of `checkShape()` (two TODO regions): assert the three required headers are present, and that the Scope line states a file count. This is how a harness _consumes_ agent output — by pulling fields out of a known shape.

`fixtures/sample-report.md` is a report in the correct shape (your agent's target output); `fixtures/no-wakeup-annotated.md` is the read-only gotcha.

## Checkpoint

Validate the expected-shape report against your checker:

```bash
node check-shape.mjs fixtures/sample-report.md
```

✅ Prints `SHAPE OK — Scope: 2 files, 31 changed lines` and exits 0. That proves your validator accepts a well-formed report — the contract the agent must meet.

Now prove it _rejects_ a report that doesn't follow the shape (an agent that free-styled instead of using the headers):

```bash
printf '## Code review\n\nLooks fine, ship it.\n' > /tmp/bad.md
node check-shape.mjs /tmp/bad.md ; echo "exit=$?" ; rm /tmp/bad.md
```

✅ Prints `SHAPE MISMATCH` listing the missing `**Blockers**:`, `**Non-blockers**:`, and `**Scope**:` lines, and exits 1. The structural gate is what lets you trust an agent's output without re-reading it.

> 👀 **You should also see…** (live, not the gate): drop `code-reviewer.md` into a real `.claude/agents/` directory, make a small diff, and ask for a review. The agent runs in its own context and returns a report in this shape. The validator above is what you can verify solo.

## Recap + next

You built a sub-agent whose contract is its output shape, and proved a conforming report passes a structural check while free-prose fails it. And you read why a sub-agent can't wake you up — that watch-and-notify work lives in a loop, not an agent.

→ **[3.4a — Quality gates](../3.4a-quality-gates/)**, where you stop _triggering_ behavior and start _gating_ it: a `Stop`-time check that runs your type-checker only when files changed, and never throws.
