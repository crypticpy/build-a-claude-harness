# Harness Atlas — Build Plan

**Companion to** `01-prd.md` (what to build), `04-design-system.md` (the design language), and `05-visualization-blueprints.md` (the five set-pieces). This is the implementation plan: dependency-ordered milestones, each with a goal, deliverables, what it depends on, and a verification exit gate. No milestone is "done" until its exit gate is green.

## Objective

Ship the MVP defined in `01-prd.md`: a standalone, concept-first, two-phase static site on GitHub Pages. Phase 1 teaches the harness primitives via HEVA modules; Phase 2 is a scroll-driven teardown of the reference harness climaxing on safe autonomy. The MVP scope is the 17 features marked MVP in the PRD (F1-F6, F9-F19); F7, F8, F20-F24 are fast-follow.

## Operating constraints (locked, from the design system)

These are not re-litigated here; they are enforced by lint and CI from milestone 0 onward.

- Astro static MPA, one URL per module under `/<repo>/`. GitHub Actions deploy (`configure-pages` to `upload-pages-artifact` to `deploy-pages`), not Jekyll, with `.nojekyll`.
- Preact only as island runtime, `client:visible` only, never `client:load`. React, React Flow, and GSAP are banned (lint-enforced). `d3-*` is build-time only and banned inside any `client:` file. `filter: blur` is banned (grep guard). Root-absolute URLs are banned (the `href()` base-path helper is the only path builder).
- Three components only may hold `useState` (Calculator, QuizEngine, ScenarioSorter); decorator islands (TracePlayer, ApprovalGate) hold a single integer cursor and mutate present static SVG.
- Tri-render contract: every visualization is one typed model rendered three ways (animated SVG, first-class data twin, static no-JS fallback) from one author pass.
- Budgets (CI-enforced): reading routes ship 0KB render-blocking framework JS; each viz island at most 35KB gz; each interactive page at most 60KB gz total JS; Lighthouse Performance at least 95 and Accessibility at least 100 on representative routes.
- WCAG 2.2 AA: select-then-place primary for every drag (2.5.7); targets at least 24px (2.5.8); everything authored on `currentColor` plus shape plus dash so forced-colors is a designed skin; `prefers-reduced-motion` forks to duration 0 from the same step-script.

## Critical path and parallelism

The spine is strictly serial through milestone 5, because every set-piece depends on it: **scaffold to provenance gate to token spine to grammar kit to CI gate harness**. After that, two tracks run in parallel:

- **Island track:** TracePlayer, then SV-3 and SV-1, then ApprovalGate and SV-4, then SV-2 and SV-5, then the three stateful islands.
- **Content track:** once the HEVA shell (milestone 4) lands, prose and structure for non-viz module beats can be drafted in parallel; a viz-bearing module is only finalized once its set-piece lands.

Content authoring is the dominant cost (F2 and F15 are effectively XL in the PRD). Treat it as the long pole and start it as early as the shell allows.

---

## Milestone 0 — Repo scaffold and deploy spine

**Goal.** A walking skeleton that deploys to GitHub Pages under the base path, with the guardrail lint rules live before any real code exists.

**Deliverables.**
- Astro + TypeScript project with `@astrojs/preact`; `astro.config` sets `site` and `base` for `/<repo>/`; `.nojekyll` emitted.
- GitHub Actions Pages workflow (`configure-pages`, `upload-pages-artifact`, `deploy-pages`).
- A styled, base-path-correct 404 that resolves under `/<repo>/`.
- One placeholder page that builds and serves.
- ESLint config with the guardrail rules: ban `react` / `react-dom` / `reactflow` / `gsap` imports anywhere; ban `d3-*` and `filter: blur` and `client:load` inside `client:` files; ban root-absolute URLs (require the `href()` helper); fail on a stateful island outside the sanctioned allowlist.

**Depends on.** Decision on where the site lives (see Decisions to confirm). Recommended default: a `site/` subdirectory of `build-a-claude-harness`.

**Verify (exit gate).** The placeholder page is served by GitHub Pages under the base path; the 404 resolves; a deliberately planted lint violation (a `react` import, a `client:load`, a root-absolute URL) fails the lint job.

