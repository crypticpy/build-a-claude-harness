# Harness Atlas — User Stories & Acceptance Criteria

**Companion to** `01-prd.md` (specification) and `00-brainstorm-session.md` (how the concept was reached). Feature ids (F1 to F24), module ids (P1-M1 to P1-M8, P2-L1 to P2-L8), and visualization ids (SV-1 to SV-5) reference the PRD.

**Reference harness pinned at:** `https://github.com/crypticpy/build-a-claude-harness` @ short SHA `5633273` (full `56332735b0518e5d3c1e692f8c4d7a1ce6e9cb0e`). All evidence deep links and the agent prompt target this repo at the pinned SHA.

Twenty-five stories across nine epics, each with Given/When/Then acceptance criteria. Stories are marked `must`, `should`, or `could`; the seventeen-feature MVP (PRD section 9) is the union of the `must` stories.

---

## Personas

### Priya — the delegating builder (primary)
A mid-to-senior full-stack developer who uses Claude Code daily and intends to extend it, but does not want to hand-write the harness. Her plan is to understand the architecture well enough to point her coding agent at the reference repo and say "build mine like this," then review what it produces. She values throughput, skims by default, and abandons anything that feels like a coding bootcamp. **Primary goal:** build accurate mental models of the harness primitives and how they compose, so she can confidently direct an AI agent and sanity-check the result.

### Marcus — the architect / safe-autonomy evaluator
A staff engineer or eng lead assessing whether to adopt an autonomous-agent harness on a real codebase. He is skeptical, security-conscious, and specifically wants to understand the safe-autonomy mechanism: how an agent can run for hours unattended without `--dangerously-skip-permissions` or a human babysitting every prompt. He needs claims anchored to real artifacts and will distrust the site if marketing outruns what the repo actually ships. **Primary goal:** evaluate the safe-autonomy approach on the merits, including its honest limits, before recommending adoption.

### Dev — the returning reference user
Someone who has already walked the course once (or is mid-build) and comes back to re-check one specific concept: "what's the difference between a skill and a subagent again?" or "what are the five named harms?" He does not want to re-walk the ladder; he wants to jump straight to a concept card, an evidence excerpt, or the deny-rule list, then leave. **Primary goal:** jump directly to a single concept, definition, or asserted fact and its source artifact without re-traversing the linear course.

### Sam — the accessibility-dependent learner
A developer who navigates by keyboard and screen reader, and/or has `prefers-reduced-motion` and `forced-colors` enabled. The interactive diagrams are the core teaching instrument, so the data-table/tree twin of every visualization is Sam's primary experience, not a degraded fallback. Sam also represents the JS-off floor. **Primary goal:** learn every concept and complete every knowledge check to the same depth as a sighted mouse user, through accessible diagram twins, keyboard-operable interactions, and a fully legible no-JS floor.

### Rosa — the mobile / hostile-network learner
A developer working from a phone on hotel or conference wifi, reading during a commute or between sessions. She has limited bandwidth, a small touch screen, and intermittent connectivity. **Primary goal:** make real progress on a phone over a slow connection, with fast-loading reading routes, touch-operable explainers, and reliably persisted progress.

---

## Epic 1 — Landing & Onboarding

### ONB-01 (Priya, must)
**As a** developer new to harnesses, **I want** a landing page whose hero gives me the core mental model in about 90 seconds before any prose, **so that** I can decide within a minute whether this course is worth my time and grasp what a harness fundamentally is.

- Given I load `/` (Home) with JS enabled, when the page renders, then the SV-1 Lifecycle Event Timeline (F6) appears as the hero above the fold and is interactive (scrub/click) without scrolling past prose first.
- Given the hero timeline, when I hover, focus, or tap one of the five event stations, then a tooltip names when that event fires and which job it drives, sourced from the pinned facts file (F19).
- Given I am on Home, when the page loads, then three suggested (not gated) paths are offered (New to harnesses to Foundations; Evaluating safe-autonomy to the case-study climax; Returning / specific concept to Concept Index), each a working base-path-correct link.
- Given JS is disabled, when I load Home, then the hero degrades to an ordered list carrying the same event-model table content and all three path links remain functional.
- Given I have prior progress in localStorage, when I return to Home, then a course-level progress bar reflects my completion percentage; with no stored progress it reads 0% and does not error.

