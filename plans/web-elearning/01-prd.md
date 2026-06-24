# Harness Atlas — Product Requirements & Specification

**Status:** specification (no build). Supersedes the archived in-browser code-execution spec in `_archive/v1-code-execution/`.

**One-line concept:** an interactive, concept-and-architecture e-learning site that teaches developers to understand how to extend Claude Code and architect a harness, so they can build one by hand or direct their coding agent to "build it like this." A guided museum tour of an architecture, not a code bootcamp. No sandbox.

**Tagline:** *See the seams. Understand the system. Then tell your agent to build it like this.*

**Companion documents:** `00-brainstorm-session.md` (how this concept was reached, including the feasibility corrections) and `02-user-stories-acceptance.md` (personas and acceptance criteria).

**Reference harness pinned at:** `https://github.com/crypticpy/build-a-claude-harness` @ `56332735b0518e5d3c1e692f8c4d7a1ce6e9cb0e` (short `5633273`).

---

## 1. Goals and non-goals

### 1.1 Goals

1. Give a busy developer accurate mental models of the harness primitives and how they compose, fast enough that they can confidently direct an AI agent to build a harness and sanity-check the result.
2. Let a skeptical architect evaluate the safe-autonomy approach on the merits: understand the second-LLM approval gate, predict its allow/deny behavior, and grasp its honest limits.
3. Convert understanding into action: every learner leaves with a concrete next step (a copy-paste agent prompt or a by-hand build-order checklist).
4. Ship a modern, fast, accessible static site that works on a phone over a slow connection and with JavaScript disabled.

### 1.2 Non-goals

1. **No code sandbox.** Learners never write, edit, or execute hook/skill/MCP code on the site. Mastery is reasoning, not authoring.
2. **No content-sync pipeline.** The site is freshly authored standalone content. It does not generate from, mirror, or stay synced with the repo's `course/`, `docs/`, or `reference/` markdown. Those stay as the deep wiki and the machine-followable build guide.
3. **No backend, accounts, secrets, or database.** Static only. Progress is client-side.
4. **Not the build guide.** The web course teaches concepts and architecture; the repo remains the place an agent or a person follows to actually build.

---

## 2. Audience and personas

The MVP is built for **Priya, the delegating builder** (the primary audience) and **Marcus, the architect / safe-autonomy evaluator**. Three more personas constrain the design: **Dev** (the returning reference user), **Sam** (the accessibility-dependent learner), and **Rosa** (the mobile / hostile-network learner). Full persona definitions and their acceptance criteria are in `02-user-stories-acceptance.md`.

---

## 3. Pillars

These seven principles govern every design and authoring decision. When a feature conflicts with a pillar, the pillar wins.

1. **Mental models over mechanics.** There is no sandbox by design. Every module's win condition is "can the learner predict the behavior or pick the right primitive," never "can they write the code." The interactive explainer carries the teaching weight; prose supports it.
2. **Misconception-first, every time.** Each concept opens by surfacing the documented wrong model as a one-click prediction the learner commits to, then corrects it within the same screen, dual-coded. The source docs already name the misconception and the evidence artifact, so authoring is condensing, not inventing.
3. **Claim anchored to a real artifact.** No architectural assertion ships without the real reference-harness artifact beside it: a short, read-only, syntax-highlighted excerpt with callout pins and a GitHub deep link pinned to a commit SHA.
4. **Mechanism taught by manipulation.** If a concept has a moving part, the learner moves it and watches the consequence, after committing a prediction. Each visualization has exactly one load-bearing click moment; if an interaction does not drive that moment, it is cut.
5. **One persistent map; part-whole always visible (Phase 2).** Phase 2 is one rising narrative on a single ecosystem map. Each layer lesson zooms into one region and lights its connections, so the learner never loses the forest while inspecting a tree.
6. **Accessible and no-JS-legible by construction.** Every diagram is generated from one typed data model rendered three ways: animated SVG, a navigable table or tree (the same data, not a paraphrase), and a static fallback. With JS off, all prose, all diagram data, the trace steps, and quiz answer keys are present.
7. **Exit to action.** The terminal step is a concrete handoff: a copy-paste agent prompt plus a by-hand build-order checklist, not a congratulations screen.

