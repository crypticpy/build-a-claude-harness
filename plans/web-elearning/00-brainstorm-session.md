# Harness Atlas — Consultant Brainstorm Session

**Product:** a standalone, concept-and-architecture e-learning site for GitHub Pages that teaches developers to understand how to extend Claude Code and architect a harness, so they can either build one by hand or direct their coding agent to "build it like this."

**This document records the brainstorm.** It is the working session, not the spec. The decisions it reaches are carried into `01-prd.md` (the specification) and `02-user-stories-acceptance.md` (personas and acceptance criteria). An earlier pass that assumed learners would hand-edit and run real hook code in the browser was archived; see `_archive/v1-code-execution/ARCHIVED.md` for why. Everything below is the freshly-briefed second pass.

**Method.** Six expert lenses were briefed in parallel against one shared brief, then a synthesis pass reconciled their conflicts into a single concept, and a feasibility red-team checked every claim against the actual reference harness at commit `5633273`. The red-team found real problems. They are recorded here, not smoothed over.

---

## 1. The brief the panel was given

The owner set the altitude explicitly, and it differs from the deep technical course already in this repo:

1. **Audience.** Mostly developers who use Claude Code daily and want to extend it, but who will largely have their coding agent do the actual building. They value throughput, skim by default, and abandon anything that feels like a coding bootcamp. A smaller, more technical minority will go down into the repo text files by hand.
2. **Goal.** Mental models and architecture literacy, not coding skill. Success is "can the learner reason correctly about the primitives and pick the right one," never "can the learner write the code." There is no sandbox by design.
3. **Two phases.**
   - **Phase 1 (Foundations):** teach what the building blocks are and how to think about them: hooks and lifecycle entry points, commands, skills, MCP servers as effectively-infinite custom tools, subagents and the orchestrator-to-subagent model, the token economy, and a capstone that shows how it all composes into a per-repo intelligence and memory stack.
   - **Phase 2 (Case study):** a visual, layer-by-layer teardown of the reference harness in this repo, told as one story with one driving question, climaxing on running long autonomous tasks safely via a second LLM acting as an approval gate. Payoff: understand it, then build it by hand or point your agent at this repo to reproduce it.
4. **Web vs repo separation.** The web course is freshly authored, standalone, broad-audience. The existing `course/`, `docs/`, and `reference/` stay as the deep technical wiki and the machine-followable build guide. Do not retrofit them into web modules. Content is static and not expected to evolve frequently, so no markdown-sync pipeline and no git submodule.
5. **Platform.** Fully static GitHub Pages: no backend, no secrets, no database, base-path routing under `/<repo>/`, deploy via GitHub Actions (not Jekyll). The site cannot set COOP/COEP headers, so anything requiring SharedArrayBuffer is off the table.
6. **Quality bar.** Modern, beautiful, slick, with state-of-the-art interactive learning modules, and accessible to WCAG 2.2 AA with a zero-JS reading floor.

---

## 2. The panel

Six lenses, briefed in parallel. Each was told there is no runtime, so the dominant cost has moved from "build a sandbox" to "author accurate content and accessible data-visualization, and get Phase 2 factually right."

### 2.1 E-Learning PhD / Instructional Designer

**Vision.** Every concept moves on a fixed four-beat rhythm: **Hook** a misconception the learner commits a prediction to, **Explain** with one tight dual-coded segment, **Visualize** by manipulating an interactive diagram that makes the mechanism visible, then **Apply** through a low-stakes retrieval check and a "which primitive fits?" scenario. The site behaves like a worked-example tutorial where the worked examples are the explanations: every claim is paired with the exact reference-harness artifact that proves it.

**Signature principles.**
- Misconception-first, always. The docs already name the wrong model and the evidence artifact for each concept, so authoring is condensing, not inventing. Exposition never leads.
- Mechanism is taught by manipulation, not narration. If a concept has a moving part (compaction boundary, decision boundary, token budget, event routing), the learner must move it and watch the consequence.
- Mastery is picking the right primitive, so the assessment is that act. No vocabulary quizzes; every check is a scenario-sort or a predict-the-outcome with feedback that teaches the discriminating feature.
- Claim-to-evidence is a hard rule. No architectural assertion ships without the real artifact beside it.