## Milestone 1 — Provenance pipeline and the pinned SHA (the build gate)

**Goal.** Every factual claim the site will make is generated from real files at a frozen, resolvable SHA, and drift fails the build. This gate is green before any visualization is built.

**Deliverables.**
- A frozen clean committed SHA in `build-a-claude-harness` (`--pin-sha`), recorded in one config.
- `scripts/extract-excerpts.mjs`: regenerates every code excerpt from the live file at the pinned SHA.
- The CI link-checker: resolves every repo permalink, fails on a 404.
- Model generators that read the real `reference/settings.template.json`, the hook modules, and `course/07-level-up/7.2-cf-approve/.../evaluate-policy.mjs`, and fail the build if any subscribed-flag, row count, command string, module path, or rule id drifts.
- The single pinned facts file (F19): the five wired events, the five named harms, the 8000 / 25000 token budgets, each carrying a permalink.

**Depends on.** Milestone 0. The site reading the teaching repo's files at the pinned SHA (trivial if the site is a subdirectory; otherwise a pinned fetch/submodule).

**Verify (exit gate).** Planted drift (alter a command string in a generated model) fails CI; a planted broken permalink fails CI; regenerated excerpts byte-match source; the facts file values resolve to their permalinks.

## Milestone 2 — Token spine and base layout

**Goal.** The whole design language as enforced tokens, with the phase tone as a single `<body>` attribute swap.

**Deliverables.**
- `tokens.css` with every token from the design system (surfaces, ink, signal, status, focus, typed edges, type scale, spacing, radii, borders, textures, motion).
- `BaseLayout` that sets surface-lightness, grid-opacity, and data-tier on `<body>` so phase tone is a swap, not a fork; no component is phase-aware in its own code.
- The `FocusRing` system (named double-stroke, at least 3:1, declarative `:focus-visible`, forced-colors to system Highlight).
- Self-hosted subset fonts (`font-display: swap`); the serif marked as the cuttable layer if the font budget bites.
- The `href()` base-path helper and a `CrossPhaseLink` stub.

**Depends on.** Milestone 0.

**Verify (exit gate).** A token-reference page renders every token; a forced-colors screenshot shows focus and surfaces surviving; Lighthouse on the static reference page is at least 95 Performance and 100 Accessibility; the reading route ships 0KB framework JS.

## Milestone 3 — The frozen diagram grammar kit (F2, XL)

**Goal.** Freeze the shared model contract and the render kit that all five set-pieces consume, so the visualizations are configuration over this kit, not five bespoke renderers.

**Deliverables.**
- The frozen `DiagramModel` / `TraceModel` TypeScript contract (nodes, edges, steps, inspector payloads).
- `FlowNode` (the node taxonomy: router diamond, dispatcher hub, module rounded-rect, disk cylinder, LLM hexagon, tool pill, with fixed-seed build-time corner jitter).
- `TypedEdge` (triple-channel hue plus dash plus glyph, neutral at rest, type revealed only on the lit segment).
- `DiagramFrame` (vellum grid, prose/figure subgrid) and the auto-generated `Legend` (rendered from the same node/edge components so it cannot drift).
- The build-time `d3-shape` layout producing path-string JSON (zero d3 at runtime).
- The tri-render emitter: one model produces the static SVG, the `<table>` / `<ul role=tree>` twin, and the ordered step list.
- `TwinPanel` plus `ViewToggle` ("SVG / DATA", CSS-only hidden-radio).

**Depends on.** Milestones 1 and 2.

**Verify (exit gate).** A fixture model renders identically-sourced across all three renders; the legend matches the diagram because it shares components; forced-colors keeps node type via shape and edge type via dash plus glyph; no `d3-*` import survives into a `client:` bundle.

## Milestone 4 — HEVA module shell, content pipeline, and persistence

**Goal.** The teaching chassis: a module is authored once as validated content and renders as Hook / Explain / Visualize / Apply, fully legible JS-off.

