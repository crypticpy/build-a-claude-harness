# Harness Atlas — Design System

**Companion to** `03-design-workshop.md` (how this was reached) and `01-prd.md` (the product spec). The five signature visualizations that consume this system are specified in `05-visualization-blueprints.md`.

This is the design language: theme, tokens, the shared diagram grammar, the trust grammar, the component inventory, the motion language, voice and tone, accessibility-as-craft, and the implementation architecture. Everything here is authored on `currentColor` plus shape plus dash so the dark aesthetic and WCAG 2.2 AA are the same act, not a tension.

---

## 1. Design concept

Harness Atlas is one continuous instrument the learner walks deeper into, not a website with pages. The unifying substance is a glowing token of data in flight, traveling typed wires across a single node grammar that is identical in the landing hero, the Phase-1 capstone, and the Phase-2 climax: read the token once and you can read every figure. The whole thing is built the way the harness it teaches is built: lean, inspectable, fail-silent, with every claim pinned to a real artifact at a committed SHA.

Two altitudes of one world, never two skins. Phase 1 is a calmly-lit gallery of eight HEVA rooms; Phase 2 is a dimming cinematic descent onto a persistent ecosystem map. The only things that change are surface lightness, grid opacity, and where the signal-glow lives. Trust is a visible material, accessibility is the substrate the atlas is printed on, and the exit hands you a real command, never a trophy.

---

## 2. Theme

### 2.1 Recommended: Single-Surface Instrument (Slate, dark-led)

**Mood.** A powered-off oscilloscope warming up. Debugger-grade clarity, museum calm, provenance-obsessed. Confident and unhurried; nothing glows that is not carrying data.

**The lamp-brightness lever.** Phase is one attribute on `<body>`. Phase 1 raises `--surface` lightness and grid opacity to read as a lit gallery within the dark world; Phase 2 lowers both so the wire-glow dominates. The descent is a continuous dimming, not a theme switch, and no component is phase-aware in its own code.

**Palette logic.** One ground (`#0E1116` slate-graphite, never pure black, to ease OLED-phone eye-strain), two raised surfaces, three ink weights. The single accent is one "live signal" amber reserved exclusively for the thing currently carrying data (a token, a lit wire, a just-fired event), so glow always means real flow. Status is shape-first: ALLOW mint with a solid pill and check, DENY coral-rose (not pure red) with a hexagon-cut and a struck rule.

**Typography: three voices, each load-bearing.**
- **Display (serif):** Source Serif 4, weight 600, for room titles, the Phase-2 through-question banner, and pull-quote corrections. The curator's voice.
- **Body (sans):** Inter, 17px/1.6 on phone rising to 18px desktop, 64ch measure. The narration voice.
- **Mono:** JetBrains Mono with tabular figures, for all evidence, payloads, routing rows, SHAs, verdicts, and every data-table twin. The machine/artifact voice.

The rule is absolute: mono means a real artifact or a literal value, sans means us explaining, serif means the curator framing. The face-switch is itself a color-independent fact-vs-prose signal.

**Motion personality.** Instrument, not entertainment. One near-linear ease for data in transit (reads as a constant-velocity packet) and one decisive settle for arrivals and commits. No bounce, no spring, no overshoot anywhere. Exactly one deliberately fast, overwhelming exception: the SV-4 deny-by-default detonation.

**Tradeoff accepted.** A dark-only MVP means Phase 1's calm gallery must achieve museum-calm within a dark ground, solved with the lamp lever rather than a second palette. Three self-hosted families pressure the font budget; the serif is the cuttable layer if the budget bites (body and mono are non-negotiable).

### 2.2 Alternative (deferred): Two-Altitude Editorial (Paper Phase 1 to Slate Phase 2)

A warm-paper Phase 1 that descends to slate for Phase 2. It produces a marginally calmer daylight gallery but costs two CI-certified palettes (contrast, focus rings, forced-colors) for an MVP where light mode is a deferred polish item (F23). Choose it only if user-testing shows skimmers bounce off a dark Phase 1. Because the recommended grammar is authored entirely on `currentColor`, this remains an additive token swap in fast-follow, not a parallel build.