**Top risk.** The interactivity-as-decoration trap: six manipulable diagrams become six things to passively watch unless the learner is required to predict before manipulating.

### 2.2 Data-Visualization & Interaction Design

**Vision.** A single glowing "request" token enters Claude Code and travels a living wire through the whole harness: every lifecycle event lights as it passes, hooks fan out and report back, memory accretes on disk, and the context window fills until PreCompact distills it. Nothing is a static PNG. Every node is clickable, every edge animates the actual payload shape, and the learner can scrub, pause, and trace one request end to end like a debugger timeline.

**Signature principles.**
- One visual grammar, reused everywhere: one node taxonomy and one typed-edge legend. The learner learns to read the diagram once and every later diagram pays that investment back.
- Animate the real data, never lorem. Every payload the learner inspects is the actual shape from the reference harness.
- Every diagram has a single load-bearing "click" moment, and the interaction exists to produce it. If a reviewer cannot state what each diagram's one click teaches, the interaction is cut.
- Progressive disclosure over density: zoomed out shows a handful of super-nodes a newcomer can hold in their head; zoom and click reveal the modules underneath.

**Top risk.** Bundle bloat. React Flow plus D3 plus a full animation runtime can blow the static-site budget. The fix is per-viz tool selection and lazy islands, not a monolith.

### 2.3 Developer Advocate / Technical Storyteller

**Vision.** Phase 2 is a guided descent through the reference harness told as a single story with one driving question: "How do you let an agent run for hours, unsupervised, touching a real repo, without granting blanket permissions and without a human babysitting every prompt?" The learner scrolls through eight named layers, each a scene that answers a smaller question, until the layers visibly snap together into the answer.

**Signature principles.**
- Tell it as one story with one driving question. The climax is the safe-autonomy gate; every prior layer earns its place by setting it up.
- Anchor every architectural claim to a real file at a pinned commit. A developer audience trusts code excerpts, not adjectives. No claim ships without a "show me where."
- Make the learner feel the decision: place the request at the gate, drag the compaction boundary, flip default-allow versus deny-by-default.
- Reuse the harness's own plain-spoken voice ("the tattoo," "distill don't dump," "settings.json is the router"). That voice is already strong in the docs.

**Top risk.** A freshly-authored static site drifting from a moving repo: code excerpts and the deny rules could silently go stale. The fix is SHA-pinned excerpts plus a tiny CI check that greps the live policy file.

### 2.4 GitHub Pages / Static Platform & Performance Engineer

**Vision.** A reader can land on any module URL under `/<repo>/` and the prose plus diagrams are fully painted before a single byte of framework JS arrives. The reading path is server-rendered HTML and CSS, near-zero JS, instant on a phone on hotel wifi. The interactive explainers are hydrated islands that download their code only when scrolled into view, each under a strict weight budget.

**Signature principles.**
- Document by default, app only where it earns it: the reading path ships zero framework JS; interactivity is an island you opt into per component with `client:visible`, never `client:load`.
- The budget is code, not a wish: every per-island weight limit and Lighthouse threshold is asserted in GitHub Actions and fails the PR.
- Move cost to build time: diagrams render to static SVG in CI; indexes are precomputed. This mirrors the harness's own "distilled intelligence over raw bytes."
- One URL per module, base-path-correct, so every concept is a shareable, crawlable, back-button-friendly document.

**Top risk.** Base-path misconfiguration silently breaks assets, the 404 page, and internal links: the classic Pages failure. The fix is setting Astro `site` and `base`, banning root-absolute URLs, a CI link check, and verifying the styled 404 under `/<repo>/`.

### 2.5 Accessibility Engineer (WCAG 2.2 AA)

