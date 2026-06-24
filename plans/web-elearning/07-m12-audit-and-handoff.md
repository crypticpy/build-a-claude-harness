# M12: Audit, Fixes, and Stress-Test Handoff

Status: the Harness Atlas site is feature-complete (M0 through M11), audited by a
multi-agent workshop, all confirmed findings resolved, and ready for your stress
testing. Everything is on the local branch `feat/harness-atlas-site`. Nothing has
been pushed.

## What this is

A standalone Astro 5 static site (`site/`) that teaches the architecture of the
reference Claude Code harness concept-first: Phase 1 is eight Foundations rooms,
Phase 2 is eight teardown layers, ending on a copy-able prompt that points your
own agent at the reference repo. Sixteen HEVA modules (Hook / Explain / Visualize
/ Apply), five signature visualizations, every interactive beat with a JS-off
floor.

## How to run and test it

```bash
cd site
npm install
npm run verify     # generate models from real source, build, guardrails, budgets, links
npm run preview    # serves dist/ at http://localhost:4321/build-a-claude-harness/
```

`npm run verify` is the full gate. It regenerates `src/generated/{models,facts}.json`
from the real reference source at the pinned commit, runs the Zod content gate, and
checks guardrails (no banned deps, no em dashes, no root-absolute URLs), per-route JS
budgets, and links. Headless smoke tests live in the session scratchpad (10 suites,
281 checks, all green at handoff).

## The audit (multi-agent workshop)

Five parallel finders (factual/provenance for each phase, accessibility, code
correctness, voice/pedagogy), then adversarial verification of every high/critical
finding. Code correctness came back clean (no bugs, desyncs, double-counts, or
hydration failures). Eleven findings total; all confirmed ones are now fixed.

### Resolved

**Factual / provenance**
- `the-rolling-log` taught that the log is purely append-only and "never reads its
  own file and writes it back." The real `file-edits.json` counter is a
  read-modify-write. Rewritten around the true two-tier design: an append-only
  per-operation record (safe under the PostToolUse race) plus an advisory counter
  that takes a lossy read-modify-write. The graded hook answer was inverted before;
  it is correct now.
- `subagents-fan-out` pinned evidence to `CLAUDE.md`, which does not exist in the
  repo (dead permalink). Repointed to the real rule at `reference/commands/plan.md`.
- `the-context-layer` said the MCP server exposes "three tools." It registers four
  (`semantic_lookup`, `impact_check`, `brain_search`, `brain_remember`). "Three" was
  the JSON-RPC method count. Corrected throughout.
- `commands-skills-agents` located the skill-rules decoy at "the repo root." The
  loader actually skips a redirect stub in the project's `.claude/skills/`. Corrected.
- `fail-silent` asserted "errors still go to stderr." That is DEBUG-gated and
  module-level, not unconditional. Qualified.

**Assessment validity**
- The correct answer was hook=`b` and apply=`a` in all 16 modules, so answering
  "b then a" passed the entire course without reading. Added a deterministic
  per-question option shuffle (`src/lib/shuffle.ts`); the correct position now
  spreads (hook `{0:8,1:5,2:3}`, apply `{0:5,1:3,2:8}`), so no constant strategy
  passes. Grading keys off option id, so the JS-off floor, the island, and the
  answer key all stay consistent.
- Balanced the five questions where the correct option was dramatically the longest.

**Accessibility**
- ExitTerminal copy button now announces success through a polite live region.
- FlowNode nodes no longer render as `role="button"` tab stops; the trace player
  never wired them, so they were inert controls. The data-twin table carries the
  content for keyboard and screen-reader users.
- ApprovalGate chips drop their SSR `role`/`tabindex` and are promoted to operable
  buttons only on hydration, so a JS-off reader never tabs into an inert control.

## Known residuals and deliberate deviations

These are intentional or low-priority. Flagging them so they are not surprises.

1. **Length heuristic, partially open.** After the position shuffle, "pick the
   longest option" still correlates with the correct answer on the ~11 questions
   not hand-balanced (medium severity, ungraded local-progress quiz). The compounding
   position attack is fully closed. Balancing the rest is a content-polish pass if
   you want it.

2. **Provenance: working tree is ahead of the pinned SHA for two files.** The site
   pins EvidencePin permalinks to committed `HEAD` but reads source from the working
   tree. `reference/hooks/unified/modules/{rolling-log,format-lint}.mjs` carry
   uncommitted local security patches, so for those two files the working tree is
   newer than what the permalink resolves to on GitHub. The rolling-log module is
   written to be accurate against the **committed** SHA (no atomic-rename claim, no
   line anchors that would drift). To remove the drift entirely, commit the reference
   patches and re-pin. No other module line-pins a patched file.

3. **Phase 2 is HEVA modules, not a sticky-scroll teardown.** The build plan's ideal
   for Phase 2 was a scroll-driven teardown over a sticky map. It ships as eight
   ModuleLayout HEVA modules instead: navigable, accurate, verified. The
   scrollytelling treatment is a deferred enhancement.

4. **"Exactly three useState" is a guideline, not a lint.** The three teaching
   islands (Calculator, QuizEngine, ScenarioSorter) are the genuine app-state
   holders. The decorator islands (TracePlayer, ApprovalGate, Sv2FanOut) each hold a
   single cursor in `useState`. This was left as-is rather than enforced with a
   breaking lint against working code.

5. **unslop scanner false-positive on "harness."** The scanner flags the domain noun
   "harness" as an AI-diction tell. It is the subject of the site and is not a tell.
   The real gate (zero prose em dashes) is clean.

## Not done in this environment (for your pass)

The accessibility review was static plus headless, not a manual assistive-technology
pass. Before a public launch, run:
- A real screen reader (NVDA / VoiceOver) over a representative module, the
  ScenarioSorter, the ApprovalGate, and the ExitTerminal copy flow.
- Lighthouse on `/`, a Phase 1 module, and a Phase 2 module.
- A review of the deployed Pages preview under the base path, confirming 404 and the
  JS-off floors survive.

## What to stress-test

- Work a full module: commit a prediction, read, drive the visualization, take the
  apply check. Confirm the verdict, answer key, and readiness meter behave.
- Turn JS off and confirm every beat still teaches (prediction reveal, quiz radios,
  Calculator floor table, ScenarioSorter matching form, ExitTerminal selectable
  prompt).
- Keyboard-only: tab through a module, the sorter (select-then-place), and the gate.
- Click the visualization controls (play / step / scrub) and the data-view toggle.
- Copy the exit prompt from `phase-2/running-for-hours`.

## Standing constraints (unchanged)

Private repo, do not make public. Never push, never force push. No real secrets in
the teaching repo; the reference reads keys from the environment only. New commits go
to `feat/harness-atlas-site`, site paths only; the pre-existing modified course/docs/
reference files stay uncommitted and untouched.
