---
description: Run the deep retrospective across all history (sessions, edits, tool ops) and present the report.
---

You are running the periodic cross-session retrospective. Use this occasionally
(e.g. every ~50 sessions), not every session.

## Step 1: Run

```bash
echo '{}' | node $HOME/.claude/hooks/unified/modules/deep-retrospective.mjs
```

Expect 30–60 seconds. If it returns `success: false`, report the reason and stop
(most often: no LLM key, or not enough history yet).

## Step 2: Read the report

```
$HOME/.claude/hooks/unified/evolution/retrospective-YYYY-MM-DD.md
```

## Step 3: Present, in order

1. Efficiency score and trend.
2. Meta-learnings — present the top 3; skip the rest unless asked.
3. Harness recommendations — high-priority ones first.

Stop after each section and ask if the user wants to drill in. Do not dump the
full report.

## Rules

- This is a **read-mostly** command. It writes only into `evolution/`.
- Do **not** apply recommendations without explicit approval — use the `/evolve`
  flow for that.
- Stop condition: the user has decided what (if anything) to act on.