### ONB-02 (Marcus, must)
**As an** architect evaluating the safe-autonomy approach, **I want** a clearly labeled path from the landing page straight to the safe-autonomy case study, **so that** I can assess the mechanism I care about without walking the whole Phase 1 ladder first.

- Given I am on Home, when I choose the "Evaluating safe-autonomy" path, then I land on the `/case-study/safe-autonomy` (P2-L8) module or a case-study entry that links directly to it in one click.
- Given I arrive at the safe-autonomy module without having completed Phase 1, when the page loads, then it is fully readable and the SV-4 interaction is usable: nothing is gated behind prior-module completion.

---

## Epic 2 — Phase 1 Concept Module (HEVA)

### P1-MOD-01 (Priya, must)
**As a** learner working through a Foundations concept, **I want** each module to follow the same Hook-Explain-Visualize-Apply rhythm with a visible progress rail, **so that** I always know where I am and can trust a predictable, skimmable structure.

- Given any Phase-1 module URL, when it renders, then it presents the four HEVA beats (F9) in order (a misconception Hook, a single dual-coded Explain screen of ≤150 words beside one diagram, a manipulable Visualize explainer, and an Apply scenario-plus-retrieval check) surfaced as a progress rail.
- Given the Explain beat, when I read it, then it corrects the documented misconception within the same screen and the body text stays at or under 150 words with the diagram beside it (dual-coded).
- Given the module top, when I arrive, then a cross-module recall warm-up of one to two earlier items appears for spaced retrieval, and answering it never gates access to the rest of the module.
- Given I want speed, when I view a module, then a two-track option lets me take "just the mental model" or expand "go deeper," and the fast path alone satisfies the module's completion criterion.
- Given JS is disabled, when I load the module, then all four HEVA beats' prose, the diagram data twin, and the quiz answer key (in `<details>`) are present and readable.

### P1-MOD-02 (Priya, must)
**As a** learner who holds a common wrong model, **I want** each module to open by asking me to commit a prediction to the documented misconception, then correct it, **so that** my wrong assumption is surfaced and replaced rather than quietly bypassed by exposition.

