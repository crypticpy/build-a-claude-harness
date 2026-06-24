# Harness Atlas — Design Workshop

**Companion to** `01-prd.md` (the product spec). This document records a world-class design workshop convened on the locked Harness Atlas concept: theme, look and feel, technology, component implementation, and the dialed-in signature visualizations. The design language it produced is specified in `04-design-system.md`; the five visualizations are specified in `05-visualization-blueprints.md`.

**Method.** Seven design lenses were briefed in parallel against the committed spec, a synthesis pass reconciled them into one design language with a recommended theme, each of the five signature visualizations got a full implementation spec that was then adversarially "dialed in to world-class," and an implementation red-team pressure-tested everything against the Pages, performance, and accessibility budgets.

**Read section 4 first if you read nothing else.** The red-team raised a "ship-blocking" provenance alarm that turned out to be an artifact of the agents inspecting the wrong repository. The verified ground truth, and what it means for the design, is recorded there so nobody acts on the false alarm later.

---

## 1. The brief

The product is locked (see `01-prd.md`): a guided museum tour of an architecture, no sandbox, taught through misconception-first explainers, manipulable diagrams, and narrated data-flow walkthroughs, on a fully-static Astro/Preact GitHub Pages site under hard performance and WCAG 2.2 AA budgets. The design brief set the ambition: the experience should feel like opening a beautiful machine and watching one request travel its wires, confident and instrumented, with every claim physically anchored to a real artifact at a pinned commit.

**Brand territories explored:** instrumented (debugger-grade), cartographic (atlas, regions, legends), honest / no-spin, schematic / blueprint, luminous-on-dark, calm / unhurried, tactile / manipulable, editorial / explorable-explanation, precise / typographic, museum-curated, mechanistic / clockwork, archival / pinned, quietly cinematic, developer-native.

**Craft touchstones:** Distill.pub (the figure is the argument), NYT / The Pudding scrollytelling (one argument on a persistent graphic), Bartosz Ciechanowski's interactive essays (drive exactly one control, watch the consequence), Chrome DevTools and debugger timelines (scrub a request, inspect the real payload), Stripe / Linear (calm developer-native typography, evidence-grade code blocks), the D3 gallery (layout-math discipline via submodules, not the runtime), Excalidraw (approachable schematic warmth), GitHub permalink-at-SHA (the trust pattern), museum wall-label systems (what / why-here / how-it-connects pacing), atlas UIs with a persistent base layer, and Duolingo's commit-a-prediction loop (the restraint, explicitly not the gamification).

---

## 2. The panel

Seven lenses, each with one stakeable signature move.

1. **Art Director & Visual Identity.** "Two-altitude single world, not two skins": Phase 1 and Phase 2 share one palette, one type system, one diagram grammar; the only things that change are lamp brightness (`--surface` lightness), grid opacity, and where the amber glow lives.
2. **Design Systems Architecture.** Encode the Phase-1 / Phase-2 tonal shift as data, not a fork: phase is one attribute on `<body>` and no component is phase-aware in its own code.
3. **Creative Technologist / Data-Viz Lead.** "Light is a state variable, not a style": every node and edge has exactly three luminance states bound to the trace step index (dormant schematic, active full-ink, settled), so the grammar reads identically everywhere.
4. **Interaction & Motion Design.** "The token is the atom of the entire motion system": one ~12px glowing capsule, colored by the edge it rides, is the only thing that travels in every visualization. Learn it once, read every figure.
5. **Inclusive Design / Accessibility-as-Craft.** "The twin is a first-class panel, not a `<table>` dumped raw": every visualization's data-table or tree twin uses the same design tokens and the same typed-edge legend as the SVG, desirable enough that power users tap "DATA" on purpose.
6. **Front-End Architecture / Implementation.** "One typed model, three renders, one author pass": every viz is a `DiagramModel` TypeScript object that a build-time component emits as static SVG plus a table/tree twin plus an ordered step list.
7. **Creative Director / Signature Experience.** "The living-wire cold open": the landing hero auto-plays one token along the lifecycle wire before any prose, degrading to a static lit wire with the rows already drawn. First contact is the mental model itself, not a headline about it.

---

## 3. The recommended theme, and the conflicts resolved

The synthesis chose **Single-Surface Instrument (Slate, dark-led)** over a two-altitude paper-to-slate alternative. The full theme, palette, and tokens are in `04-design-system.md`; the decision rationale is that one dark surface with a "lamp-brightness lever" (raise surface lightness and grid opacity in Phase 1, lower both in Phase 2) buys the cinematic descent as a continuous dimming rather than a theme switch, which is cheaper than two CI-certified palettes for an MVP where light mode is explicitly deferred, reads as one rising arc, and keeps the grammar authored on `currentColor` so a future light mode is an additive token swap, not a fork.

Nine design conflicts were reconciled. The load-bearing ones:

- **Dark cinematic drama vs forced-colors / WCAG legibility:** resolved as the same act, not a trade. Build the entire grammar on `currentColor` plus shape plus dash from day one, so forced-colors is a designed second skin (node type survives via shape, edge type via dash and glyph, focus via system Highlight), not a degradation. Hue is decorative reinforcement; meaning never lives in color alone.
- **Two skins vs one surface:** one dark surface with the lamp-brightness lever (above).
- **Ambitious token-along-path motion vs the 35KB island / 60KB page / Lighthouse budgets:** pre-compute all `d3-shape` layout at build and ship zero `d3` at runtime (path-string JSON); animate `offsetDistance` only on the single active token; fake the wire-glow with a pre-baked SVG gradient stroke (never `filter: blur` on scroll); cap lit regions to one at a time. `d3-*` imports are lint-banned inside any `client:`-directive file.
- **Is the data-table twin a fallback or a first-class experience:** first-class by construction. It shares the diagram frame's grid, type, and border tokens, gets a mono "instrument-readout" skin, and is generated from the same typed model so it can never paraphrase. The skip-to-data-table link is a confident peer toggle ("SVG / DATA"), never an accessibility apology.
- **Where the honesty caveats live:** in the machine mono voice, inside the diagonal-hatch teaching band, at verdict type-size, so provenance reads as a measured fact the instrument reports, not an authorial aside the eye skips. CI can assert the verbatim string.
- **Bespoke set-pieces vs one systematized engine:** held the cut. The frozen grammar kit covers only the node-graph/flow family (SV-1, SV-3). SV-2, SV-4, and SV-5 inherit the shared vocabulary but author their visual layer bespoke. Continuity is a design system, not a runtime.

**Five signature moments** the design turns on: the living-wire cold open (SV-1), the deny-by-default detonation (SV-4), honesty as a visible material (the trust grammar), the Phase-2 descent onto the persistent map, disk accretion in the SV-3 trace, and the terminal exit that hands over a real command instead of a certificate.

---

## 4. Critical correction: the provenance alarm was a wrong-repo artifact

The implementation red-team and two of the visualization critiques (SV-1, SV-4) reported a "ship-blocking integrity failure": that commit `5633273` does not resolve, that `evaluate-policy.mjs` and the five named-harm rule ids do not exist, that PreToolUse is in fact subscribed, and that the routing table is heavily many-to-one. They reported working against "HEAD `89986e5`."

**That is the wrong repository.** `89986e5` is the HEAD of the user's personal harness (`/Users/crypticpy/Projects/claude-harness`), which was the inherited working directory for the workshop agents. The Harness Atlas site pins to the **teaching** repo (`build-a-claude-harness`), a deliberately different and simpler codebase. Verified directly against the teaching repo:

| Claim from the alarm | Reality in the teaching repo (the one the site pins to) |
|----------------------|----------------------------------------------------------|
| `5633273` does not resolve | It resolves: it is a commit in `build-a-claude-harness`. |
| `evaluate-policy.mjs` / the five rule ids do not exist | They exist in `course/07-level-up/7.2-cf-approve/{start,solution}/evaluate-policy.mjs` and the 7.2 README. The CI grep against that file is valid. |
| PreToolUse is subscribed | It is **not** wired in `settings.template.json`. The SV-1 "PreToolUse drawn dashed-hollow, unsubscribed platform event" device is **true** and is kept. |
| The table is heavily many-to-one | The teaching repo wires five events, mostly one-hook. The one genuine fan-out is **PostToolUse** (two matchers: `Write\|Edit` and `*`). |
| PermissionRequest is the real approval surface | PermissionRequest is **not** wired in the teaching repo. The gate is a **course-taught pattern** (module 7.2), exactly as the PRD already frames it. |

**What this means for the design.** The original PRD facts hold, and the safe-autonomy framing (course-taught pattern, deterministic regex stand-in for a real LLM gate, friction-not-security caveat verbatim) was already correct. We do **not** repoint to `89986e5`, we do **not** add PermissionRequest to SV-1, and we keep the unsubscribed-PreToolUse device. The earlier feasibility red-team in `00-brainstorm-session.md` verified the teaching repo carefully and was right; this workshop's red-team simply ran in the wrong directory.

**What we keep from the alarm anyway.** Two things, because they are good independent of the repo confusion:

1. **The provenance-first build gate.** Thread one `--pin-sha` token everywhere; a CI link-checker resolves every permalink and fails on a 404; `scripts/extract-excerpts.mjs` regenerates every Shiki excerpt from the live file so excerpts cannot drift; model generators read the actual `settings.template.json`, the modules, and the 7.2 fixture, with CI failing on drift. This was always the intent; the workshop just made it a hard gate. The only correction is that the pin SHA is the teaching repo's, and it resolves.
2. **The "stacked rows are a fact" elevation for SV-1.** Even in the simpler teaching repo, PostToolUse genuinely fans out across two matchers. So the drawer shows a stack when the file has a stack, and the token-split fan-out motion fires on PostToolUse. This is the truer, more memorable lesson, and it is honest for the teaching repo.