---

## 4. Curriculum: the two-phase module map

### 4.1 Phase 1 — Foundations (eight modules)

Each module runs the **HEVA** rhythm: **H**ook a misconception, **E**xplain in one dual-coded screen under 150 words, **V**isualize by manipulation, **A**pply via scenario plus retrieval check.

| ID | Title | Core mental model | Owns visualization |
|----|-------|-------------------|--------------------|
| P1-M1 | What a Harness IS (and is NOT) | A harness is a thin, optional layer of config and scripts built on top of Claude Code using its own hooks, commands, and MCP. It adds persistent memory, shorthand commands, automated skills, subagents, and code intelligence. It is closer to "Claude Code's personality" than "a new product." | Concentric-ring diagram (static + data-table twin) |
| P1-M2 | Events and the Router Model | Claude Code fires named lifecycle events; a hook is a script you ask it to run when an event fires. `settings.json` is a routing table: each row maps event to script. One `unified-hook.mjs` switches on the event name in `argv[2]`. Reads stdin, optionally writes stdout, exits. | SV-1 Lifecycle Event Timeline |
| P1-M3 | Fail-Silent Design | A broken hook must never crash Claude Code. Three rules: exit 0 always, wrap logic in try/catch, guard optional dependencies. A hook failing is worse than a hook not running. | "Break the hook" two-lane toggle |
| P1-M4 | Commands vs Skills vs Subagents | Three automation layers by trigger: a command is a saved prompt you type by name; a skill is an ability Claude invokes on its own when its description matches; a subagent is a separate Claude instance for a big, independent job in its own clean context. The axis is who pulls the trigger (you / Claude) by where it runs (your context / separate). | SV-2 Orchestrator-to-Subagent Fan-Out |
| P1-M5 | MCP as Effectively-Infinite Custom Tools | An MCP server is a JSON-RPC loop over stdin/stdout: no network, no database, no framework. It lets you mint custom tools the model can call. The key move is distilled intelligence over raw bytes: tools return processed answers, not whole files. | Raw-vs-Distilled token toggle |
| P1-M6 | The Memento Pattern | The raw model remembers nothing across sessions, and compaction erases the running transcript mid-session. The Memento loop is two file operations: on PreCompact, write a distilled note to disk; on UserPromptSubmit, read it back as a `<session-memory>` block. No database. | Memento write/read split-screen with draggable compaction boundary |
| P1-M7 | Token Economy | Background work splits into two budgets matched to frequency: summarize runs on every compaction (cheap: 8000 maxTokens, low effort); recall runs on demand (afford 25000 tokens, medium effort). Match budget to frequency. | Token-economy cost calculator |
| P1-M8 | Capstone: The Ecosystem and the Per-Repo Intelligence Stack | How all seven primitives compose into one running system, and how that system creates a per-repo intelligence and memory stack: a static code index, a distilled query layer, a cross-session brain, and an ephemeral rolling log, each cheap, only diagnosis calling the LLM. Bridge to Phase 2. | SV-3 Ecosystem Data-Flow Map + SV-5 stack |

### 4.2 Phase 2 — Case study: how this harness was built (eight layers)

One scroll-driven narrative under a persistent through-question: **"How does it run long, autonomous tasks safely?"** Each layer is also its own static URL and zooms into one region of the same SV-3 map. Ordered as a deliberate build-up, not repo file order.