- Given a module's Hook beat, when it opens, then it presents the concept's documented misconception (from the content map's `commonMisconception` field) as a one-click prediction I make before any explanation.
- Given I commit a prediction, when I submit it, then the same screen reveals whether the common model is right or wrong and states the corrected model in one sentence, dual-coded (not color-only).
- Given the misconception "Skills are the same as commands" (P1-M4), when I am corrected, then the feedback names the discriminating feature (who pulls the trigger, you vs Claude, and where it runs, your context vs separate), not a bare "incorrect."

---

## Epic 3 — Interactive Visual Explainer

### P1-VIZ-01 (Priya, must)
**As a** visual learner, **I want** the event-model module's timeline to let me scrub a session and see each event route to its hook branch, **so that** I internalize that `settings.json` is just a routing table mapping events to scripts.

- Given the `/foundations/event-model` module (P1-M2, owns SV-1), when I scrub the playhead, then a context-window meter fills as tools run toward the PreCompact threshold and each event station lights the `unified-hook` branch it routes to.
- Given a station, when I activate it, then a drawer reveals the real `settings.template.json` routing row for that event, the stdin-to-stdout contract, and (for PostToolUse) its two matcher rows (`Write|Edit` vs `*`).
- Given the timeline asserts the wired events, when it renders, then exactly five stations carry real routing rows (SessionStart, UserPromptSubmit, PreCompact, PostToolUse, Stop), and PreToolUse (if shown) is explicitly marked as a Claude Code lifecycle event this harness does not subscribe to, with no fabricated routing row.
- Given a station drawer, when I follow its evidence link, then it deep-links to the artifact in this repo pinned to commit SHA `5633273`.
- Given `prefers-reduced-motion` or JS-off, when I open the module, then a stepped/static fork and an ordered list of events carrying the same routing-table content are available.

### P1-VIZ-02 (Priya, should)
**As a** learner trying to grasp why MCP tools are cheap, **I want** to toggle a real reference file between its raw dump and its distilled `semantic_lookup` / `impact_check` answers with live token counts, **so that** I feel the ~50x token difference between handing the model raw bytes and distilled intelligence.

- Given the `/foundations/mcp` module (P1-M5), when I toggle to "raw dump," then a real ~600-line reference file is shown with a token meter near ~2500; toggling to the `semantic_lookup` answer shows ~50 tokens and `impact_check` ~30 tokens, with a 50x callout.
- Given this is a should/Tier-2 viz, when interactivity is unavailable or deferred, then an enhanced-static fallback showing both panels and their token counts is the v1 experience and remains accurate.
- Given the distilled answers, when shown, then they correspond to real `semantic_lookup`/`impact_check` outputs for an actual repo file, evidence-pinned to this repo at SHA `5633273`.

### P1-VIZ-03 (Marcus, should)
**As a** cost-conscious evaluator, **I want** a token-economy calculator that recomputes a cents-per-day figure as I adjust maxTokens, compactions/day, and model price, **so that** I can see for myself that the frequent summarize job is cheap and understand "spend little often, more seldom."

- Given the `/foundations/token-economy` module (P1-M7), when I move the sliders, then a stacked cents-per-day chart updates live across the summarize role (8000 maxTokens, low effort) and recall role (25000, medium effort), with both budgets pinned to the real `config.json` (F19).
- Given the calculator, when it loads, then the 8000 and 25000 budget values come from the pinned facts file and match this repo at SHA `5633273`.
- Given JS-off or reduced-motion, when I view the module, then a static table presents the same two roles, their budgets, frequencies, and an example cents-per-day figure.

---

## Epic 4 — Knowledge-Check Quiz

### P1-QUIZ-01 (Priya, must)
**As a** learner who wants the concept to stick, **I want** two to four varied knowledge-check items per module with immediate elaborated feedback and no score gating, **so that** I get low-stakes retrieval practice without a gradebook blocking my progress.

- Given any module's Apply beat, when I reach the quiz, then it presents two to four varied items (predict-the-outcome, assertion-reason, confidence-weighted single-select, misconception-buster) drawn from the content map, and advancing is never blocked by my score.
- Given I answer an item, when I submit, then I receive immediate elaborated feedback that restates the mental model in text (via aria-live), and correctness is never communicated by color alone.
- Given misconception-buster items, when authored, then they are drawn from the concept's `commonMisconception` field so the wrong option is the documented wrong model.
- Given JS is disabled, when I view the quiz, then the items render with native form semantics and the answer key is revealed in a `<details>` element.

### P1-QUIZ-02 (Priya, must)
**As a** learner picking the right tool for a job, **I want** a "which primitive fits?" scenario sorter that gives specific feedback for each wrong choice, **so that** I practice the actual mastery skill (choosing command vs skill vs subagent vs hook vs MCP vs memory loop) not just recalling definitions.

- Given the scenario engine (F10), when I am given a scenario, then I select-then-place a primitive (the primary, keyboard-operable path; drag is optional enhancement) onto the answer or the who-pulls-the-trigger by where-it-runs 2x2.
- Given I pick a wrong primitive, when feedback shows, then it returns the specific discriminating feature that rules my choice out (for example, "a command is you triggering by name; this scenario is the model noticing a situation, so it is a skill"), never a bare "incorrect."
- Given the command/skill/subagent distinction (the most-confused), when I complete its scenarios, then the per-concept mastery meter updates and the engine surfaces this concept for spaced re-practice if I missed it.
- Given the sorter is data-authored, when scenarios load, then they come from a JSON item bank, and every wrong-choice branch has authored feedback (no unfeedbacked option).

---

## Epic 5 — Ecosystem / Data-Flow Map

### ECO-01 (Priya, must)
**As a** learner finishing Phase 1, **I want** to trace a single request through the whole ecosystem map and watch intelligence accrete on disk, **so that** I see how the seven primitives compose into one running system and a per-repo intelligence stack.

- Given the `/foundations/ecosystem` capstone (P1-M8, owns SV-3 and SV-5), when I press play/step on "trace a request," then one glowing token walks the real ecosystem-flow sequence (SessionStart to UserPromptSubmit to reason to PreToolUse/gate to tool to PostToolUse to fill to PreCompact to compaction to next prompt) and a synced inspector shows the real payload at each step.
- Given the trace plays, when the token passes the disk layer, then a memory file visibly accretes and the four-layer SV-5 stack (static index to query to brain to rolling log) lights as each layer is touched, with per-layer cost labels.
- Given MVP scope, when the map loads, then a fixed-zoom trace is sufficient (progressive zoom/disclosure may be deferred) and the map still teaches the full sequence.
- Given `prefers-reduced-motion` or JS-off, when I open the capstone, then a numbered ordered-list of trace steps (derived from the same typed step-script) and a data-table twin present the full sequence faithfully, and a skip-to-data-table link is provided.
- Given a node on the map, when I activate it, then it deep-links to the corresponding Phase-2 teardown region for that layer.

---

## Epic 6 — Phase 2 Architecture Teardown

### P2-TD-01 (Priya, should)
**As a** learner moving from concepts to the worked example, **I want** Phase 2 to be one scroll-driven narrative on a persistent ecosystem map where each layer scene zooms into one region, **so that** I never lose the whole system while inspecting an individual layer.

- Given the `/case-study/` hub, when I enter, then a persistent through-question banner ("How does it run long, autonomous tasks safely?") is shown and the SV-3 map is introduced as the territory before the layer scenes.
- Given each layer scene, when I read it, then it answers what-it-does / why-here / how-it-connects, zooms into one region of the same SV-3 map, lights that region's connections, and carries a "show me where" read-only evidence excerpt.
- Given each layer scene, when navigated, then it is also its own static base-path-correct URL (for example `/case-study/hooks-router`), shareable and readable with JS off, with scroll choreography as progressive enhancement.
- Given MVP scope, when Phase 2 first ships, then the safe-autonomy climax (P2-L8) is present and the other seven layer teardowns may follow as fast-follow without breaking navigation.

### P2-TD-02 (Marcus, must)
**As an** architect evaluating safe autonomy, **I want** an interactive gate where I place real-shaped requests and see them ALLOW silently or DENY with the matched named-harm rule, **so that** I can verify for myself how default-allow-except-named-harms behaves and judge whether it is safe enough to adopt.

- Given the SV-4 decision-boundary view (P2-L8, F5), when I select-then-place a real-shaped request (git status, npm install, project-local rm, `rm -rf /`, secret piped to curl, force-push main, the repo's actual fixtures), then it resolves to ALLOW (passes silently) or DENY with the specific matched named-harm rule highlighted.
- Given the verdict logic, when it runs, then it uses the repo's `evaluate-policy.mjs` `evaluate()` ported verbatim to client JS so the site's verdict equals the repo's verdict, and a CI grep guards the ported rule ids against the live file (F12).
- Given accuracy framing, when the module is read, then it explicitly states the gate is a course-taught pattern (course module 7.2), that `evaluate-policy.mjs` is a deterministic regex stand-in for the real LLM gate, and that it is not a wired hook in `reference/`: not presented as a shipped, installed layer.
- Given the honest-limits requirement, when the climax is shown, then it carries the 7.2 README's caveat verbatim that the gate is a friction tool, not a security boundary, defensible only because Claude Code's own permissions, git history, and human attention still exist.
- Given any cost/cache figures (cents, cache-hit percentage, 7-day TTL), when displayed, then they are labeled an explicitly illustrative deterministic simulation with no repo-pinned numbers (since those figures are course prose, not shipped config).
- Given the select-then-place path, when I use a keyboard only, then I can place a request and read its verdict and matched rule without drag, and a table (request to matched rule to ALLOW/DENY to why) is the accessible truth with the 2D plot as enhancement.

### P2-TD-03 (Marcus, must)
**As an** architect weighing the safe-autonomy tradeoff, **I want** a default-allow vs deny-by-default toggle linked to a compressed long-run timeline with a human-prompt count and cache-hit gauge, **so that** I viscerally understand why default-allow with a small deny set beats deny-by-default for long unattended runs.

- Given the SV-4 run/cost view, when I toggle from default-allow to deny-by-default, then the human-prompt count visibly explodes, demonstrating why deny-by-default forces constant re-asks.
- Given the compressed long-run timeline, when it plays, then first occurrences make a priced call and repeats are cache hits, with a cents meter and a cache-hit gauge climbing, all explicitly framed as an illustrative simulation, not measured repo data.
- Given the climax payoff, when I finish the module, then it states the outcome plainly ("you can now reproduce this, by hand or by pointing your agent at this repo") and links to the Direct Your Agent funnel.

---

## Epic 7 — Progress & Quiz Tracking

### PROG-01 (Priya, must)
**As a** learner who studies across multiple sessions and devices, **I want** my module completion, quiz answers, confidence, scenario results, and last position persisted client-side and exportable, **so that** I can pick up where I left off and move my progress between devices without an account.

- Given I complete modules and answer quizzes, when I leave and return, then per-module completion, quiz answers/scores/confidence, scenario results, and last-position are restored from localStorage under one versioned, repo-namespaced key (`claude-harness-atlas:v1`).
- Given localStorage is unavailable or full, when the site tries to persist, then it fails silently to an in-memory fallback and never throws or blocks the UI (mirroring the harness's own fail-silent principle).
- Given I want to migrate devices, when I use the export-progress button, then I get a JSON blob I can import on another device to restore state, plus an explicit reset control.
- Given my progress, when I view a module footer, then a persistent "N% to being able to direct an agent to build this" meter reflects my aggregated completion, and per-concept mastery meters appear on the course map.
- Given the schema is versioned, when a future key version changes, then old data does not crash the app (unknown/old versions are ignored gracefully).

### PROG-02 (Priya, could)
**As a** learner who wants to know what to review, **I want** a metacognitive panel that flags where I was confidently wrong and a readiness self-assessment, **so that** I can target review at the misconceptions that actually tripped me before I act on the course.

- Given confidence-weighted quiz data in localStorage, when I open the calibration panel (F22), then it flags items I answered confidently but incorrectly, built entirely from local data with no backend.
- Given my aggregated per-module mastery, when I view the readiness statement, then it advises one of "ready to direct an agent / review the deep wiki / build by hand" without gating any content.
- Given there is little or no quiz data yet, when I open the panel, then it degrades gracefully with a prompt to complete some checks rather than erroring.

---

## Epic 8 — Handoff to Build

### HAND-01 (Priya, must)
**As a** learner who will have my agent build the harness, **I want** a terminal page with a one-click-copy agent prompt that drives Claude Code against the repo's machine-followable guides, **so that** I can convert what I understood into an actual harness build without hand-writing it.

- Given `/direct-your-agent/` (F18), when I arrive, then Path B presents a one-click-copy agent prompt that points Claude Code at this repo's `course/` and `reference/` guides, plus the canonical repo URL and a "what you need first" line (Node, Claude Code, an LLM API key).
- Given the copy button, when I click it, then the full prompt is copied to my clipboard and a confirmation is shown; the prompt text is also visible and selectable for JS-off/manual copy.
- Given the handoff targets this repo, when links and the prompt are authored, then the canonical public repo URL is confirmed before scaffolding and all deep links target `build-a-claude-harness` at the pinned SHA `5633273`.
- Given I reach this page, when my progress is loaded, then the exit-to-action is available regardless of completion percentage (the funnel is never locked).

### HAND-02 (Marcus, must)
**As a** technically-inclined adopter who may build by hand, **I want** a build-order checklist mapping each harness layer to its reference file and principle, deep-linking into the deep wiki, **so that** I can reproduce the harness layer by layer using the repo as the machine-followable source of truth.

- Given `/direct-your-agent/`, when I choose Path A (technical), then a build-order checklist lists each layer in dependency order, mapping it to its reference file and governing principle, each deep-linking into this repo's `course/` and `reference/`.
- Given each checklist item, when I follow its link, then it resolves to the real artifact in `build-a-claude-harness` at SHA `5633273` (no broken or fabricated targets), verified by the CI link checker.
- Given the checklist, when authored, then it does not duplicate the deep wiki content: it routes to it, keeping the web-vs-repo boundary crisp.

---

## Epic 9 — Returning-User Reference

### REF-01 (Dev, should)
**As a** returning user who needs one concept, **I want** a searchable concept index of primitive cards I can filter to jump straight to a definition, **so that** I can re-check a single distinction without re-walking the linear course.

- Given `/concepts/` (F20), when I type into the filter, then a client-side filter over a pre-built JSON index narrows the primitive cards (surfacing repo glossary terms) without a page reload or backend.
- Given a primitive card, when I open it, then it shows the misconception, the corrected model in one sentence, the discriminating feature, and a link to the full module and its evidence artifact.
- Given JS is disabled, when I load `/concepts/`, then the full card list renders statically and remains readable (filter is the enhancement).

### REF-02 (Dev, must)
**As a** returning user verifying an asserted fact, **I want** every architectural claim shown beside its real reference-harness artifact with a SHA-pinned deep link, **so that** I can trust the site teaches the system that actually exists and jump to the source to confirm.

- Given any architectural claim on the site, when it is asserted, then a short, read-only, build-time-highlighted (Shiki, no client JS) excerpt of the real artifact appears beside it with a GitHub deep link pinned to commit SHA `5633273` (F12).
- Given the five named harms, the five-vs-six events, and the 8000/25000 budgets, when displayed, then they come from the single pinned facts file (F19) and match this repo; the facts file annotates that five events are wired and PreToolUse is an unsubscribed platform event.
- Given an evidence pin would target a non-existent or mischaracterized artifact (for example a PreToolUse routing row or a shipped gate cache-TTL config), when authored, then it is replaced or relabeled: no pin asserts an artifact that is not real at SHA `5633273`.
- Given the gate's rule ids, when the build runs, then a CI grep compares the ported client rule ids against the live `evaluate-policy.mjs` and fails the build on divergence.

---

## Epic 10 — Accessibility of Diagrams, Animations & Quizzes

### A11Y-01 (Sam, must)
**As a** screen-reader and keyboard user, **I want** every visualization to have a navigable data-table/tree twin carrying the same data as its primary accessible experience, **so that** I learn each concept to the same depth as a sighted mouse user, not from a degraded summary.

- Given any visualization (SV-1/2/3/4/5), when I use a screen reader, then a data-table or tree twin presents the same data (not a paraphrase) and is reachable via a skip-to-data-table link.
- Given a complex viz, when I navigate by keyboard, then the diagram nodes use a roving-tabindex/arrow-key composite, focus is shown with a ≥3:1-contrast visible ring (including explicit SVG focus-ring rects), and every interaction has a non-drag equivalent.
- Given an animation, when it plays, then play/pause/step controls and live-region narration are available, and `prefers-reduced-motion` yields a static fork derived from the same typed data model.
- Given `forced-colors` or `prefers-contrast` mode, when the diagrams render, then they remain legible via `currentColor` and shape/label/pattern cues, with correctness never conveyed by color alone.
- Given CI, when the build runs, then axe-core/Pa11y scans the rendered HTML and twins and a Lighthouse Accessibility gate passes on representative routes; SVG keyboard semantics are treated as enhancement validated by budgeted manual screen-reader testing, not certified by Lighthouse alone.

### A11Y-02 (Sam, must)
**As a** learner who may browse with JavaScript disabled, **I want** all prose, diagram data, trace steps, and quiz answer keys present with JS off, **so that** the reading and assessment floor is real and I am never blocked by a failed or disabled script.

- Given JS is disabled, when I load any module, then all HEVA prose, every diagram's data twin, the numbered trace steps, and quiz answer keys (in `<details>`) are present and legible.
- Given JS-off, when I navigate, then all internal links are base-path-correct and functional, and the styled `404.html` under `/<repo>/` resolves correctly.
- Given the reading path, when measured in CI, then reading-path routes ship 0KB render-blocking framework JS (F17), so the no-JS floor is structural, not incidental.
- Given an interactive island fails to hydrate, when the page loads, then its accessible static/data-twin equivalent remains usable (fail-silent enhancement, mirroring the harness principle).

### A11Y-03 (Sam, must)
**As a** keyboard-only learner taking the assessments, **I want** every quiz and scenario sorter to be fully keyboard- and screen-reader-operable, **so that** I can complete knowledge checks and primitive-sorting without a mouse or drag.

- Given any quiz item, when I operate it by keyboard, then it uses native form semantics, feedback is announced via aria-live, and correctness is conveyed by text/shape, never color alone.
- Given the scenario sorter (F10), when I use a keyboard, then select-then-place is the primary path (no drag required) and each placement target is reachable and labeled.
- Given an answered item, when feedback appears, then it is programmatically associated with the item so a screen reader announces it in context.

---

## Epic 11 — Mobile & Performance

### MOB-01 (Rosa, must)
**As a** developer reading on a phone over slow wifi, **I want** reading routes to load fast with no render-blocking framework JS and visualizations to download only when scrolled into view, **so that** I can make progress on a small screen and a hostile network without long waits.

- Given a reading-path route on a phone, when it loads, then it ships 0KB render-blocking framework JS and passes the CI Lighthouse Performance ≥95 gate (F17).
- Given an interactive module, when I scroll, then each viz island hydrates with `client:visible` (never `client:load`), stays ≤35KB gzipped per island, and total JS per interactive page stays ≤60KB gzipped with roughly two to three islands max.
- Given intermittent connectivity, when an island has not yet downloaded, then the accessible static/data-twin equivalent is already visible and usable.
- Given self-hosted subset fonts and content-hashed compressed assets, when the page loads, then no layout-shifting or blocking third-party requests occur.

### MOB-02 (Rosa, must)
**As a** touch user on a small screen, **I want** every interaction to work by tap with adequately sized targets and no reliance on hover or drag, **so that** I can operate the explainers, sorters, and gate on a phone.

- Given any interactive element on touch, when I tap, then it responds without requiring hover, and all targets are ≥24px (WCAG 2.2 2.5.8).
- Given the compaction-boundary, gate placement, and primitive sorter, when I use touch, then select-then-place/tap is the primary path and drag is only an optional enhancement.
- Given tooltips and drawers, when triggered on touch, then their content is also reachable by tap/focus (not hover-only) so no information is hover-gated on mobile.

### MOB-03 (Rosa, should)
**As a** learner whose session may drop mid-module, **I want** my progress saved continuously and restored on return even after a dropped connection, **so that** flaky connectivity never costs me my place or my quiz answers.

- Given I am mid-module, when my connection drops and I return, then my last-position and answered items are restored from localStorage with no network dependency.
- Given a fully static site, when offline after first load, then already-loaded routes and their static twins remain readable (no runtime fetch required to read content).
- Given a dropped load of an island, when I retry, then progress persisted before the drop is intact (persistence is independent of island hydration).

---

## Coverage summary

| Epic | Stories | Personas |
|------|---------|----------|
| Landing & Onboarding | ONB-01, ONB-02 | Priya, Marcus |
| Phase 1 Concept Module (HEVA) | P1-MOD-01, P1-MOD-02 | Priya |
| Interactive Visual Explainer | P1-VIZ-01, P1-VIZ-02, P1-VIZ-03 | Priya, Marcus |
| Knowledge-Check Quiz | P1-QUIZ-01, P1-QUIZ-02 | Priya |
| Ecosystem / Data-Flow Map | ECO-01 | Priya |
| Phase 2 Architecture Teardown | P2-TD-01, P2-TD-02, P2-TD-03 | Priya, Marcus |
| Progress & Quiz Tracking | PROG-01, PROG-02 | Priya |
| Handoff to Build | HAND-01, HAND-02 | Priya, Marcus |
| Returning-User Reference | REF-01, REF-02 | Dev |
| Accessibility of Diagrams, Animations & Quizzes | A11Y-01, A11Y-02, A11Y-03 | Sam |
| Mobile & Performance | MOB-01, MOB-02, MOB-03 | Rosa |

`must` stories define the seventeen-feature MVP (PRD section 9). `should` and `could` stories map to the fast-follow and deferred tiers.
