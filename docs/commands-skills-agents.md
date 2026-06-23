# Commands, Skills & Agents

> Three ways to give Claude Code new tricks. They look similar at a glance, so the useful thing to learn is _which one to reach for_. The short version: **you type a command, Claude picks a skill, and an agent runs off on its own.**

## The three primitives at a glance

| Primitive                                          | What it is                               | Who decides to use it           | Runs where             |
| -------------------------------------------------- | ---------------------------------------- | ------------------------------- | ---------------------- |
| [Slash command](glossary.md#command-slash-command) | A saved prompt with a name               | **You** (you type `/name`)      | Your conversation      |
| [Skill](glossary.md#skill)                         | An ability Claude can choose to invoke   | **Claude** (description-driven) | Your conversation      |
| [Sub-agent](glossary.md#sub-agent)                 | A focused job with its own clean context | You or Claude delegate it       | A **separate** context |

All three are just Markdown files with a little [YAML](glossary.md#nodejs-and-esm--mjs) frontmatter. No code to compile. The difference is _who pulls the trigger_ and _where the work runs_.

## Slash command — a saved prompt you type

A slash command is a paragraph of instructions you got tired of re-typing, saved under a name. You invoke it explicitly: you type `/plan` and Claude expands the file into your conversation as if you'd pasted it. The frontmatter is minimal — a `name`, a `description`, and an optional `argument-hint`; `$ARGUMENTS` is where your text lands.

From [`reference/commands/plan.md`](../reference/commands/plan.md):

```yaml
---
name: plan
description: Produce a short implementation plan before coding. Scale planning effort to task size.
argument-hint: <task description>
---
You are planning before implementation for: $ARGUMENTS
```

**Reach for a command when:** _you_ know you want this behavior right now, and you want to trigger it by name. `/plan`, `/evolve`, `/retrospective`, `/freview` are all just saved prompts. The reference harness ships them in [`reference/commands/`](../reference/commands/).

## Skill — an ability Claude invokes itself

A skill is like a command, but **Claude decides on its own when to use it** — based on the skill's `description`. That description is not decoration: it's the text the harness matches against the situation to decide whether to load the skill. So a skill's description is written to say _exactly when it applies_, and the body says how to do the job.

From [`reference/skills/example-skill/SKILL.md`](../reference/skills/example-skill/SKILL.md):

```yaml
---
name: design-review
description:
  Review a UI change against a short, fixed checklist before it ships.
  Use when the user asks for a design review, asks "does this look right", or shares
  a screenshot/component and wants feedback — not for building new UI from scratch.
---
```

Notice the description spends as much energy on **when _not_ to use it** as on when to. That's the craft of a good skill: keep it narrow — one job, one checklist, one stop condition — so the model invokes it at the right moment and not otherwise. Skills can also ship helper scripts alongside the Markdown, which commands typically don't.

**Reach for a skill when:** you want a capability available _without naming it_ — Claude should notice the situation and pull it in. You describe the trigger precisely; the model handles the timing.

## Sub-agent — a job with its own clean context

A [sub-agent](glossary.md#sub-agent) is a separate Claude instance you hand a focused job to. The crucial property: it works in its **own clean [context window](glossary.md#context-window-or-context)** and reports back only its conclusion. A big, noisy job (read forty files, review a whole diff) doesn't clutter your main conversation — the agent does the sprawling work in its own space and returns a tidy summary.

From [`reference/agents/principal-code-reviewer.md`](../reference/agents/principal-code-reviewer.md):

```yaml
---
name: principal-code-reviewer
description: Review the diff for introduced bugs and new security issues.
  Invoke from `/freview` or when the user explicitly asks for a code review.
color: red
---
You are reviewing the diff. Produce a report. Do not edit files.
```

A good agent gets **one objective, the files it owns, and the exact output shape expected back.** That review agent, for example, is told precisely what to flag, what _not_ to flag, and how to format its report.

**Reach for a sub-agent when:** the job is big enough to pollute your main context, or it's independent work that can run in parallel with other work. Don't spawn one for something that fits in a single tool call — the overhead isn't worth it.

## How they compose

These aren't rivals; they nest. A command can call a skill, and either can spawn an agent:

> `/freview` (a **command** you type) → spawns the `principal-code-reviewer` and `final-review-completeness` **agents** in parallel → each runs in its own context → you get back two short reports.

That's the pattern to internalize: the thing you _type_ (command) orchestrates the things that _run on their own_ (agents), and skills slot in wherever the model should decide for itself. This is also where [verification gates](principles.md#8-verification-gates) live — a review agent standing between "I think it works" and "it ships."

## Where this shows up

- **Course [Part 3: Workflow layer](../course/03-workflow/)** — you build one of each: a slash command, a skill, a sub-agent, and a verify gate.
- **Reference:** commands in [`reference/commands/`](../reference/commands/), the worked skill in [`reference/skills/example-skill/SKILL.md`](../reference/skills/example-skill/SKILL.md), agents in [`reference/agents/`](../reference/agents/).
- **The events that fire `/evolve` and `/retrospective`:** [the event model](the-event-model.md). **What they cost:** the `recall` role in [Where to spend tokens](where-to-spend-tokens.md).

---

_[docs index](README.md) · [glossary](glossary.md) · [principles](principles.md)_