| ID | Layer | What the learner learns (why-here, not just what) |
|----|-------|----------------------------------------------------|
| P2-L1 | The Hooks Router | Why a single entry point switching on event name is understandable branching, not framework magic; why lazy loading means a prompt event never parses retrospective code; why fail-silent makes a crashing module safe. Plants "fail-silent in the hot path." Evidence: the `settings.template.json` routing rows. |
| P2-L2 | The Memory Loop (Memento write + read) | Why PreCompact is the one moment a fresh summary earns its cost; why one LLM call produces both memory and diagnosis; why poison detection means a failed write never overwrites good memory. Evidence: the `precompact-llm.mjs` write path and the poison-guard branch. |
| P2-L3 | The Rolling Log (a free audit trail) | Why append-only avoids read-modify-write races between parallel hooks; why JSONL is natural for logs; why no LLM call makes it truly free; how the summarizer scans it for efficiency signals. The ephemeral layer of the stack. Evidence: the append-one-line write in `rolling-log.mjs`. |
| P2-L4 | The LLM Client (provider-agnostic choke point) | Why a single choke point makes swapping models one-time and in the environment; why two wire formats exist (Responses API vs Chat Completions) and the fork is isolated in `buildRequest()`; why it returns null on failure so callers fail-silent. Plants "cheap, swappable model." Evidence: the `buildRequest` format fork. |
| P2-L5 | The MCP Server (code intelligence + brain) | Why a hand-rolled JSON-RPC loop is transparent; why tools return distilled answers not raw files; why indexing is one-time and pre-computed; how the brain survives sessions as searchable JSON. Layers 1 to 3 of the stack. Evidence: a tool handler in `mcp-server.ts`. |
| P2-L6 | The Workflow Layer (commands, skills, agents, gates) | Why separating "you type this" from "Claude decides" lets you be explicit when you want and let the model notice when it is smart; why agents work in clean context; why gates run at natural checkpoints (Stop = "you think you are done"); how skill activation is description match, not a hand-maintained list. Evidence: a command's YAML frontmatter and a `SKILL.md` description. |
| P2-L7 | The Self-Improvement Loop (lessons + diagnosis) | Why one LLM call per compaction writes both memory and lessons (amortized cost); why lessons are append-only so repeated patterns become visible; why aggregating across sessions catches long-term patterns; why the system proposes and the user approves. Evidence: the lesson-entry shape written on PreCompact. |
| P2-L8 | CLIMAX: Safe Autonomy via a Second-LLM Approval Gate | The tension first: how to run for hours unsupervised without `--dangerously-skip-permissions` or a human babysitting every prompt. The reveal: a second cheap LLM at the gate that default-allows unless the request matches one of five named harms; a cache turns repeated safe shapes into near-zero-cost hits. Why default-allow with a small deny set beats deny-by-default. The honest caveat (verbatim from the 7.2 README): this is a friction tool, not a security boundary. Payoff: "you can now reproduce this, by hand or by pointing your agent at this repo." Evidence: the `DENY_RULES` table from `evaluate-policy.mjs` (course module 7.2), explicitly labeled a deterministic stand-in for the real LLM gate. |

> **Accuracy guardrail (P2-L8).** The gate (cf-approve) is a **course-taught pattern**, not a wired layer in `reference/` or `hooks/`. It lives only in `course/07-level-up/7.2-cf-approve/`, and `evaluate-policy.mjs` self-describes as a deterministic stand-in for the real LLM gate. The 7-day cache TTL and the cache-hit and cents figures are course prose, not shipped config. The module must say so, present cost and cache as an explicitly illustrative simulation, and carry the friction-not-security caveat verbatim. See `00-brainstorm-session.md` section 4.1.

---

## 5. Signature visualizations

Five set-pieces. Each is authored as one typed data model rendered three ways (animated SVG, navigable table/tree twin, static fallback). Tier-1 are MVP; Tier-2 ship enhanced-static-first.

| ID | Name | Tier | What it teaches | The one load-bearing click |
|----|------|------|-----------------|----------------------------|
| SV-1 | Lifecycle Event Timeline | 1 | `settings.json` is just a routing table; every behavior is which script runs on which event. | Activate an event station: a drawer reveals the real routing row, the stdin-to-stdout contract, and the module it triggers. |
| SV-3 | Ecosystem Data-Flow Map ("trace a request") | 1 | How information flows through the whole system and creates a per-repo intelligence stack. Phase-1 capstone and the persistent Phase-2 territory. | Press play: one glowing token walks the real ecosystem flow, each node pulses, an inspector shows the real payload, and disk visibly accretes a memory file. |
| SV-4 | Safe-Autonomy Approval Gate | 1 | Why a second LLM default-allowing all but five named harms enables long unattended runs; why default-allow is the counterintuitive-but-correct direction. | Place a real-shaped request: it resolves to ALLOW silently or DENY with the matched named-harm rule. A default-allow vs deny-by-default toggle explodes the human-prompt count. |
| SV-2 | Orchestrator-to-Subagent Fan-Out | 2 | What distinguishes a subagent: a separate clean context, a scoped objective, exclusively-owned files; why parallel beats sequential. | Spawn: N subagents animate outward, each a clean-context bubble with a distinct file-set, then report back; a parallel-vs-sequential toggle makes the throughput win visceral. |
| SV-5 | Per-Repo Intelligence & Memory Stack | 2 | Four cheap layers compose into per-repo intelligence: static index, distilled query, cross-session brain, ephemeral rolling log; only diagnosis calls the LLM. | Click a tool call in the rolling log: it highlights the brain notes it might trigger and animates the summarizer scanning the log for signals. |