---

## 3. Design tokens (starting set, recommended direction)

**Surfaces and ink**
- `--bg: #0E1116` (Phase-1 lifts to ~`#12161D` via the surface-lightness lever)
- `--surface: #161A21`; `--surface-2: #1D222B`
- `--surface-caveat: #1B1813` (the amber-hairlined teaching-band ground, distinct from vellum)
- `--ink: #E8EBF0` (~13:1); `--ink-muted: #A6B0BE` (~6.5:1); `--ink-faint: #6B7585` (hairlines and grid only, never load-bearing text)

**Signal and status**
- `--signal: #FFB454` (live-flow amber, ~9:1; only on data currently in motion)
- `--signal-dim: #6E5A33` (a resting, unlit wire)
- `--allow: #5BD6A6` (mint; always paired with a solid-pill shape and check glyph)
- `--deny: #F2748B` (coral-rose; always paired with a hexagon-cut shape and struck-rule glyph)

**Focus**
- `--focus: #5CE0E6` (cyan, at least 3:1 on `--bg` and on every node fill, CI-verified)
- `--focus-ring: 0 0 0 2px var(--surface), 0 0 0 4px var(--focus)` (double-stroke with a surface gap)

**Typed edges (hue + dash + glyph, all three channels)**
- event-payload: `#FFB454`, solid, glyph `▸`
- stdout-context: `#7FB2E8`, long-dash `8 3`, glyph `▹`
- disk-write: `#D8B878`, dotted `1 4`, glyph `▢`
- LLM-call: `#B69CE8`, dash-dot `6 3 2 3`, glyph `⬡`
- tool-call: `#6FC8C0`, short-dash `3 2`, glyph `▭`

**Type and space**
- `--font-display: 'Source Serif 4', Georgia, serif` (600)
- `--font-body: Inter, system-ui, sans-serif` (17 to 18px / 1.6 / 64ch)
- `--font-mono: 'JetBrains Mono', ui-monospace, monospace` (tabular-nums)
- Type scale (1.2 modular @16px base): 2xs 11, xs 13, sm 14, base 16, lg 19, xl 23, 2xl 28, 3xl 33 (hero line)
- Spacing (8px grid): 1=4, 2=8, 3=12, 4=16, 6=24, 8=32, 12=48, 16=64
- Radius: `--radius-pin: 4px`, `--radius-panel: 10px`, `--radius-node-rect: 6px`, `--radius-full` (tool pills)
- Targets: `--target-min: 24px` (WCAG 2.5.8), `--target-comfortable: 44px` (primary actions)

**Borders and texture**
- `--border-hairline: 1px rgba(232,235,240,.12)`
- `--border-evidence: 1px solid var(--signal-dim)` (the pinned-fact outline)
- `--grid: 1px hairline #6B7585 @6% opacity, 24px cell` (Phase 2 fades to 2%)
- `--vellum: #1A1E24` + 1px engraved top-rule `#2A3038` + a 3% build-time SVG-noise data-URI (pinned-evidence only)
- Elevation is flat by default; the only "shadow" is the 1px focus-grade glow on a lit node, which doubles as the focus affordance.

**Motion**
- `--motion-instant: 0ms` (reduced-motion / teleport); `--motion-tick: 120ms` (counter ticks); `--motion-transit: 220ms` (token across a short edge); `--motion-settle: 320ms` (drawer open, node accept, region focus); `--motion-walk: 600ms` (token across a long SV-3 segment)
- `--ease-transit: cubic-bezier(0.4,0,0.6,1)` (data in transit); `--ease-settle: cubic-bezier(0.2,0,0,1)` (arrival / commit); `--ease-arrest: cubic-bezier(0.3,0,0.1,1)` (the SV-4 DENY deceleration-to-stop only)
- `--stagger: 60ms` (sibling reveals, max 8 visible then snap)

---

## 4. The shared diagram grammar

The node taxonomy is fixed; shape carries meaning independent of color, so forced-colors (which strips fill to `currentColor`) keeps the type legible.

