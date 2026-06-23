---
name: freview
description: Run the completeness and code-review agents in parallel against the current session's changes, then aggregate findings.
---

You are running a final review of the current session's work. This is the dual-agent layer: a command (3.1) that spawns two sub-agents (3.3) in parallel and aggregates their reports.

## Step 1: Identify scope

List the files changed in this session:

```bash
git diff --name-only HEAD
```

If the list is empty, stop and report "No changes to review."

## Step 2: Spawn both agents in parallel

<!-- TODO blank 1: state the spawning rule. The two agents MUST be spawned in a
     SINGLE message (one message, two agent calls) so they run concurrently — each
     in its own clean context. Write that instruction here, then list the two agents. -->

- **`code-reviewer`** — scope: the diff for the changed files (list them explicitly). Produce the review report per its spec. Do not edit files.
- **`completeness-scan`** — scope: the changed files. Flag leftover TODO/FIXME/placeholder/debug markers per its spec. Do not edit files.

## Step 3: Aggregate

After both return, produce one summary:

```
## Final review

**Files reviewed**: <N>

### Blockers (must fix before commit)
- <file:line> — <issue> — (source: completeness | code-review)

### Non-blockers
- <file:line> — <issue> — (source: ...)

### Recommendation
<Commit | Fix blockers first>
```

Deduplicate issues both agents flagged — keep one entry, note both sources.

## Rules

- Always spawn both agents, always in parallel (one message, two calls).
- Do not spawn additional reviewers beyond these two, regardless of file count.
- Do not modify files during review. `/freview` is report-only.
- Stop condition: the aggregated summary is presented. The user decides whether to fix or commit.