The remaining Tier-2 interactions (the Memento write/read split-screen, the token-economy calculator, the raw-vs-distilled toggle) reuse the same grammar and ship enhanced-static-first.

### 5.1 The shared diagram grammar

- **Node taxonomy** (documented and reused): router = diamond, dispatcher = hub, module = rounded-rect, disk = cylinder, LLM = hexagon, tool = pill.
- **Typed edges** with a color and dash legend: event-payload, stdout-context, disk-write, LLM-call, tool-call.
- **Shared components:** `DiagramFrame`, `FlowNode`, `TypedEdge`, `InspectorPanel`, `TracePlayer`, `Legend`.
- **Tri-render contract frozen first.** Per the feasibility red-team, the grammar is scoped to the node-graph/flow family (SV-1, SV-3) for v1; SV-2, SV-4, and SV-5 share the data-table-twin conventions but author their visual layer bespoke. "One engine for all five" is explicitly cut.

---

## 6. Feature catalog (MoSCoW, with feasibility and cost)

All twenty-four features are feasible as a fully static GitHub Pages site; none needs a backend, secret, or runtime. Build cost is the feasibility red-team's honest estimate (which corrects two of the panel's own ratings). "MVP" marks the seventeen items in the first shippable release (section 9).

| ID | Feature | MoSCoW | Build cost | MVP | Notes / red-team correction |
|----|---------|--------|------------|-----|------------------------------|
| F1 | Astro static MPA + Preact island shell | must | M | yes | One URL per module under `/<repo>/`; islands `client:visible`; React imports linted out. |
| F2 | Shared diagram data-model + tri-renderer grammar kit | must | **XL** | yes | Rated L by the panel; **effectively XL**. Scope to the node-graph/flow family first; author others bespoke. Freeze the contract before any set-piece. |
| F3 | Animation/diagram stack (lightest tool per viz, lazy islands) | must | L | yes | Hand-rolled SVG + WAAPI + Motion One (~10KB); build-time static SVG; D3 submodule imports only. React Flow and GSAP rejected. |
| F4 | SV-3 Ecosystem Data-Flow Map | must | XL | yes | Ship fixed-zoom trace first; derive animation and ordered-list from one step-script; defer progressive zoom. |
| F5 | SV-4 Safe-Autonomy Gate (climax) | must | L | yes | Port `evaluate()` and fixtures verbatim; label deterministic stand-in; cost/cache figures illustrative only; friction-not-security caveat verbatim. |
| F6 | SV-1 Lifecycle Event Timeline | must | M | yes | **Five** real stations (PreToolUse shown as an unsubscribed platform event, no fabricated row). Landing hero. |
| F7 | SV-2 Orchestrator-to-Subagent Fan-Out | should | L | no | Tier-2. Match the repo's restraint (subagents only for 3+ disjoint workstreams). Ship static tree twin first. |
| F8 | SV-5 stack + Memento split-screen + raw-vs-distilled + token calculator (bundle) | should | L | no | Four separable deliverables sharing the grammar; ship accessible static twins as v1, add interactivity opportunistically. |
| F9 | HEVA module template (Hook-Explain-Visualize-Apply) | must | M | yes | The template is M; **filling it sixteen times accurately is the dominant project cost** (tracked separately, section 9). Two-track "just the mental model" fast path. |
| F10 | "Which primitive fits?" scenario engine | must | M | yes | JSON-authored; non-drag select-then-place; every wrong choice returns specific discriminating-feature feedback. This is the mastery definition. |
| F11 | Retrieval-practice quiz engine + item bank | must | M | yes | 2 to 4 varied items per module; ungated; elaborated feedback via aria-live; `<details>` answer key floor with JS off; spaced cross-module warm-ups. |
| F12 | Claim-to-evidence inline artifact excerpts | must | M | yes | Shiki build-time highlighting; SHA-pinned deep links to this repo; CI grep guards ported rule ids. **Audit every pin against the repo at `5633273` before authoring.** |
| F13 | Navigation, progress rail, two-phase tracks | must | M | yes | Two top-level tracks; per-module rail; persona-routed landing (suggested, not gated); base-path-correct links. |
| F14 | Client-side progress/quiz persistence (localStorage) | must | S | yes | One versioned, repo-namespaced key (`claude-harness-atlas:v1`); fail-silent in-memory fallback; export/import JSON; explicit reset. |
| F15 | Accessibility infrastructure (WCAG 2.2 AA, data-model-first) | must | **XL** | yes | Rated L by the panel; **effectively XL**. Make the data-table/tree twin the primary accessible experience; treat SVG roving-tabindex as enhancement; budget manual screen-reader testing. |
| F16 | GitHub Actions static deploy with base-path discipline | must | S | yes | `configure-pages` to `upload-pages-artifact` to `deploy-pages` (not Jekyll); `.nojekyll`; styled base-path 404; banned root-absolute URLs. Safest item in the spec. |
| F17 | Per-page performance budget enforced in CI | must | M | yes | 0KB render-blocking JS on reading routes; viz island ≤35KB gz; ≤60KB JS/interactive page; Lighthouse Perf ≥95. Set a11y bar honestly (Lighthouse 100 ≠ real AA for custom SVG). |
| F18 | "Direct your agent" exit funnel + on-ramp payoff | must | S | yes | Path A: by-hand build-order checklist deep-linking the repo wiki. Path B: one-click-copy agent prompt. The actual success condition of the product. |
| F19 | Pinned content data file for asserted facts | must | S | yes | The five named harms, the 8000/25000 budgets, and the lifecycle events with a SHA comment. Annotate that five events are wired and PreToolUse is an unsubscribed platform event. |
| F20 | Concept index / searchable glossary | should | S | no | Client-side filter over a pre-built JSON index of primitive cards. Returning-user convenience. |
| F21 | Mental-model cheat-sheet generator | could | S | no | Per-concept cards collected into a printable harness cheat-sheet, generated from F19. |
| F22 | Calibration summary (confident-but-wrong) + readiness self-assessment | could | S | no | Built entirely from localStorage quiz data; needs quiz volume to exist first. |
| F23 | Polish layer (View Transitions, OG images, dark/light, deep-link states) | could | M | no | No learning weight; defer entirely. |
| F24 | Cold-open + narrated climax walkthrough | wont | M | no | Scope creep (audio, captions, second narrative). Fold the 60-second cold-open text into the SV-4 intro prose for free. |