**Node taxonomy**
- **router = diamond:** hand-rolled SVG `<polygon>`, 1.5px `currentColor` stroke, fill only on activation. The SV-1 stations and the SV-4 gate are diamonds, so a learner reads the climax gate as one more router on a map they already trust.
- **dispatcher = hub:** a central node with radiating stubs; the orchestrator in the SV-2 fan-out.
- **module = rounded-rect:** `--radius-node-rect`; the hook modules each event triggers.
- **disk = cylinder:** a clipped inner group that visibly accretes one JSONL line per disk-write step. The per-repo-intelligence thesis made physical.
- **LLM = hexagon:** the reasoning and diagnosis calls; the violet LLM-call edge binds to it.
- **tool = pill:** `--radius-full`; the tool-call layer.

All shapes are drawn with a fixed-seed build-time corner jitter (~2px) for Excalidraw warmth without runtime randomness: "a smart human drew this for you," not "a framework auto-laid-out this." The legend is generated by rendering each node component at quarter scale, so it can never drift from the diagram.

**Typed edges, neutral at rest.** Color-independent encoding is structural, not added: every edge type ships three simultaneous channels (hue, dash-array, and a midpoint glyph), and the token uses the same `stroke-dasharray` as its track. Any single channel alone disambiguates, so deuteranopia, grayscale print, and forced-colors all survive on dash plus glyph. **Per the dial-in pass, edges are drawn in one neutral resting stroke (`--signal-dim`, solid) at rest, and an edge reveals its true type (dash, glyph, hue) only when it is the active, lit segment.** Type-encoding is a per-step teaching event, not resting decoration; this protects "one lit thing" and kills the "busy schematic" read with no accessibility loss (type still survives on the lit edge and in the table twin). The dash signature renders identically in the SVG caption legend and as a leading mono glyph in the twin's column header, so the legend is learned once across both surfaces.

**Grid and layout.** CSS subgrid with a prose column (~62 to 66ch) and a shared figure column that the SVG, its data-table twin, and the evidence excerpt all occupy, so the twin sits in the same slot as the diagram and reads as a first-class sibling, never a footnote. Container-query driven: a phone collapses figure-under-prose with no JS breakpoint, and below the panel breakpoint the twin collapses behind the always-visible "SVG / DATA" segmented toggle as a `<details>`-wrapped panel (still present JS-off, still screen-reader-primary via the skip link). The engineering-vellum grid sits as a fixed CSS background only on diagram frames (absent on prose). In Phase 2 the persistent SV-3 map is held in a `position: sticky` figure column while prose scrolls past: zero scroll-listener JS for the hold; only an `IntersectionObserver` toggles which region is lit.

---

## 5. The trust grammar

Two textures carry the entire trust vocabulary and appear nowhere decorative. Marcus learns the binary in five seconds.

- **VELLUM** (`--vellum` tint + engraved top-rule + 3% build-time noise): used only on pinned-evidence cards. Means "real at the committed SHA."
- **DIAGONAL-HATCH** (`currentColor` at low opacity, 4px pitch): used only on the SV-4 teaching stand-in band and any illustrative-simulation figure. Means "course-taught, not shipped."
- A third, lighter treatment (a dashed hollow outline plus a plain "platform event, not subscribed" label) marks real-but-unpinnable platform behavior like PreToolUse, so the site never implies a pin exists where it cannot.

The survey-marker corner pin is the only literal cartographic gesture: no compass, no latitude lines, no parchment. Restraint is what makes the trust read as integrity rather than theme.

**Honesty caveats render verbatim and un-skippable.** The SV-4 "a friction tool, not a security boundary" and "deterministic stand-in for the real LLM gate" lines sit as fixed captions at verdict type-size inside the hatch band, in the machine's mono voice, so provenance reads as a measured fact, not a disclaimer the eye routes around. CI greps the verbatim constant.

---

## 6. Component inventory

