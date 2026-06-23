# Part 3 — Workflow layer

**Difficulty:** Intermediate · **Time:** ~70 minutes

Part 2 gave the harness a memory. This part gives it a **workflow**: the things you trigger on purpose. You'll build one of each primitive — a slash command you type, a skill Claude invokes for itself, a sub-agent that runs in its own clean context — and then two **verification gates** that stand between "I think it works" and "done."

📖 **Read alongside:** [Commands, Skills & Agents](../../docs/commands-skills-agents.md)

## Why this part matters

Memory is passive: it works whether or not you think about it. The workflow layer is **active** — it's the set of buttons you (or the model) press to get a specific, repeatable behavior. Three primitives cover it, and the only thing worth memorizing is _which one to reach for_:

| Primitive         | Who pulls the trigger                   | Runs where             |
| ----------------- | --------------------------------------- | ---------------------- |
| **Slash command** | **You** type `/name`                    | Your conversation      |
| **Skill**         | **Claude** decides (description-driven) | Your conversation      |
| **Sub-agent**     | You or Claude delegate it               | A **separate** context |

The last two lessons add the gates: a `Stop`-time **quality gate** that runs your type-checker only when files changed, and a **verification checklist** that injects a self-review when you've edited several files in one turn. Both are LLM-free and both **fail silent** — the discipline you codified in Part 1.

## The five lessons

Each adds exactly one primitive. Do them in order — every "Before you start" recalls a prior lesson.

| Lesson                                                      | You build                                                         | New idea                                              |
| ----------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------- |
| [3.1 Slash commands](3.1-slash-commands/)                   | A `/plan`-style command (Markdown + frontmatter, `$ARGUMENTS`)    | a saved prompt you type; `$ARGUMENTS` expansion       |
| [3.2 Skills](3.2-skills/)                                   | A skill + `skill-rules.json` + the activation matcher             | two activation paths; the decoy-stub gotcha           |
| [3.3 Sub-agents](3.3-sub-agents/)                           | A `principal-code-reviewer`-style agent with a fixed report shape | own clean context; the no-wakeup gotcha               |
| [3.4a Quality gates](3.4a-quality-gates/)                   | A `Stop`-time gate that runs only on change, never throws         | a gate that blocks "done" on a real failure           |
| [3.4b Verification checklist](3.4b-verification-checklist/) | The `verification-check` module + `/freview`                      | self-review on a burst of edits; the dual-agent layer |

## What you'll have at the end

One of every workflow primitive, wired the way the reference harness wires them: a command you invoke by name, a skill the model pulls in on its own, an agent that does noisy work in a clean context and returns a tidy report, and two cheap gates that catch "done too early." None of the gates costs a token; the command and skill cost nothing until _you_ ask for work.

## Self-assessment

Answer these before moving on. If one is shaky, revisit the lesson it points to.

1. **Command vs skill vs agent — which fits each of these?**
   (a) a saved prompt you type by name; (b) a big, noisy job that needs its own clean context; (c) an ability Claude should invoke for itself when it notices the situation.
   <details><summary>Answer</summary>(a) <b>slash command</b> — you pull the trigger, it expands into your conversation (3.1). (b) <b>sub-agent</b> — separate context window, reports back only its conclusion (3.3). (c) <b>skill</b> — Claude decides based on the <code>description</code>; you write the trigger precisely and the model handles the timing (3.2).</details>

2. **A skill won't activate even though your prompt clearly matches. You added a `skill-rules.json` at the top level of `skills/`. Why is it being ignored?**
   <details><summary>Answer</summary>The top-level <code>skills/skill-rules.json</code> is a <b>decoy</b> — a <code>{"redirect": true}</code> stub. The activation hook explicitly skips any rules file with <code>redirect</code> set. The canonical file the matcher loads is <code>hooks/unified/skill-rules.json</code>. Put your rule there. (Lesson 3.2.)</details>

3. **Your `Stop`-time quality gate runs `tsc` and the type-check fails. What should the gate do — and what must it never do?**
   <details><summary>Answer</summary>It should surface the failure (so "done" doesn't slide past a broken type-check) but it must <b>never throw</b> and never hard-block the <code>Stop</code> event — a crashing gate would break every turn. It also runs <b>only when files changed</b>; a clean tree is a no-op. (Lesson 3.4a.)</details>

4. 🔁 **Callback to Part 2's cost ladder — three of these workflow pieces touch an LLM and three don't. The quality gate and the verification checklist deliberately use _no_ model. Why is that the right call, and which Part-2 role would `/freview`'s review agents sit closest to?**
   <details><summary>Answer</summary>The gates run on <b>every</b> <code>Stop</code> — the highest-frequency moment there is. Part 2's ladder says high-frequency work must be cheap, and "did any file change / did I edit ≥3 files" is a deterministic check that needs no judgment, so it costs nothing. <code>/freview</code>'s agents <i>do</i> use a model, but they run <b>rarely and on demand</b> (you type the command) — closest to the <b>recall</b> role: spend more, seldom. (Part 2 / <a href="../../docs/where-to-spend-tokens.md">where-to-spend-tokens</a>.)</details>

## Where this leads

The workflow layer is what you _drive_. **[Part 4 — MCP](../04-mcp/)** gives the model new senses — `semantic_lookup` and `impact_check` over your own repo — and completes the [Minimum Viable Harness](../../docs/glossary.md#mvh-minimum-viable-harness). The `/freview` agents you meet here come back in Part 5, where `/evolve` and `/retrospective` are commands of exactly this shape.

---

_[Course map](../README.md) · [docs](../../docs/) · [reference](../../reference/) · [glossary](../../docs/glossary.md)_
