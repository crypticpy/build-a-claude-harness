# 7.3 — Chorus / Polyphony: a second vendor's eyes before you ship

A model reviewing its own work is theater. It shares its own blind spots — the things it's constitutionally bad at seeing, it's equally bad at seeing in its own output. Real review comes from a **different** model, ideally a **different vendor**, trained differently and wrong in different places. **Chorus** (the tool was rebranded **Polyphony**; the binary kept the `chorus` name) convenes two or more vendor models to review a change in parallel and gives you their verdicts before you ship.

> 🎻 **Requirement (read before you start):** You need **≥2 authenticated AI CLIs** on your PATH — for example Claude Code plus a second vendor's CLI (Codex, Gemini CLI, or similar), each already logged in. Chorus shells out to them; it stores **no vendor keys of its own** — each CLI brings its own auth. If you only have one CLI, **OpenRouter is the zero-extra-CLI fallback**: route a second "vendor" through it without installing anything else. If you can't get two distinct models, read the lesson for the principle — vendor diversity is the idea worth keeping.

## Objectives

By the end, you will be able to:

- **Explain** the vendor-diversity principle: why a different vendor's model, not the authoring model, is what makes review real.
- **Describe** the "bring your own CLI" model — how Chorus convenes installed vendor CLIs as reviewers without holding their keys.
- **Run** a Chorus review on a real change and **collect verdicts from ≥2 distinct vendors**, then read how their agreement (or disagreement) gates "ship."

Each objective maps to the Checkpoint below.

## Time

30–45 minutes (most of it the one-time CLI setup).

## Before you start

> 🧠 **No peeking (recall from Part 3):** In 3.3 you built a sub-agent and its contract was its **output shape** — a fixed report you could parse without re-reading the reasoning. Chorus aggregates several reviewers into one verdict. Why does a _fixed verdict shape_ matter even more when there are 3 reviewers than when there's 1?
>
> <details><summary>Answer</summary>With one reviewer you can eyeball the prose. With three, you have to <i>compare and aggregate</i> them — apply a quorum rule (unanimous? majority?), surface the dissent, decide ship/no-ship. That's only mechanizable if every reviewer returns the <b>same parseable shape</b> (a verdict + findings). The fixed shape is the contract that lets Chorus combine N opinions into one gate, exactly as the sub-agent's fixed report let the parent consume it in 3.3.</details>

This lesson has no `start/` — you're wiring real CLIs and running a real review. Everything is below.

## The lesson

### Principle: vendor diversity for review