Three components, and only three, are allowed to hold `useState` (the calculator, the quiz engine, the scenario sorter), lint-enforced so the bundle budget cannot rot. Everything else is static HTML, CSS, or a decorator island that mutates already-present static SVG.

| Component | Role | Static / island | Notes |
|-----------|------|-----------------|-------|
| `BaseLayout` + `tokens.css` | Global token spine; sets surface-lightness, grid-opacity, and data-tier on `<body>` so phase tone is a swap, not a fork | static | No component is phase-aware in its own code. |
| `ProgressRail` + HEVA Beat shell | The module spine: Hook/Explain/Visualize/Apply as `<section>`s with a sticky `<ol>` anchor rail; two-track fast-path vs go-deeper via native `<details>` | static | 100% CSS + `:target` + anchor links; `IntersectionObserver` is enhancement-only. Looks interactive, costs 0KB. Completion fill hydrates lazily from the shared store; the rail survives JS-off. |
| `PredictionCommit` (Hook) | The signature commit-a-prediction beat: one tap before any explanation, then a dual-coded correction naming the discriminating feature | static | CSS-only: radio inputs + `:checked` sibling combinator reveal the corrected sentence; works JS-off with the answer key in `<details>`. The shared progress island attaches one delegated listener to record the commit, fail-silent; the reveal works even if that island never hydrates. |
| `EvidencePin` / `CodeExcerpt` + `RepoLink` | The "show me where" trust component beside every claim: build-time Shiki excerpt + callout pins + a permalink at the committed SHA | static | Zero client JS, zero highlight JS (Shiki at build). Vellum chrome = pinned fact. The CI link-checker resolves every permalink; `extract-excerpts.mjs` prevents drift. The single most important Marcus-trust carrier. |
| `Fact` / `Caveat` typographic components | Encodes the integrity contract: `<Fact>` (mono + pin glyph + "FACT · <sha>" + a `currentColor` left-rule, pulling F19 values) vs authored sans prose; `<Caveat role=note>` renders the friction-not-security text verbatim | static | `<Fact>` is the only path to that styling, so a pinned number physically cannot ship without the stamp. CI greps the verbatim caveat. Four channels (face + glyph + label + border) so no single-channel loss erases trust. |
| `DiagramFrame` + `FlowNode` + `TypedEdge` + `Legend` | The frozen grammar kit: build-time static SVG for the node-graph/flow family (SV-1, SV-3); parametric shapes per taxonomy, typed edges with triple-channel encoding, auto-generated legend | static | F2, effectively XL: freeze the `DiagramModel` / `TraceScript` contract before any set-piece. Scoped to SV-1 / SV-3 only; SV-2/4/5 borrow the twin conventions but author visuals bespoke. |
| `TwinPanel` + `ViewToggle` ("SVG / DATA") | The first-class data-table/tree twin shell + an always-visible segmented toggle that advertises the twin to both audiences | static | Server-rendered `<table>` / `<ul role=tree>` from the same typed model (same-data-not-paraphrase by construction). The toggle is a CSS-only hidden-radio so the swap works JS-off. Shares `DiagramFrame` tokens so it reads as a sibling; the instrument-readout mono skin makes power users tap "DATA" on purpose. |
| `FocusRing` system + SVG `<rect>` focus-rects | A named, tokenized, at-least-3:1 double-stroke focus indicator that works on HTML, table rows, and SVG nodes | static | Declarative CSS via `:focus-visible`; SVG nodes carry a sibling `<rect class=focus-rect>` sized at build. Forced-colors swaps to system Highlight with `forced-color-adjust: none`. Survives island hydration failure. |
| `TracePlayer` | The shared motion engine (SV-1, SV-3, SV-5): play/pause/step/scrub, the glowing token along a path, the synced inspector, aria-live narration, the disk-accretion sub-choreography | island | Preact, `client:visible`, ~28KB gz including Motion One. State is a single integer step cursor. Mutates the already-present static SVG; never re-renders content. `d3-shape` layout is pre-computed at build and shipped as path-string JSON (zero d3 at runtime). `matchMedia` forks to step-only / teleport for reduced-motion from the same step-script. Roving-tabindex and live-region writes are ~1 to 2KB of vanilla imperative DOM, kept outside the Preact reconciler. |
| `InspectorPanel` | Shows the real payload at the current step in mono; shared markup between SVG-active and tree-active states | static | The payload lives in a data-attr in the DOM (present JS-off in the twin); the island only cross-fades it on step change. Per the SV-3 dial-in, it unfurls from the lit node via a 1px leader-line rather than sitting in a detached pane. |
| `ScenarioSorter` + `MasteryMeter` | The "which primitive fits?" instrument: select-then-place onto a slot or the who-pulls-the-trigger by where-it-runs 2x2; every wrong choice returns the specific discriminating-feature feedback | island | One of three sanctioned stateful islands. Select-then-place is primary (keyboard roving focus + Enter, 2.5.7); drag is an additive listener calling the same `place()` function. The item bank asserts at build that no option lacks a discriminator. Degrades to a static `<form>` matching exercise + `<details>` key JS-off. The meter is a quiet readiness statement, not a celebratory bar. |
| `QuizEngine` | The ungated APPLY quiz: predict-the-outcome, assertion-reason, confidence-weighted single-select, misconception-buster; immediate elaborated aria-live feedback | island | Second sanctioned stateful island. Never color-only correctness (icon + label + border). The answer key in `<details>` is the JS-off floor. Items authored against a frozen Zod-validated `ContentModule` schema so CI fails on malformed content. |
| `Calculator` (token-economy, P1-M7) | The 8000 / 25000 budget-to-frequency calculator | island | Third and final sanctioned stateful island. |
| `ApprovalGate` (SV-4 climax) | Select-then-place a real-shaped request to ALLOW (silent) or DENY (matched named-harm); the default-allow vs deny-by-default detonation; an illustrative cost meter (deferred, see blueprint) | island | A decorator-family island (single step/verdict cursor), ~22KB, leaner than `TracePlayer`. Runs `evaluate()` ported verbatim from the 7.2 `evaluate-policy.mjs` (five DENY_RULES + a default-allow fallthrough); CI greps the rule ids against that file. The request-to-rule-to-verdict-to-why table is the accessible truth, build-time generated by the same `evaluate()`, present JS-off. The teaching-band and verbatim caveat are static markup outside the island. |
| `PhaseTransition` / through-question banner | The museum-light-to-instrument-dark descent hinge; a `position: sticky` through-question held across all Phase-2 scenes | static | Per-phase CSS custom-property flip + a tiny `IntersectionObserver` class toggle. No new island, no state. Banner present and legible JS-off. |
| Progress store + footer `ReadinessMeter` | localStorage under `claude-harness-atlas:v1`, fail-silent to in-memory, export/import/reset; aggregates the "N% to direct an agent" readiness | static | `store.ts` is a try/catch pub/sub that never throws; unknown versions ignored. The footer meter is a no-state custom element (not a Preact island) so reading routes stay 0KB-framework; it renders an honest readiness statement server-side with the numeric bar as enhancement. |
| `CrossPhaseLink` | A Phase-1 station to its Phase-2 region anchor, so the two phases feel like one atlas | static | A plain base-path-correct `<a>` via the `href()` helper (root-absolute URLs lint-banned). When a region is unbuilt at MVP, links to a "territory you will walk later" dimmed-region state, never a broken link. |