**Vision.** A blind developer reads every concept, operates every "which primitive fits?" scenario, takes every quiz, and walks the animated trace end to end using only a screen reader and keyboard, and comes away with the same mental model as a sighted learner, because each diagram is generated from a structured data model that is also rendered as a navigable table or tree, not bolted on as alt text.

**Signature principles.**
- Data model first, pixels second: every diagram is generated from a typed data structure that is also rendered as a navigable table, tree, or list. The text equivalent is the same data, never a paraphrase.
- The floor carries the load-bearing content, not just the prose: with JS off, the diagram data, the trace step lists, and the quiz answer keys are all present.
- No animation is the sole carrier of a fact: every motion has a `prefers-reduced-motion` static fork built from the identical step model.
- Mirror the harness's own fail-silent ethic: if the SVG renderer fails, the data table remains; if JS fails, the floor remains.

**Top risk.** Authoring cost double-counting: the team budgets the SVG and forgets that each diagram now also needs a data-table twin, a reduced-motion fork, and a keyboard model, roughly two to three times the per-diagram effort. If that is not priced into the roadmap, accessibility gets deferred and never lands.

### 2.6 Curriculum & Product Strategy

**Vision.** A learner lands and within ninety seconds an interactive session timeline shows a Claude Code session firing events and a harness reacting: they get the core mental model before reading a paragraph. Phase 1 walks the primitives ladder to a capstone ecosystem map; Phase 2 is the guided teardown climaxing on safe autonomy. The whole thing is a guided museum tour of an architecture, not a code bootcamp.

**Signature principles.**
- Mental models over mechanics: every module's win condition is "predict the behavior or pick the right primitive," never "write the code."
- Misconception-first authoring: each module is built around the specific documented misconception and explicitly busts it.
- The visualization is the lesson: with no code to run, the interactive explainer carries the teaching weight and prose supports it, not the reverse.
- Phase 2 always answers why-here, not just what: every layer states why it is inserted at that event and how it connects to its neighbors.

**Top risk.** Scope creep on the interactive explainers, each effectively a small bespoke app. If all of them are gold-plated, the spec balloons. The fix is tiering: ship a few load-bearing explainers fully interactive and the rest static-first.

---

## 3. Where the lenses disagreed, and how it resolved

The synthesis pass reconciled nine genuine conflicts. Each resolution is a decision the PRD inherits.

1. **Site generator and island framework.** Resolved to Astro static MPA with Preact (~3KB) as the single locked island runtime. The data-viz lens wanted React Flow; rejected on bundle grounds. Node-graphs are hand-rolled SVG on a shared grammar instead, and React imports are linted out so two runtimes never ship.
2. **Drag versus non-drag interactions.** Resolved to non-drag select-then-place as the primary, keyboard-operable path for all three drag-heavy interactions (compaction boundary, gate placement, primitive sorter). Drag is an optional enhancement on the same handler. Nothing teaches only through drag (WCAG 2.2 2.5.7).
3. **Safe-autonomy gate fidelity.** Resolved to porting the repo's `evaluate-policy.mjs` `evaluate()` and its fixtures verbatim to client JS so the site's verdict equals the repo's verdict, but labeling it explicitly as a deterministic regex stand-in for the real LLM gate, and carrying the friction-not-security caveat verbatim. Honesty over inflated drama. (The red-team sharpened this further; see section 4.)
4. **Interactivity ambition versus the no-JS floor versus AA.** Resolved structurally by elevating the accessibility lens's "one data model, three renderings" to the core diagram architecture: every viz is a typed model yielding the animated SVG, a screen-reader-navigable twin, and a static fallback. The three goals share one source of truth instead of competing, and the otherwise-tripled authoring cost is amortized.
5. **Scrollytelling versus one-URL-per-module.** Resolved to both. Phase 2 is one scroll-driven narrative, but each layer scene is also its own static URL, so links are shareable, crawlable, and readable with JS off. Scroll choreography is progressive enhancement over semantic per-scene HTML.
6. **Six visualizations all gold-plated versus MVP scope.** Resolved to tiers. Tier-1 (must, v1): the ecosystem map, the safe-autonomy gate, the lifecycle timeline. Tier-2 (should): the fan-out, the stack, the Memento split-screen, the token calculator, the raw-vs-distilled toggle, each shipping enhanced-static-first with full interactivity as fast-follow.
7. **Quiz gating versus ungated practice.** Resolved to ungated and low-stakes, unanimously. Two to four varied items per module, no score gating to advance, immediate elaborated feedback, and cross-module spaced warm-ups. A throughput-valuing audience abandons gradebooks; mastery is an advisory meter, not a gate.
8. **Fact accuracy versus "no content-sync pipeline."** Resolved to one pinned static facts file holding the few asserted concrete values with a commit-SHA reference, plus a single cheap CI grep guarding only the gate's rule ids against drift. The minimum insurance for the climax's credibility, not a sync system.
9. **Repo placement and the canonical handoff URL.** Flagged as the one open owner decision: evidence deep links and the "direct your agent" prompt target this repo (`build-a-claude-harness`) while the site deploys as its own artifact. The canonical public repo URL must be confirmed before scaffolding the base path.

