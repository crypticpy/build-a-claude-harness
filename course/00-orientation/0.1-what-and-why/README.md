# 0.1 — What is a harness, and why?

## Objectives

By the end of this lesson you will be able to:

- **State** in one sentence what a harness is.
- **State** in one sentence what compaction is, and why it's the problem half this course solves.

## Time

~5 minutes. Reading only — no code.

## Before you start

Nothing to set up. If you want the long version of everything here, open [What is a harness?](../../../docs/what-is-a-harness.md) in another tab and read it after this lesson.

## The lesson

### Principle

A **harness** is the layer of code and configuration you build _on top of_ Claude Code to make it behave the way _you_ want — automatically, every time, without you having to ask. (Claude Code is itself an agentic tool around the model; you're extending it through its own seams.)

Out of the box, Claude Code is already capable — it even carries some memory across sessions (a `CLAUDE.md` you write, plus auto memory it keeps). But that memory is coarse, it doesn't know all your team's conventions, and it does mostly what you type and little more. A harness closes those gaps. It's the difference between a sharp knife and a sharp knife _with a handle, a guard, and a sheath_ — same blade, far more usable, far harder to hurt yourself with.

Concretely, a harness is made of small pieces that each react to a moment:

- A script that runs **every time you submit a prompt**, quietly adding context the model should have.
- A script that runs **every time Claude edits a file**, logging what changed.
- A note the harness **writes to disk before it forgets**, and **reads back** when you return.

None of these are clever on their own. The course is about wiring enough of them together that the whole feels like a tool that _knows you_.

### Why this matters: compaction

One fact motivates the biggest part of this course, and it's worth understanding before you build anything.

Claude Code has a **context window** — a finite amount of text it can "see" at once: your conversation, the files it read, the commands it ran. When that window gets close to full, Claude Code performs **compaction**: it summarizes the older parts of the conversation and drops their **verbatim** detail to make room. This is necessary — without it, long sessions would simply hit a wall — but it means **Claude forgets specifics**. The careful decision you made an hour ago, the reason you rejected approach A for approach B, the exact file it was about to fix — all of it can get squeezed out.

You've probably felt this even if you didn't have a name for it: a long session where Claude starts re-asking things it already knew, or re-discovering a file it edited twenty minutes ago.

A harness can't stop compaction. But it can do something better: **notice the moment compaction is about to happen, write down what matters, and feed it back in afterward.** That write-then-reinject move is called the **Memento pattern** (after the film about a man who tattoos notes to himself because his memory resets). It's the heart of Part 2, and it's why "what is compaction?" is a question worth being able to answer cold.

### How the reference does it

You don't need to read any code yet. Just know the shape: the [reference harness](../../../reference/) is a handful of small scripts, each tied to a moment in Claude Code's lifecycle, plus a memory layer that survives compaction. By the end of Part 4 you'll have built a working version of it yourself. Everything starts from the two ideas on this page.

### What you build

Nothing in this lesson. You're loading the mental model. The building starts in Part 1.

## Checkpoint

This is a knowledge checkpoint, not a code one. Say each of these out loud (or write them down) in your own words, in **one sentence each**:

1. What is a harness?
2. What is compaction, and why does it make Claude forget?

If both come out clean without scrolling up, you've got it. A passing answer to #1 names "a layer around Claude Code that makes it behave a certain way automatically." A passing answer to #2 names "Claude Code summarizing and dropping older conversation to free up the context window, which loses specifics."

## Recap + next

You learned the two anchor ideas of the whole course: a harness is automation you build on top of Claude Code (extending it), and compaction is the loss of specifics that the harness's memory layer exists to soften.

Next: **[0.2 — The event model and the router](../0.2-event-model-and-router/)** — _how_ a script gets to run at those moments in the first place.

---

_[Part 0 home](../README.md) · 0.1 · [0.2 →](../0.2-event-model-and-router/)_