---

## 7. Motion language

- **The token is the atom.** One ~12px luminous capsule colored by the edge it rides, traveling via Motion One `offsetDistance` / `offsetPath` along pre-rendered SVG paths, never per-frame JS. Learn it once on the hero, read every viz. Glow means live data; no glow means at rest.
- **One load-bearing control, everything else is consequence.** The learner drives exactly one thing (scrub, play-step, place-and-release); all other motion is a deterministic reaction. If a motion cannot trace to that one action or a state change, it is cut. No ambient drift, no decorative pulse.
- **Autoplay is forbidden except once:** the landing-hero token walks the wire once on first viewport entry (respecting reduced-motion), then parks at the scrubber as a "this is touchable" affordance. It never loops, and the instant a learner touches any control, autoplay yields, enforced structurally (no animation loop exists that is not driven by a user-ownable step index).
- **Easing encodes meaning.** `--ease-transit` (near-linear) for anything carrying data along a wire; `--ease-settle` (fast-in, decisive, no overshoot) for arrivals, drawers, commits; `--ease-arrest` for the SV-4 DENY deceleration only. No bounce, elastic, or spring anywhere.
- **Disk accretion is a reusable verb.** When the token passes the cylinder on a disk-write step, a sand-colored token detaches, rides the dotted edge in, and a new JSONL line draws on (`scaleY` 0 to 1, `--ease-settle`) while the cylinder grows one line. Reused identically in SV-5's rolling log so "append-only growth" has one consistent gesture site-wide.
- **Reduced-motion is the same step-script with duration 0.** The token teleports between states; it is not a separate asset. Play/pause/step and the data-table twin both read the one step index, so they can never disagree. Scrub controls stay live in reduced-motion (they are controls, not animations); only token tweens get the duration-0 treatment. Forced-colors drops the glow filter and falls back to a 2px `currentColor` token stroke plus the dash and glyph, with all timing intact.
- **The keyboard focus ring is the token** for keyboard and screen-reader users: roving-tabindex walks the same ordered step-script the animation and the numbered-list fallback derive from. One `aria-live=polite` region per viz narrates authored debugger-step sentences, gated to manual-step cadence so a fast step-through does not flood.