---

## 4. The feasibility red-team (the corrections that matter)

The red-team checked every claim against the reference harness at commit `5633273`. Most of the spec held up: the config budgets, the five named-harm rules, the five-event routing, the provider-agnostic LLM client fork, and the MCP tools are all real. Three findings change the content, and they are non-negotiable corrections baked into the PRD.

### 4.1 The safe-autonomy gate is a course-taught pattern, not a shipped harness layer

The spec originally framed the gate (cf-approve) as an installed layer of the reference harness and claimed "the site's verdict is the repo's verdict." That overstates it.

- cf-approve is **not** wired anywhere in `reference/` or `hooks/`. It exists only as **course module 7.2** (`course/07-level-up/7.2-cf-approve/`).
- Its `evaluate-policy.mjs` **self-describes as a deterministic stand-in** for the real LLM gate.
- The 7-day cache TTL and the ~94% cache-hit and cents figures are **course prose, not shipped config**. (The only 7-day TTL in code lives in `skill-activation.mjs`, which is unrelated.)

**Correction.** Phase 2's climax presents the gate as a course-taught pattern and a teaching model of a real second-LLM gate. The decision logic is the repo's `evaluate()` ported verbatim, explicitly labeled a deterministic regex stand-in. Any cost or cache figures are shown as an explicitly illustrative simulation with no repo-pinned numbers. The friction-not-security caveat from the 7.2 README is carried verbatim. This keeps the marquee payoff honest, which for a skeptical architect audience makes it more persuasive, not less.

### 4.2 The harness wires five lifecycle events, not six

The spec asserted six lifecycle events including PreToolUse, but `settings.template.json` wires only five: **SessionStart, UserPromptSubmit, PreCompact, PostToolUse, Stop**. There is no PreToolUse routing row. Pinning a real routing row to a sixth station that does not exist would break the claim-to-artifact contract.

**Correction.** The pinned facts file stores "Claude Code lifecycle events" as the platform set but annotates which five this harness actually subscribes to. The lifecycle timeline shows five stations with real rows, and presents PreToolUse as a platform event this harness does not subscribe to, which is itself instructive and truthful.

### 4.3 The dominant, under-budgeted cost is content authoring, not engineering

The engine ratings (M/L) quietly bury the real cost: sixteen freshly-condensed-yet-accurate modules, each needing a misconception, a dual-coded explainer under 150 words, a manipulable visualization, and a scenario-plus-retrieval check; per-wrong-answer scenario feedback; a two-to-four-item quiz bank times sixteen; and five bespoke visualizations each with three faithful renderings.

**Correction.** Content authoring is tracked as its own line item in the roadmap, separate from engine work, sequenced Phase-1-complete-before-Phase-2. The content map already supplies the misconception, evidence, and discriminating feature per concept, so authoring is condensing from grounded source. The MVP caps Phase 2 to the single climax module to bound volume.