[Principle 9](../../../docs/principles.md#9-vendor-diversity-for-review): a model reviewing its own work shares its own blind spots, so real review comes from a _different_ model — ideally a different vendor. This is not a small optimization. The failure modes of a frontier model are systematic: there are classes of bug, of security hole, of bad assumption that a given model tends to miss _and_ tends to produce. Ask it to grade its own homework and it waves through exactly the mistakes it's most prone to. A model from a **different vendor** was trained on different data with different objectives; its blind spots don't line up with the first model's. Where they disagree is where the bugs hide. **Diversity of perspective is the entire point** — not redundancy, _difference_.

### How it works: bring your own CLI

The design choice that makes Chorus practical is this: it doesn't ask you for a pile of vendor API keys. Instead it **detects the AI CLIs you already have installed and authenticated** — your Claude Code, your Codex CLI, your Gemini CLI — and **shells out to them as subprocesses**, feeding each one the change and the review prompt on stdin. Each CLI uses its own existing auth. Chorus is an **orchestrator**, not a key vault: it holds no vendor credentials, it just convenes the tools already sitting on your machine.

That design has three nice consequences:

- **Cost follows your existing plans.** If your CLIs are subscription-based (a Claude plan, a ChatGPT plan, a Gemini plan), a review can cost **nothing out of pocket** — you're using seats you already pay for. Route through OpenRouter instead and it's pay-per-use. Either way Chorus adds no new vendor bill of its own.
- **No new key to leak.** Nothing for the depersonalization check in Part 8 to catch, because Chorus stores no vendor keys.
- **The fallback is built in.** Only have one CLI? Point a second reviewer at **OpenRouter** — one endpoint, many models — and you've got vendor diversity with zero extra CLIs installed.

### The review flow and the verdict

A run looks like this:

1. **Pick a review template** — what kind of review (a general code review, a bug hunt, an architecture critique). The template sets the prompt and which reviewers to convene.
2. **Spawn the reviewers in parallel** — N vendor CLIs each get the change and review prompt at once.
3. **Each returns a structured verdict** — a per-reviewer judgment (approve / changes-requested / blocked) plus its specific findings.
4. **Aggregate against a quorum rule** — unanimous, majority, etc. — into one overall result. Disagreement isn't a failure; it's the _signal_. When vendor A approves and vendor B blocks on a security concern, that split is the most valuable output of the whole run — it's pointing straight at something one model sees and the other doesn't.

So a "verdict" is: each vendor's stance + findings, plus the aggregated ship/no-ship. You read the aggregate to decide, and you read the **dissent** to learn.

### How the reference does it

In the harness, Chorus is registered as an **MCP server** (`claude mcp add chorus …`) backed by a small local daemon, and driven by a **`/chorus` slash command**. You type `/chorus <what to review>`, the command routes to the Chorus MCP tools (create a review, wait for it, stream back results), and the reviewers run. The command is strict about one thing: when you asked for `/chorus`, it must **actually run Chorus** — it's forbidden from quietly substituting a single-model self-review, because a self-review is exactly the theater the whole tool exists to avoid. If the daemon isn't running or no second vendor is available, it tells you, rather than faking diversity.

> 🧩 **MCP + slash command, both from earlier parts.** Nothing here is a new primitive: it's a Part-4 MCP server convened by a Part-3 slash command. Chorus is those two pieces pointed at the vendor-diversity principle.

## Checkpoint

The checkpoint is a single observable outcome: **a real change gets verdicts from ≥2 distinct vendors.**

**Setup once.** Confirm two authenticated CLIs (or one CLI + an OpenRouter-backed reviewer):

```bash
which claude          # vendor 1 (Claude Code)
which codex || which gemini   # vendor 2 — or configure an OpenRouter reviewer
```

**Run a review on a real change.** Make a small, deliberately-flawed change in a repo (e.g. an off-by-one, or a function that ignores an error), then:

```bash
# in a Claude Code session, with the Chorus MCP server registered:
/chorus code-review please review my uncommitted change
```

✅ **You got it when** the result shows **a verdict from each of two different vendors** — two distinct reviewer names/models, each with its own stance (approve / changes-requested / blocked) and its own findings — aggregated into one ship/no-ship call. If both verdicts trace to the _same_ vendor, you haven't achieved diversity: add a second CLI or wire the OpenRouter fallback and re-run.

> 👀 **The richest signal is disagreement.** If your two vendors _split_ on the flawed change — one waves it through, one flags it — you've directly witnessed the principle: the second vendor caught what the first was blind to. That split is worth more than two rubber-stamp approvals. (If both miss it, make the flaw more obvious and re-run; the point is to _see_ two independent judgments, not to grade the models.)

## Recap + next

You added a non-human review gate that draws its value from **difference**: Chorus convenes ≥2 vendor CLIs you already have, feeds each the same change, and aggregates their structured verdicts — with disagreement as the signal, not the noise. The mechanism is a familiar pair (an MCP server driven by a slash command); the new idea is vendor diversity, and why a model can't meaningfully review itself.

→ **[7.4 — claude-deck](../7.4-claude-deck/)** is the one Part-7 module with no software checkpoint — it puts approve/reject/interrupt on a physical Stream Deck, and teaches the two-pipe (read/write) split that connects buttons to a Claude Code session. (Or head to **[Part 8 — the Capstone](../../08-capstone/)** to assemble and publish your own harness.)
