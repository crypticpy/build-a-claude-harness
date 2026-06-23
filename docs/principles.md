# The Ten Principles

These are the transferable ideas behind the harness — the part worth keeping even if you never use a single line of the reference code. Each lesson names the principle it teaches; this page is the canonical list, with the reference harness as evidence.

You don't need to absorb these up front. Meet them one at a time in the course, then come back here and they'll read like old friends.

> A few early lessons name an _operational primitive_ instead of one of these ten — what a [hook](glossary.md#hook), a [command](glossary.md#command-slash-command), or an [MCP server](glossary.md#mcp-model-context-protocol) actually _is_. That's deliberate: you need the mechanics before the principle that rides on them. Those primitives are foundations, not a missing eleventh principle. The ten below are the transferable _design_ ideas.

---

## 1. Stateless model, disk-backed memory

The model remembers nothing on its own between sessions, and it actively forgets mid-session at [compaction](glossary.md#compaction-context-compaction). So persistence isn't a feature you bolt on — it's a simple pair of moves: **write what matters to disk before the model forgets, read it back at the start of the next turn.** That read/write pair _is_ the memory system; everything else is plumbing.

> Evidence: the harness writes a session-memory file on the `PreCompact` event and re-injects it on the next `UserPromptSubmit`. Taught in [Part 2](../course/02-memory/).

## 2. `settings.json` is the router

Every behavior in the harness is one mapping: _when this event happens, run that script._ There's no framework and no magic — just a table of events to commands. Internalize that and the entire system becomes legible; you can read any behavior by finding its row.

> Evidence: a single dispatcher script is wired to every lifecycle event in `settings.json`. Taught in [Part 1](../course/01-foundations/).

## 3. Fail-silent

A customization that crashes your session is worse than no customization. Every hook exits cleanly even when it fails, and every optional dependency is allowed to be missing. The harness degrades; it never breaks your work.

> Evidence: hooks catch their own errors and exit 0; missing tools downgrade to a no-op. Taught in [Part 1](../course/01-foundations/).

## 4. Token economy

The cheapest [token](glossary.md#token) is one that never enters the [context window](glossary.md#context-window-or-context). Compress verbose output, summarize instead of dumping, and choose models and effort by how often a job runs versus how much it matters. Spend where it counts.

> Evidence: the rolling log costs nothing (no AI call); the summarizer uses a cheap model at low effort because it runs constantly. Taught in [Part 2](../course/02-memory/) and [Where to spend tokens](where-to-spend-tokens.md).

## 5. Distilled intelligence over raw bytes

Don't hand the model whole files when it needs an answer. Hand it the _processed_ thing: a file's purpose, what depends on a function, a symbol's signature. A small program that distills code is worth more context than a big dump of source.

> Evidence: the MCP server answers `semantic_lookup` and `impact_check` instead of returning raw files. Taught in [Part 4](../course/04-mcp/).

## 6. Friction reduction

Every confirmation prompt is a small tax on throughput. Auto-approve what's provably safe, and surface only what genuinely needs a human. Make the common path frictionless and the risky path visible.

> Evidence: an optional auto-approval gate clears safe permission requests with a tight, default-allow policy. Taught in [Part 7](../course/07-level-up/).

## 7. Human-in-the-loop self-improvement

The system is allowed to _propose_ but not to _apply_. It aggregates lessons from your sessions and drafts concrete improvements; you review and decide. Automation that changes itself without your sign-off is a liability, not a feature.

> Evidence: `/evolve` synthesizes lessons into proposals for you to accept or reject. Taught in [Part 5](../course/05-self-improvement/).

## 8. Verification gates

Nothing is "done" until something checks it. A test, a type-check, or a reviewer agent stands between "I think it works" and "it ships." If you can't verify it, don't claim it.

> Evidence: stop-time quality gates and review agents run before work is reported complete. Taught in [Part 3](../course/03-workflow/).

## 9. Vendor diversity for review

A model reviewing its own work is theater — it shares its own blind spots. Real review comes from a _different_ model, ideally a different vendor. Diversity of perspective is the point.

> Evidence: the optional multi-vendor review tool convenes other models to critique a change before you ship. Taught in [Part 7](../course/07-level-up/).

## 10. Idempotent, templated setup

Install should be safe to run a hundred times. Generate live config from tracked templates so secrets stay out of the repo and re-running never double-installs or corrupts state.

> Evidence: the installer is re-runnable and builds `settings.json` from a template. Taught in [Part 6](../course/06-packaging/).

---

**The thread that ties them together:** treat the model as a capable but forgetful, blind-to-itself collaborator. Give it memory (1, 2), feed it carefully (4, 5), remove its busywork (3, 6), and never trust it to grade its own homework (7, 8, 9) — all set up so the wiring is reproducible (10).
