# Part 7 — Level-up modules

**Difficulty:** Mixed · **Time:** opt-in, ~30–60 minutes each · **Status:** all four are optional add-ons past the [Minimum Viable Harness](../../docs/glossary.md#mvh-minimum-viable-harness)

You finished the MVH at the end of Part 4 and packaged it in Part 6. Everything in Part 7 is **bolt-on**: four independent tools you can adopt one at a time, in any order, or skip entirely. None of them is on the MVH critical path. Each one earns its place by removing a specific friction or blind spot.

📖 **Read alongside:** [The Ten Principles](../../docs/principles.md) — these four modules are where principles 4 (token economy), 6 (friction reduction), and 9 (vendor diversity) stop being abstract.

## These are opt-in and dependency-gated

Unlike Parts 0–6, these modules depend on **things outside the repo** — a CLI you install with `brew`, an LLM key that bills per call, a second AI vendor, a physical Stream Deck. So each lesson states its **requirement up front**, in a box you read before you commit any time. If you don't have the requirement, read the lesson for the idea and move on — the principle transfers even if the tool doesn't.

Three of the four ship a real, solo-verifiable **Checkpoint**. The fourth (7.4) is **hardware-gated**: it needs a device this course can't ship you, so it's honestly labeled as a demo with **no solo checkpoint**. We don't fake a checkpoint you can't actually run.

## The four modules

| Lesson                                          | What it adds                                           | Requirement                                      | Checkpoint?                        | Principle                                                                      |
| ----------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------ |
| [7.1 tokf](7.1-tokf/)                           | Compress verbose command output before it hits context | Install a free CLI (`brew`)                      | ✅ real                            | [4 — token economy](../../docs/principles.md#4-token-economy)                  |
| [7.2 cf-approve](7.2-cf-approve/)               | Auto-approve provably-safe permission prompts          | LLM key · **bills per uncached decision**        | ✅ real (allow + deny fixture)     | [6 — friction reduction](../../docs/principles.md#6-friction-reduction)        |
| [7.3 Chorus / Polyphony](7.3-chorus-polyphony/) | Multi-vendor peer review before you ship               | ≥2 authenticated AI CLIs (OpenRouter fallback)   | ✅ real (verdicts from ≥2 vendors) | [9 — vendor diversity](../../docs/principles.md#9-vendor-diversity-for-review) |
| [7.4 claude-deck](7.4-claude-deck/)             | A physical button surface for Claude Code              | **Hardware** — a Stream Deck (or the mobile app) | ⛔ none (hardware-gated demo)      | the two-pipe (read/write) split                                                |

There's no "before you start the next lesson recalls this one" chain across Part 7, because the modules are independent. Each lesson's **Before you start** recalls something from an **earlier Part** instead.

## A word on cost

Two of these spend money in different ways, and it's worth being clear-eyed before you wire them in:

- **7.2 cf-approve** makes a **paid LLM call on every permission decision it hasn't seen in the last 7 days.** A 7-day cache softens that, but if you wire it carelessly — say, against an expensive model — it can quietly run up a bill across a busy week. The lesson teaches the cache and the safety model precisely so you adopt it with your eyes open.
- **7.3 Chorus** can be **free** if your reviewers are CLIs you already pay a subscription for (e.g. a Claude Pro plan and a ChatGPT plan), or **pay-per-use** if you route through OpenRouter. It never asks for a new vendor key of its own — each CLI brings its own auth.

`tokf` (7.1) is free at runtime — it's a local binary. `claude-deck` (7.4) costs only the hardware.

## What you'll have if you do all four

A harness that **says less** (tokf strips the noise out of command output), **asks less** (cf-approve clears the safe prompts), **trusts less blindly** (Chorus brings a second vendor's eyes before you ship), and **reaches into the physical world** (claude-deck puts approve/reject/interrupt under your thumb). None of it changes the core harness — they layer on top of the router you've had since Part 1.

## Self-assessment

Answer these before moving to the capstone. If one is shaky, revisit the lesson it points to.

1. **tokf filters command output aggressively. Why is that _safe_ — what stops it from hiding something you needed?**
   <details><summary>Answer</summary>The compression is <b>lossless via an escape hatch</b>. Filtered output carries a 🗜️ marker, and the full, unfiltered bytes are kept on disk; <code>tokf raw last</code> recovers them on demand. So filtering is a <i>view</i>, not a <i>deletion</i> — the model (or you) can always fall back to the complete output. Aggressive filtering is safe precisely because it's reversible. (Lesson 7.1.)</details>

2. **cf-approve auto-approves by default and only denies a short explicit list. Why that direction, and not the reverse (deny by default, allow a list)?**
   <details><summary>Answer</summary>The whole point is <a href="../../docs/principles.md#6-friction-reduction">friction reduction</a> — clear the common, safe path so a human only sees the genuinely risky one. A deny-by-default policy would prompt you constantly and defeat the purpose. So the model is <b>default-allow with a narrow, named, explicit-deny set</b> (credential exfiltration, destructive ops outside the working dir, force-push to protected branches, and a few more). You make the safe path frictionless and keep the small risky set visible. (Lesson 7.2.)</details>

3. **Why convene a _different vendor's_ model to review a change, instead of asking the same model that wrote it to double-check its own work?**
   <details><summary>Answer</summary>A model reviewing its own output shares its own blind spots — it's <a href="../../docs/principles.md#9-vendor-diversity-for-review">theater, not review</a>. A different vendor's model was trained differently and fails differently, so it catches what the author model is constitutionally blind to. Diversity of perspective <i>is</i> the value; that's why Chorus shells out to ≥2 distinct vendor CLIs and gates on their agreement. (Lesson 7.3.)</details>

4. **Callback to Part 1 (the router):** claude-deck's status tiles update without the deck ever asking Claude Code anything. How does state get from a Claude Code session onto a physical button — which Part-1 mechanism is doing the work?
   <details><summary>Answer</summary><b>Hooks</b> — the same event→script router from Part 1. Claude Code hooks write small JSON <i>state files</i> to disk on lifecycle events; the deck plugin <i>watches those files</i> and re-renders its tiles. The deck never calls an API — it reads files that hooks wrote. (That's the "read" pipe of the two-pipe model; the "write" pipe is synthetic keystrokes going the other way. Lesson 7.4.)</details>

---

_[Course map](../README.md) · [docs](../../docs/) · [reference](../../reference/)_