> **Open item carried forward:** the canonical pin SHA must be a clean committed SHA. The teaching repo had uncommitted working-tree changes at workshop time, so freeze the pin against a committed SHA before any visualization cites it (this is open decision 2 in `01-prd.md`).

---

## 5. What the "dial it in" pass changed

Every visualization came out of its first spec competent but, in two or three places, generic. The adversarial critique pass elevated each one. The headline changes (full specs in `05-visualization-blueprints.md`):

- **SV-1 Lifecycle Timeline:** the real fan-out becomes the signature. A token splits at PostToolUse into N capsules riding N sub-wires into N module glyphs, the drawer shows the stacked rows in fire order, and "order is a fact" joins "absence is a fact" (the unsubscribed PreToolUse).
- **SV-3 Ecosystem Map:** make the loop visible at rest. Draw a closed racetrack at equal stroke weight so "it is a loop" reads in the first 200ms; tether each real payload to the node that produced it; let the disk cylinder be the only node that grows, becoming the tallest object by the end; reframe the scrubber as the loop's own filling arc and a program-counter.
- **SV-4 Safe-Autonomy Gate:** break the false symmetry. ALLOW has no lane (the token glides past a hairline and fades off-stage); all visual mass moves to DENY, where the matched rule's real "why" string rotates up into the diamond as the instrument's one spoken sentence. The detonation is re-skinned as a literal stolen night (three pings vs 247, "one every 1.9 minutes, all night").
- **SV-2 Subagent Fan-Out:** race both modes on one shared split-lane track under a constant-velocity wall-clock sweep line, drop a ghost tick at the one-pass finish so the sequential tax is a distance you watch blow past, and make the disjoint file-set lock the literal trigger that releases the parallel fan.
- **SV-5 Intelligence Stack:** render FREE as a positive material (a static sand "hum" hairline under each free tier) and BILLED as an amber meter-gutter on the one tier, so cost is a chrome you point at, not a number you read; separate the click from the scan so the append reads as free and the billing as a separate later actor.

---

## 6. Build order (from the red-team)

0. **Provenance and scaffold first (gate):** Astro + Preact + Motion One; the `--pin-sha` token (a clean committed SHA); `extract-excerpts.mjs`; the CI link-checker and the model generators that read the live files with drift-failure. No visualization is built until this gate is green.
1. **Design-system spine:** `BaseLayout` + tokens (the lamp-brightness lever; `currentColor` + shape + dash from day one); the focus-ring system including SVG focus-rects and forced-colors system-Highlight.
2. **Trust grammar primitives:** the `Fact` / `Caveat` typographic components and `EvidencePin` (build-time Shiki, zero client JS), plus the vellum / diagonal-hatch / dashed-hollow texture vocabulary.
3. **Twin-first data layer:** the one typed `DiagramModel` / `TraceScript` contract and the `TwinPanel` / `ViewToggle` rendering the server-side table/tree. Freeze this contract before any set-piece.
4. **Static grammar kit:** `DiagramFrame` + `FlowNode` + `TypedEdge` + the auto-generated `Legend` (build-time static SVG, scoped to SV-1 / SV-3). Verify the no-JS static frame teaches each thesis with zero motion.
5. **CSS-only HEVA shell** + progress rail + prediction-commit + the fail-silent localStorage store + the no-state footer readiness meter. Confirms the 0KB-reading-route floor holds before any island exists.
6. **TracePlayer island against SV-3 first** (the verified-real, fully-honest, lowest-risk visualization). Gate at 35KB gzipped in CI.
7. **SV-1** with the corrected fan-out model, then **SV-5** (free-as-material), both reusing the TracePlayer and the disk-accretion verb.
8. **Stateful-island visualizations last:** the ApprovalGate (SV-4) and the split-lane SV-2, the highest-choreography pieces, built after the grammar, twin, and motion engine are proven and budget-gated.
9. **Required review artifacts before ship:** Playwright forced-colors screenshots of SV-1/3/4, a manual NVDA + VoiceOver pass on roving-tabindex order, a per-island gzip budget report, and a full no-JS smoke test.

---

## 7. Provenance

- Workshop run: 7-lens panel + synthesis + a 5-item, 2-stage visualization pipeline + implementation red-team (20 agents).
- Reference harness pinned at `https://github.com/crypticpy/build-a-claude-harness`; the canonical pin SHA is a clean committed SHA in that repo (freeze per open decision 2 in `01-prd.md`).
- The red-team's wrong-repo provenance findings are corrected in section 4 and were verified directly against the teaching repo before authoring the design specs.