---

## 7. Architecture and recommended stack

Every decision flows from one constraint: GitHub Pages is fully static, has no backend or secrets, and serves under a `/<repo>/` base path.

- **Site generator:** **Astro** (static MPA, one statically-rendered URL per module). Zero framework JS on the reading path by default; interactivity opted into per component. Chosen for its "document by default, app where it earns it" island model, the exact shape of a no-sandbox concept course.
- **Interactivity:** islands architecture with **Preact (~3KB)** as the single locked island runtime, hydrated `client:visible` so a viz downloads only when scrolled into view. Capped at roughly two to three interactive islands per page. React and React Flow rejected to avoid a ~40KB+ runtime on every interactive page; lint rules ban React imports. Stateful islands are limited to the calculator, the quiz engine, and the scenario sorter; everything else prefers CSS and the Web Animations API over JS state.
- **Diagrams and animation:** no monolith. Hand-rolled inline SVG positioned with CSS; WAAPI and CSS transitions plus **Motion One (~10KB)** for token-along-path and staggered reveals; static architecture diagrams pre-rendered to SVG at build time; **D3 only via submodule imports** (`d3-scale`, `d3-shape`) into the single island that needs layout math; charts hand-rolled. Every diagram is one typed data model rendered three ways. GSAP and React Flow rejected on bundle and license grounds.
- **Content model:** freshly-authored static content. No markdown-sync pipeline, no submodule, no generation from existing `course/**/README.md`. Module prose and HEVA beats authored directly (Astro content collections / MDX) and condensed from the official Claude Code docs plus this harness's docs. The few asserted concrete facts live in one pinned data file (F19) with a commit-SHA reference. Code excerpts are short, read-only, build-time-highlighted (Shiki) and deep-linked at a pinned SHA; a CI grep guards the gate's rule ids against drift.
- **State persistence:** client-side only. localStorage under one versioned, repo-namespaced key holding per-module completion, quiz answers, scores, confidence, scenario results, and last-position. Fail-silent on unavailable or full storage (in-memory fallback, never throws), with explicit reset and export/import. No backend, no cookies, no accounts.
- **Deploy pipeline:** GitHub Actions, official `configure-pages` to `upload-pages-artifact` to `deploy-pages` (not branch-based Jekyll). Astro `site` and `base` set for the `/<repo>/` subpath; root-absolute URLs banned via `BASE_URL` helpers; `.nojekyll` emitted so `_astro/` hashed assets serve; a styled base-path-correct `404.html`.