---

## 8. Voice and tone

- Plain-spoken harness-native register lifted from the repo itself: "settings.json is the router," "distill, don't dump," "show me where," "hand this to the human," "SVG / DATA." Never marketing adjectives, especially near the gate.
- The three typographic voices you can always tell apart: serif (the curator framing), sans (us narrating), mono (the machine and artifact speaking).
- Wall-label rhythm in Phase 1 (what-it-does / why-HERE / how-it-connects) and quietly cinematic restraint in Phase 2: terse, declarative, present-tense ("UserPromptSubmit fires. The router injects the session-memory block.").
- The Hook is an invitation, not a test: "Most people guess ___. What's your read?" No score, no buzzer, no red flash. Wrong and right get the same calm reveal; only the icon and label differ.
- Feedback is elaborated correction, never congratulation: no "Great job," no exclamation, no streaks, confetti, or gradebook. Every wrong placement returns the specific discriminating-feature feedback as text.
- Progress is an honest instrument readout, never a trophy: the meter states readiness ("You can predict 6 of 8 primitives") with any percentage strictly secondary.
- The exit is a terminal, not a certificate: the outcome stated plainly ("you can now reproduce this, by hand or by pointing your agent at this repo"), then one prominent copy-the-prompt action pointing at the repo at the pinned SHA.

---

## 9. Accessibility as craft

Accessibility is the substrate, encoded at the token layer, not retrofitted.

- **The twin is the primary accessible surface.** Every visualization's data-table or tree twin is server-rendered from the same typed model and styled as a first-class panel. Lighthouse cannot certify custom-SVG keyboard semantics, so the twin carries the compliance load and SVG roving-tabindex is enhancement.
- **Color-independence is structural:** node type via shape, edge type via dash plus glyph, ALLOW via solid-pill-plus-check, DENY via hexagon-cut-plus-struck-rule. CI Playwright forced-colors screenshots of SV-1/3/4 are required review artifacts.
- **Focus** is a tokenized double-stroke ring (at least 3:1) including explicit SVG focus-rects, swapping to system Highlight under forced-colors via `forced-color-adjust: none`, surviving island hydration failure (declarative `:focus-visible`).
- **Keyboard** roving-tabindex walks lifecycle/step order, not DOM or spatial order. Every trace step is a real focusable row or tree item with `aria-posinset` / `aria-setsize` announced as "step N of M" independent of any SVG focus. A manual NVDA + VoiceOver pass is a budgeted, required review artifact.
- **Motion:** play/pause/step plus live-region narration; `prefers-reduced-motion` lands on a legible static end-state from the same step-script (verify each settled frame reads the full lesson with zero motion).
- **Drag:** select-then-place is the primary, keyboard-operable path for every drag interaction (2.5.7); drag is an additive listener on the same handler. All targets at least 24px (2.5.8); never shrink a harmful SV-4 chip below target size to achieve a visual ratio (encode the ratio with spacing and labeling).
- **No-JS floor:** all HEVA prose, every diagram's data twin, the numbered trace steps, and quiz answer keys (in `<details>`) are present and legible; internal links are base-path-correct; the styled 404 resolves under `/<repo>/`.

