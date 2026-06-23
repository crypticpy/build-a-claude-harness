---
description: Aggregate session lessons and surface proposed harness improvements for user review.
---

You are running the harness self-evolution analysis. It reads the lessons log
(written by the trace-diagnosis hook on PreCompact), aggregates the patterns,
calls the `recall` LLM role to synthesize them, and presents proposals for your
approval. It applies nothing on its own.

## Step 1: Run the analysis

```bash
echo '{}' | node $HOME/.claude/hooks/unified/modules/self-evolution.mjs
```

If it returns `success: false`, report the reason and stop. Common reasons: not
enough sessions have hit PreCompact yet (see `evolution.minSessionsForAnalysis`
in `config.json`), or no LLM key is configured (`LLM_API_KEY`).

## Step 2: Read the proposals

```
$HOME/.claude/hooks/unified/evolution/proposals.md
```

## Step 3: Present, one at a time

For each proposal, show the user: title, target file, the exact change,
confidence level, and your own one-line take (agree / disagree / need more
data). Wait for an explicit approve or reject before the next one.

## Step 4: Apply approved changes

For each approval: read the target file, make the change exactly as described,
then in `proposals.md` change `[ ] Pending review` to `[x] Applied <YYYY-MM-DD>`.
For each rejection: change it to `[-] Rejected <YYYY-MM-DD> — <reason>`.

## Rules

- **Never apply a proposal without explicit user approval.** The model proposes;
  the human disposes.
- If a proposal contradicts `CLAUDE.md`, surface the conflict and ask which wins.
- Stop condition: every proposal has an approve/reject status logged.