**Deliverables.**
- `ProgressRail` plus the HEVA Beat shell (sections with a sticky anchor rail; two-track fast-path vs go-deeper via native `<details>`; `IntersectionObserver` enhancement-only).
- `PredictionCommit` (the Hook beat; CSS-only radio plus `:checked` sibling reveal; answer key in `<details>`).
- `EvidencePin` / `CodeExcerpt` / `RepoLink` (build-time Shiki, vellum chrome, permalink at the pinned SHA).
- `Fact` / `Caveat` typographic components (the only path to the pinned-fact stamp and the verbatim caveat).
- Astro content collections / MDX validated against a frozen Zod `ContentModule` schema.
- `store.ts` (localStorage under `claude-harness-atlas:v1`, try/catch pub/sub that never throws, in-memory fallback, export/import/reset) and the footer `ReadinessMeter` (a no-state custom element, not an island).

**Depends on.** Milestones 2 and 3.

**Verify (exit gate).** A sample module renders all four beats JS-off; malformed content fails the Zod build; the store survives a quota-exceeded throw; the reading route ships 0KB framework JS; an `EvidencePin` permalink resolves at the pinned SHA.

## Milestone 5 — CI budget and accessibility gate harness

**Goal.** Wire every budget and a11y gate before the first island merges, so every set-piece is continuously gated from birth (the red-team's explicit instruction).

**Deliverables.**
- Per-island gzip budget (fail above 35KB) and per-page JS budget (fail above 60KB).
- The 0KB-render-blocking-framework assertion on reading routes (parse built HTML for hydration directives on non-viz routes).
- Lighthouse CI (Performance at least 95, Accessibility at least 100) on representative routes.
- axe-core / Pa11y, the no-JS smoke test, the `filter: blur` grep guard, and the Playwright forced-colors screenshot job (screenshots of SV-1, SV-3, SV-4 are required review artifacts).
- The excerpt-drift, link-checker, and rule-id-drift jobs from milestone 1 wired into the same required-checks set.

**Depends on.** Milestones 1 and 4.

**Verify (exit gate).** A planted oversized island fails the budget job; a planted `filter: blur` fails the grep; a planted hydration directive on a reading route fails the 0KB assertion; the forced-colors job produces artifacts; all jobs are required checks on the branch.

## Milestone 6 — Shared motion island: TracePlayer

**Goal.** The one motion engine that SV-1, SV-3, and SV-5 reuse, built against SV-3 (the richest consumer).

**Deliverables.**
- `TracePlayer` (Preact, `client:visible`): play/pause/step/scrub, the single token's `offsetDistance` tween via Motion One, the synced inspector cross-fade, the disk-accretion sub-choreography, and the `aria-live` narration.
- A single integer step cursor as the only state; mutates the present static SVG, never re-renders content.
- Roving-tabindex and live-region writes as ~1 to 2KB of vanilla DOM kept outside the Preact reconciler.
- The `matchMedia` reduced-motion fork (duration 0) from the same step-script.

**Depends on.** Milestones 3 and 5.

**Verify (exit gate).** The island is at most 35KB gz; reduced-motion teleports while controls stay live; keyboard traversal walks step order and drives the same cursor as the animation; the SVG and the twin never disagree because both read one cursor; forced-colors drops the glow to a `currentColor` token.

## Milestone 7 — SV-3 (capstone) then SV-1 (hero)

**Goal.** The two TracePlayer consumers, with their dialed-in elevations.

**Deliverables.**
- **SV-3** with the elevations from the blueprint: the loop drawn closed at rest (racetrack, equal stroke weight), each payload tethered to its node on a 1px leader-line, the disk cylinder as the only node that grows, the scrubber reframed as the loop arc, and edges neutral at rest.
- **SV-1** reusing TracePlayer: the fan-out token split scoped to PostToolUse (the one event that genuinely fans out here), order-as-trust numbering, the dashed-hollow unsubscribed PreToolUse kept, the one-edge-type legend, and the resolved contract-row provenance treatment.

**Depends on.** Milestone 6.

**Verify (exit gate).** Each viz is within its island budget and the page budget; forced-colors screenshots pass review; the no-JS floor renders the full thesis; the model-drift CI is green (PreToolUse genuinely unsubscribed, five events wired, PostToolUse two matchers, all at the pinned SHA); the contract row is either probe-pinned or honestly marked unpinnable, never faked.

## Milestone 8 — ApprovalGate and SV-4 (climax)

**Goal.** The safe-autonomy climax, with provenance that resolves and the verbatim honesty captions enforced.

**Deliverables.**
- `ApprovalGate` island (~22KB): a single step/verdict cursor; `evaluate()` ported verbatim from the 7.2 `evaluate-policy.mjs` (five `DENY_RULES` plus default-allow fallthrough); Motion One used only for the detonation stagger.
- The elevations: ALLOW lane removed (silent dim, no pill), the matched rule's real "why" string rotated into the diamond, the detonation re-skinned as the stolen-night timeline (3 vs 247 baked glyphs), the lopsided base-rate dock, the human-glyph residue carried into the detonation, and the cost meter cut from the climax.
- The permanent diagonal-hatch teaching band with both verbatim caveats at verdict type-size, as static markup outside the island.
- CI greps the five rule ids and the verbatim caveat constants against the live `evaluate-policy.mjs`.

**Depends on.** Milestones 5 and 6.

**Verify (exit gate).** Island within budget; rule-id and caveat greps green against the real course file; select-then-place is the primary keyboard path with drag additive; reduced-motion forks the detonation to a two-frame with the same delta; the twin table is the primary accessible truth with verdicts as text plus shape; forced-colors screenshot passes.

## Milestone 9 — SV-2 and SV-5 (Tier-2 set-pieces)

**Goal.** The two bespoke Tier-2 visualizations, reusing the twin conventions.

**Deliverables.**
- **SV-2** (decorator island, ~14 to 16KB): the shared split-lane drag strip, the constant-velocity wall-clock sweep line, the persistent ghost tick, the disjoint-file lock as the parallelism trigger, context-teardown as the expensive beat, and overlap-guard promoted to a real third toggle state; the evidence pin targets a committed SHA, never the dirty working tree.
- **SV-5** (decorator island, ~22KB): free rendered as a positive sand-hum material, the billed tier given the amber meter gutter, the click separated from the scan with the instant "appended · 0 tokens" stamp, the scanner originating from the bottom, the held-breath climax, and the receipt-stamp through-fact; the primary twin is a `role=tree`.

**Depends on.** Milestones 5 and 6.

**Verify (exit gate).** Each island within budget; SV-5's tree twin is keyboard-primary and present JS-off including the post-select brain subtree; the metered-vs-free asymmetry survives forced-colors via the tick-mark geometry (not hue); SV-2's sweep line is one duration-0-forkable tween and the comparison is mirrored in the data twin.

## Milestone 10 — Stateful islands and navigation components

**Goal.** The remaining interactive teaching components and the cross-phase wayfinding.

**Deliverables.**
- `ScenarioSorter` plus `MasteryMeter` (select-then-place primary with roving focus and Enter; drag is an additive listener on the same `place()`; degrades to a static `<form>` matching exercise; the item bank asserts at build that no option lacks a discriminating-feature feedback string).
- `QuizEngine` (predict-the-outcome, assertion-reason, confidence-weighted, misconception-buster; immediate elaborated aria-live feedback; never color-only correctness; answer key in `<details>`).
- `Calculator` (the token-economy 8000 / 25000 budget-to-frequency tool for P1-M7).
- `PhaseTransition` / through-question banner (CSS custom-property flip plus a tiny `IntersectionObserver`, no island, present JS-off) and the full `CrossPhaseLink` (dimmed "territory you will walk later" state when a region is unbuilt).

**Depends on.** Milestones 4 and 5.

**Verify (exit gate).** Exactly three components hold `useState` (lint-enforced); select-then-place works by keyboard for the sorter; every quiz and sorter item degrades to a legible static answer key JS-off; the item-bank discriminator assertion fails the build on a missing feedback string.

## Milestone 11 — Content authoring (the long pole)

**Goal.** Author the two phases. This runs in parallel with milestones 6 to 10 wherever a beat does not depend on an unbuilt set-piece.

**Deliverables.**
- Phase 1: the eight Foundations modules (P1-M1 to P1-M8), each as a full HEVA module with a committed-prediction Hook, an evidence-pinned Explain, its visualization, and an ungated Apply quiz.
- Phase 2: the eight case-study layers (P2-L1 to P2-L8) as the scroll-driven teardown held on the persistent sticky SV-3 map, climaxing on SV-4.
- The exit terminal: the plain-language outcome statement plus the one prominent copy-the-prompt action pointing at the repo at the pinned SHA.
- The five signature visualizations placed in their home modules (SV-1 hero/landing, SV-2 and SV-5 in their Foundations modules, SV-3 as the Phase-1 capstone and Phase-2 territory, SV-4 as the climax).

**Depends on.** Milestone 4 for all prose; the relevant island milestone for each viz-bearing beat.

**Verify (exit gate).** Every module passes the Zod schema; every asserted claim carries an `EvidencePin` or a `Caveat`; the unslop scanner shows only sanctioned furniture (no prose em dashes); every interactive beat has its JS-off floor; the readiness meter aggregates honestly.

## Milestone 12 — Launch hardening

**Goal.** Final verification across the whole site and deploy.

**Deliverables.**
- A manual NVDA plus VoiceOver pass (a budgeted, required review artifact) across the five set-pieces and a representative module.
- Lighthouse on every representative route (each phase landing, a module, the capstone, the climax).
- The `/freview` gate (this change touches far more than six files and includes input handling and the approval-gate logic, so it qualifies).
- A reviewed deploy preview, then promote.

**Depends on.** Milestones 7, 8, 9, 10, 11.

**Verify (exit gate).** All CI gates green on all representative routes; the manual SR pass is logged with no blocking issues; the deploy preview is reviewed; the production URL serves under the base path with the 404 and no-JS floors intact.

---

## Verification strategy (per CLAUDE.md: if you cannot verify it, do not ship it)

Verification is built into each exit gate above. The standing checks that run on every set-piece:

- **Provenance:** excerpt-drift, link-checker, model-drift, and rule-id-drift are required checks; no viz merges while any is red.
- **Budgets:** per-island gzip and per-page JS budgets, plus the 0KB-framework assertion on reading routes, run per PR.
- **Accessibility:** axe-core / Pa11y, Lighthouse A11y at least 100, the no-JS smoke test, and forced-colors screenshots run per PR; the manual SR pass is a launch gate.
- **Tri-render parity:** because all three renders derive from one typed model, the test asserts the model is the single source; a divergence is a build failure, not a visual diff.

## Risks (carried from the PRD and design system)

- **Content is the dominant cost.** Mitigation: start authoring at milestone 4, parallelize non-viz beats, and treat the schema as the contract so prose and engineering proceed independently.
- **Two XL set-pieces (F2 grammar kit, F15 content).** Mitigation: the grammar kit is milestone 3 and frozen before any viz; content is the long pole tracked separately.
- **Island budget creep.** Mitigation: the per-island gzip gate is wired at milestone 5, before the first island, so creep fails the PR that causes it.
- **Provenance drift after the pin.** Mitigation: the pin SHA is frozen once at milestone 1 and every generated fact is checked against it; bumping the pin is a deliberate, reviewed change that re-runs all drift checks.

## Decisions to confirm (before milestone 0 scaffold)

1. **Where the site lives (recommended: a `site/` subdirectory of `build-a-claude-harness`).** This keeps the provenance pipeline reading sibling files at the pinned SHA with no fetch or submodule, and deploys via one Actions workflow scoped to that subdirectory. The alternative (a separate repo) cleanly isolates the site but forces a pinned fetch or submodule of the teaching repo for every excerpt and permalink. Recommending the subdirectory unless you want the site versioned independently.
2. **The canonical pin SHA.** Freeze a clean committed SHA in `build-a-claude-harness` at milestone 1. The teaching repo currently has uncommitted changes, so this is a deliberate freeze, not "current HEAD."
3. **Light mode (F23) stays deferred.** The grammar is authored on `currentColor`, so it remains an additive token swap in fast-follow; confirm it is not wanted for MVP.