**Why this stack.** Astro plus islands gives the mandated zero-JS reading floor for free and makes interactivity a per-component opt-in, so the heavy cost (diagram and animation libraries) is isolated to lazy islands behind hard CI budgets rather than shipped sitewide. The data-model-first diagram architecture is the linchpin that resolves the three-way tension between world-class interactivity, the no-JS floor, and WCAG 2.2 AA: one typed model yields the animation, the screen-reader-navigable twin, and the static fallback, so accessibility is structural, not retrofitted, and authoring cost is amortized instead of tripled.

---

## 8. Information architecture

Top-level nav under `/<repo>/`: Home, Foundations (Phase 1), Case Study (Phase 2), Direct Your Agent, plus a Concept Index and an About/Accessibility page. One static URL per module.

- **`/` (Home).** Persona-routed landing whose 90-second hero is the SV-1 timeline, giving the core mental model before any prose. Three suggested (not gated) paths: "New to harnesses to Foundations," "Evaluating safe-autonomy to the case-study climax," "Returning / specific concept to Concept Index." A course-level progress bar reads from localStorage.
- **`/foundations/` (Phase 1 hub).** The primitive ladder in dependency order, each its own URL on the HEVA rhythm: `what-is-a-harness` (P1-M1), `event-model` (P1-M2, owns SV-1), `fail-silent` (P1-M3), `primitives` (P1-M4, owns SV-2), `mcp` (P1-M5, owns raw-vs-distilled), `memento` (P1-M6, owns the split-screen), `token-economy` (P1-M7, owns the calculator), `ecosystem` (P1-M8 capstone, owns SV-3 and SV-5). Separate Phase-1 progress track and per-concept mastery meter.
- **`/case-study/` (Phase 2 hub).** One scroll-driven narrative under the persistent through-question banner, introducing the SV-3 map as the territory first. Eight layer scenes, each its own URL that also reads as a scene in the scroll: `hooks-router` (P2-L1), `memory-loop` (P2-L2), `rolling-log` (P2-L3), `llm-client` (P2-L4), `mcp-server` (P2-L5), `workflow` (P2-L6), `self-improvement` (P2-L7), `safe-autonomy` (P2-L8 climax, owns SV-4). Each zooms into one region of the same SV-3 map, answers what / why-here / how-it-connects, and carries a "show me where" evidence excerpt. Separate Phase-2 progress track.
- **`/direct-your-agent/`.** The terminal ACT page (F18): copy-paste agent prompt (Path B) plus a by-hand build-order checklist deep-linking the repo wiki (Path A) plus a readiness self-assessment.
- **`/concepts/`.** Searchable Concept Index of primitive cards for returning users. **`/about`** and **`/accessibility`** document the floor-vs-enhancement contract and the diagram keyboard model.