---

## 10. Implementation architecture

- **One typed model, three renders, one author pass.** Every visualization is a `DiagramModel` TypeScript object (nodes, edges, steps, inspector payloads). A build-time Astro component emits the static SVG, the `<table>` / `<ul role=tree>` twin, and the ordered step list from that one model, so the three renders cannot diverge and authoring cost is paid once.
- **Islands discipline.** Preact only, `client:visible` only. The three stateful islands (calculator, quiz, sorter) are the only components allowed `useState`, lint-enforced. The decorator islands (`TracePlayer`, `ApprovalGate`) hold a single integer cursor and mutate present static SVG; they never re-render content.
- **Build-time everything that can be.** Shiki highlighting, `d3-shape` / `d3-scale` layout (shipped as path-string JSON), the legend, OG images, and the diagram SVGs are produced in CI. `d3-*` and `react` / `react-flow` imports are lint-banned inside any `client:`-directive file.
- **Provenance pipeline (the build gate).** One `--pin-sha` token (a clean committed SHA in `build-a-claude-harness`); `scripts/extract-excerpts.mjs` regenerates every code excerpt from the live file at that SHA; the CI link-checker resolves every permalink and fails on a 404; model generators read the actual `settings.template.json`, the hook modules, and the 7.2 `evaluate-policy.mjs`, failing the build if any subscribed-flag, row count, command string, module path, or rule id drifts. No visualization is built until this gate is green.
- **Content pipeline.** Modules are Astro content collections / MDX validated against a frozen Zod `ContentModule` schema (so CI fails on malformed content), with the asserted facts (the five events, the five named harms, the 8000 / 25000 budgets) pulled from one pinned facts file (F19).
- **Persistence.** `store.ts` is a try/catch pub/sub under `claude-harness-atlas:v1` that never throws, falls back to in-memory, ignores unknown versions, and exposes export/import/reset.
- **CI gates.** Per-island gzip budget (fail above 35KB), per-page JS budget (fail above 60KB), a 0KB-render-blocking-framework assertion on reading routes (parse built HTML for hydration directives on non-viz routes), Lighthouse Performance at least 95 and Accessibility at least 100 on representative routes, the link-checker, the excerpt-drift check, the rule-id drift check, a `filter: blur` grep guard, axe-core / Pa11y, and a no-JS smoke test.
- **Deploy.** GitHub Actions `configure-pages` to `upload-pages-artifact` to `deploy-pages` (not Jekyll), `.nojekyll`, `site` and `base` set for `/<repo>/`, a styled base-path-correct 404, self-hosted subset fonts (`font-display: swap`, the serif cuttable if the budget bites).

---

## 11. Open design decisions

1. **Canonical pin SHA (blocking).** Freeze a clean committed SHA in `build-a-claude-harness` before any visualization cites it (open decision 2 in `01-prd.md`). The teaching repo had uncommitted changes at workshop time.
2. **Atlas-metaphor dosage.** The synthesis chose restraint (the persistent map and a single survey-marker pin, no compass or parchment). Confirm that restraint is the intended brand before scaffolding the iconography.
3. **Light mode.** Deferred (F23). The grammar is authored on `currentColor` so it stays an additive token swap; confirm it is not wanted for MVP.
4. **Serif as the cuttable font layer.** If the font budget bites, Source Serif 4 drops to a single weight or is cut; body (Inter) and mono (JetBrains Mono) are non-negotiable. Confirm acceptable.