### 4.4 Two features are materially under-costed

- **The shared diagram grammar kit (F2)** was rated L but is effectively XL: a generic-enough abstraction across five structurally different visualizations is real framework work. **Mitigation:** scope the grammar to the node-graph/flow family the MVP needs and author the other visual layers bespoke. Freeze the contract first.
- **The accessibility infrastructure (F15)** was rated L but is effectively XL: making five bespoke interactive SVG widgets truly WCAG 2.2 AA is the hardest surface, and Lighthouse cannot certify custom SVG keyboard semantics. **Mitigation:** make the data-table/tree twin the primary accessible experience (it is required anyway), treat SVG roving-tabindex as enhancement, and budget explicit manual screen-reader testing.

### 4.5 Base-path and cross-repo handoff

The canonical public repo URL for evidence deep links and the agent prompt is an unresolved owner decision, and it targets this repo while the site deploys as a separate artifact: a base-path and deep-link mismatch waiting to happen. **Mitigation:** confirm the canonical URL before scaffolding, route internal links through `BASE_URL` helpers with a lint ban on root-absolute hrefs, point evidence deep links and the agent prompt at this repo at a pinned SHA, and verify the styled 404 under `/<repo>/`.

---

## 5. The concept the session converged on

> **HARNESS ATLAS** is an interactive, concept-and-architecture e-learning site that teaches developers to understand how to extend Claude Code and architect a harness, so they can either build one by hand or direct their coding agent to "build it like this." It is a guided museum tour of an architecture, not a code bootcamp: there is no sandbox.

**Tagline.** *See the seams. Understand the system. Then tell your agent to build it like this.*

Teaching happens through misconception-first explainers, manipulable architecture diagrams, narrated data-flow walkthroughs, "which primitive fits?" scenario sorters, and low-stakes comprehension checks. Phase 1 builds seven mental-model schemas in isolation on a fixed Hook-Explain-Visualize-Apply rhythm. Phase 2 is a single scroll-driven narrative teardown of the reference harness, told as one story with one driving question, climaxing on the second-LLM approval gate. Every architectural claim is anchored to a real reference-harness artifact shown inline as a read-only excerpt with a GitHub deep link pinned to a commit SHA. It is built on Astro for a zero-JS reading floor, with every diagram authored as one typed data model rendered three ways, and deployed fully static to GitHub Pages via GitHub Actions.

**Seven pillars** (carried into the PRD):
1. Mental models over mechanics (no sandbox; the win condition is predicting behavior or picking the right primitive).
2. Misconception-first, every time.
3. Claim anchored to a real artifact.
4. Mechanism taught by manipulation (one load-bearing click per visualization).
5. One persistent map; part-whole always visible in Phase 2.
6. Accessible and no-JS-legible by construction.
7. Exit to action (the terminal step is a concrete handoff, not a congratulations screen).

The full structure (eight Phase-1 modules, eight Phase-2 layers, five signature visualizations, twenty-four features with feasibility and cost, the recommended stack, information architecture, MVP, roadmap, and risks) is specified in `01-prd.md`. Personas and acceptance criteria are in `02-user-stories-acceptance.md`.

---

## 6. Provenance

- Reference harness pinned at: `https://github.com/crypticpy/build-a-claude-harness` @ `56332735b0518e5d3c1e692f8c4d7a1ce6e9cb0e` (short `5633273`).
- Source docs the panel condensed from: `docs/what-is-a-harness.md`, `docs/the-event-model.md`, `docs/the-memento-pattern.md`, `docs/commands-skills-agents.md`, `docs/principles.md`, `docs/where-to-spend-tokens.md`, `docs/mcp-in-plain-terms.md`, `docs/glossary.md`, the `reference/` implementation, the `course/` modules, and `course/07-level-up/7.2-cf-approve/`.
- The archived first pass (in-browser code execution) lives in `_archive/v1-code-execution/`.