**Cross-cutting.** A persistent "N% to being able to direct an agent" meter in module footers; every diagram node deep-links across phases (a Phase-1 timeline station links to its Phase-2 region and vice versa). Every URL is fully readable with JS off; the `404.html` fallback is styled and base-path-correct.

---

## 9. MVP and roadmap

### 9.1 MVP (seventeen features)

The smallest world-class release: the full Phase-1 ladder (all eight Foundations modules on the HEVA rhythm) plus the safe-autonomy climax of Phase 2, on the Astro/Preact static foundation, with three Tier-1 set-pieces (SV-1 as hero, SV-3 trace at fixed zoom, SV-4 gate), the scenario sorter and ungated quiz engine, claim-to-evidence pins audited against the repo at `5633273`, localStorage persistence, an accessibility floor delivered primarily through the data-table/tree twins, CI perf/a11y/link/rule-drift gates, and the "direct your agent" exit funnel.

**MVP feature set:** F1, F2, F3, F4, F5, F6, F9, F10, F11, F12, F13, F14, F15, F16, F17, F18, F19.

This delivers the complete mental-model spine, the signature payoff, and the exit-to-action that defines product success.

### 9.2 Build sequence

Content authoring is tracked as its own line item, separate from engine work, because it is the dominant and most under-budgeted cost (sixteen modules, the scenario feedback bank, the quiz bank, and five tri-rendered visualizations).

1. **Foundation and contract.** Confirm the canonical repo URL (open decision). Scaffold Astro with `site`/`base`, the deploy pipeline (F16), CI budget gates (F17), and localStorage (F14). Freeze the F2 tri-render data contract for the node-graph/flow family. Author the F19 facts file and audit every evidence pin against `5633273` (F12).
2. **The HEVA engine and assessment.** Build F9, F10, F11, F13 against the frozen contract.
3. **Tier-1 set-pieces.** SV-1 (F6), then SV-3 fixed-zoom trace (F4), then SV-4 gate (F5).
4. **Phase-1 content.** Author all eight Foundations modules to full accuracy (the dominant line item).
5. **The climax and the exit.** Author P2-L8 with the accuracy guardrail, and the F18 funnel.
6. **Accessibility hardening.** Twin-first AA across all set-pieces plus budgeted manual screen-reader testing (F15).

### 9.3 Fast-follow (post-MVP)

- The remaining seven Phase-2 teardowns (P2-L1 to P2-L7), shipping the SV-3 region zoom and per-layer evidence as they land.
- Tier-2 set-pieces: F7 (SV-2), F8 (SV-5, Memento split-screen, token calculator, raw-vs-distilled), each enhanced-static-first.
- F20 (concept index), F22 (calibration), then F21 (cheat-sheet) and F23 (polish).
- Progressive zoom and disclosure on SV-3.

### 9.4 Cut

- **F24** (cold-open + audio climax) stays `wont`; fold the 60-second framing into the SV-4 intro prose for free.
- **"One engine for all five visualizations"** inside F2 is cut; scope the grammar to the node-graph/flow family and author the others bespoke.

---

## 10. Non-functional requirements

- **Performance (CI-enforced).** Reading-path routes ship 0KB render-blocking framework JS. Any single viz island ≤35KB gzipped; total JS per interactive page ≤60KB gzipped; roughly two to three interactive islands per page max. Lighthouse Performance ≥95 on representative routes; `size-limit` asserts island entrypoints. Self-hosted subset fonts; content-hashed compressed assets; no layout-shifting or blocking third-party requests.
- **Accessibility (WCAG 2.2 AA).** Encoded at the design-token layer: 3:1-contrast visible focus rings (including explicit SVG focus-ring rects), color-independence (shape/label/pattern alongside color), 4.5:1 and 3:1 contrast, `prefers-contrast` and `forced-colors` support via `currentColor`, ≥24px targets (2.5.8). Roving-tabindex/arrow-key composite for diagram nodes; play/pause/step plus live-region narration for animations; `prefers-reduced-motion` static forks from the same data model; non-drag equivalents for every drag interaction; a skip-to-data-table link per complex viz. Automated axe-core/Pa11y plus a Lighthouse Accessibility gate in CI, with the honest caveat that Lighthouse cannot certify custom SVG keyboard semantics: those are validated by budgeted manual screen-reader testing.
- **No-JS floor.** With JS off: all HEVA prose, every diagram's data twin, the numbered trace steps, and quiz answer keys (in `<details>`) are present and legible; internal links are base-path-correct; the styled 404 resolves.
- **Resilience / fail-silent.** If an island fails to hydrate, its accessible static/data-twin equivalent remains usable. localStorage failures fall back to in-memory and never throw. This mirrors the harness's own fail-silent principle.
- **Privacy.** No backend, no cookies, no accounts, no analytics that transmit PII. All progress is local and user-exportable.
- **Accuracy / drift defense.** A single pinned facts file plus SHA-pinned excerpts; a CI grep guards the gate's ported rule ids against the live `evaluate-policy.mjs`; a CI link checker verifies every repo deep link resolves at the pinned SHA.

---

## 11. Open decisions (owner)

1. **Canonical repo URL and base path (blocking).** The site deploys as its own artifact while evidence deep links and the agent prompt target this repo (`build-a-claude-harness`). Confirm the canonical public repo URL and the site's own deploy repo/base path before scaffolding. Everything else can proceed once this is set.
2. **Pinned SHA freeze.** This spec pins `5633273`. Confirm the SHA to freeze evidence against once Phase-2 content authoring begins (the repo currently has uncommitted working-tree changes, so the frozen SHA should be a committed one).
3. **Site name and domain.** "Harness Atlas" is the working concept name; confirm whether it is the public name and whether a custom domain is wanted (affects the base path: a custom domain serves at root, a project page at `/<repo>/`).

---

## 12. Risks (top five)

1. **Safe-autonomy accuracy.** The gate is a course-taught pattern, not a shipped harness layer, and its cache/cents figures are course prose. **Mitigation:** relabel as a teaching model, pin evidence to the real 7.2 files, present cost/cache as an explicitly illustrative simulation, keep the friction-not-security caveat verbatim. (Section 4.1 of the brainstorm doc.)
2. **The five-event premise.** The harness wires five events, not six; pinning a PreToolUse routing row would break the claim-to-artifact contract. **Mitigation:** five real stations, PreToolUse taught as an unsubscribed platform event.
3. **Authoring volume.** Sixteen accurate modules plus scenario and quiz banks plus five tri-rendered visualizations is the real cost, hidden inside engine M/L ratings. **Mitigation:** budget authoring as its own line item; condense from the grounded content map; MVP caps Phase 2 to the single climax.
4. **Accessibility of bespoke SVG.** F15 is effectively XL; Lighthouse 100 does not equal real AA for custom SVG. **Mitigation:** twin-first as the primary accessible path; manual screen-reader testing budgeted.
5. **Base-path / cross-repo handoff.** An unresolved canonical URL plus a site-repo/evidence-repo split is a deep-link mismatch waiting to happen. **Mitigation:** confirm the URL first; `BASE_URL` helpers with a lint ban; SHA-pinned deep links; verify the 404 under `/<repo>/`.

---

## 13. North-star metrics

1. **Activation:** percent of landing visitors who reach and interact with the SV-1 hero timeline within the first session.
2. **Phase-1 schema mastery:** median per-concept mastery-meter score across the eight Foundations modules, with attention to the command-vs-skill-vs-subagent scenario (the most-confused distinction).
3. **Misconception flip rate:** percent of learners who answer a module's opening misconception wrong but later pass the same misconception in a spaced warm-up.
4. **Climax comprehension:** percent of learners who correctly predict ALLOW/DENY and name the matched named-harm rule on the safe-autonomy gate.
5. **Exit-to-action conversion:** percent of learners reaching `/direct-your-agent/` who copy the agent prompt or follow a repo build-order deep link.
6. **Accessibility floor integrity:** 100% of modules pass the CI axe-core/Pa11y plus Lighthouse Accessibility gate, and every diagram's data-table twin and quiz answer key are present with JS disabled.
7. **Performance budget adherence:** 100% of reading routes ship 0KB render-blocking framework JS and every viz island stays under its 35KB gzipped budget.
