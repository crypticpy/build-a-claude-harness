# Harness Lab — Brainstorm Session Record

> The working session that produced the [PRD](01-prd.md) and the [user stories](02-user-stories-acceptance.md). This is the reasoning trail, kept so a future reader can see which ideas were considered, which were cut, and why. It is not the spec; the PRD is.

**Date:** 2026-06-23
**Question on the table:** What is the best way to turn this teaching repo into a modern, beautiful, genuinely interactive web course on GitHub Pages, where learners run real code in the browser?

**Owner decisions taken into the room (fixed, not re-litigated):**

1. **Hybrid content.** Reading content is generated from the existing `course/**/README.md` and `docs/*.md`; the interactive modules, landing, and lesson runners are hand-authored web components on top. Prose stays single-source in markdown.
2. **Run real code in the browser.** Learners edit a hook or config, run it, and watch it fire. Everything is client-side because the host is static.
3. **GitHub Pages, fully static.** No backend, no runtime secrets, no database. Deploy via GitHub Actions. Respect the real Pages limits.

**Deliverable for this round:** the spec package only (concept, features, PRD, user stories, acceptance criteria, phased roadmap). No build yet.

---

## The panel

Six perspectives, briefed on the same content map and the three constraints, brainstormed in parallel, then a lead architect synthesized them and a skeptic red-teamed the result against the static host. The runtime architecture was independently fact-checked against the reference code before being written down (see [Verification note](#verification-note)).

| Lens | The one thing they were there to protect |
| --- | --- |
| E-Learning PhD / Instructional Designer | That the interactivity produces *learning*, not just motion |
| AI Engineer / In-Browser Execution Architect | That the learner's *real* module runs, not a re-implementation |
| GitHub Pages / Static Platform Engineer | That every feature is provably static and survives the base path |
| Product Designer / UX & Interaction | That it feels like a premium IDE, and the UI itself teaches the model |
| Accessibility & Performance Engineer | That reading is a right and the runtime is paid for only on intent |
| Curriculum & Product Strategist | That a lesson completes by producing its artifact, not by being read |

---

## What each expert brought

### E-Learning PhD / Instructional Designer

A single mastery spine: each lesson gates on its checkpoint, the worked example fades from "watch it run" to "fill two blanks" to "build it from a blank file," and the existing recall questions become active-retrieval widgets instead of click-to-reveal accordions. Signature positions:

- Every interactive element must let the learner DO the lesson's one idea or RETRIEVE a prior one. If a widget only illustrates, it is a diagram, and diagrams belong in the prose.
- Reproduce the repo's real checkpoint artifact, never a proxy quiz, so passing in-browser predicts passing for real.
- Fade the scaffold, do not fix it: difficulty adapts to the individual, not a global setting.
- Gate the doing, never the reading.
- Route feedback by misconception: match a failing assertion to the lesson's documented wrong answer.

**Top risk:** a fidelity gap between the in-browser runtime and real Node would let a checkpoint pass code that fails for real, which destroys the core promise.

### AI Engineer / In-Browser Execution Architect

The decisive technical insight of the session. Because the core hook modules are pure ESM over a narrow `node:` surface, we do not emulate Node, we *run the learner's actual module* in a Web Worker against a virtual `~/.claude` filesystem, mocking only the two true edges.

- Run the real module, shim the boundary. Never reimplement what we can run.
- Mock only at the two true edges: the LLM (`fetch`) and subprocesses (`child_process`).
- Verify by assertion on observable artifacts, never by string-matching the solution.
- Label execution honesty everywhere: "your code ran" vs "this step is simulated."
- One substrate powers every interactive: event simulator, checkpoint runner, MCP debugger, race visualizer.

**Top risk:** shim drift. If a future module pulls an unstubbed builtin, its checkpoint silently fails to run. The mitigation is a build-time scanner that fails CI on any unsupported `node:` import.

### GitHub Pages / Static Platform Engineer

Recommended Astro built and deployed through Actions (not Jekyll), single-source prose from markdown, interactivity as hydrated islands. The whole payload is tiny (roughly 412KB of markdown, no media), so all three Pages limits have enormous headroom.

- Static or it does not ship: zero server, zero secrets, zero DB.
- Base-path discipline is non-negotiable: every asset, link, and fetch resolves through `BASE_URL '/build-a-claude-harness/'`. The thing that works on localhost and 404s in production is always an un-prefixed path.
- Use the Actions deploy path, never Jekyll; `.nojekyll` must be present or hashed `_astro/` assets get stripped.
- MPA over SPA: one real URL per lesson; reserve `404.html` as a genuine fallback only.

**Top risk:** a browser JS engine is not Node. The virtual filesystem shim is the single biggest engineering risk and the thing most likely to drift from the real harness.

### Product Designer / UX & Interaction

A dark, code-editor-grade two-pane workspace: read on the left, run on the right. The visual language borrows the event-router's own vocabulary so the interface teaches the mental model.

- Read on the left, run on the right. Every lesson is a workspace, never a wall of text followed by a separate playground.
- One accent, one motion curve, one mono, one type scale. Premium comes from restraint.
- Each of the six lifecycle events owns one permanent color used everywhere, so the visual system literally teaches the event model.
- Reproduce the exact ✅ artifact the README promises, or be honest that it cannot run in-browser and hand over a copy-paste command. Never fake a green check.
- Fail-silent UX mirrors the course's own principle: a broken widget must never break the lesson.

**Top risk:** the runtime is the spine of "run real code." If it proves too heavy, the runner degrades to mocked output and the course loses its emotional payoff. Mitigation: build a thin shim for the narrow API these hooks actually use, and spike it first.

### Accessibility & Performance Engineer

Reading is a right; interactivity is an enhancement. All 27 lessons must be fully readable and operable with zero JS and zero WASM. The runtime lazy-loads only when a learner intends to use it.

- Pay for interactivity only on intent. The runtime never touches the initial route budget.
- Every sandbox is operable by keyboard and screen reader alone: real buttons, a `role=log` live region for streaming output, no canvas terminals, no keyboard traps.
- No information lives in motion alone. Every animation has a `prefers-reduced-motion` fork showing the same fact as a static labelled diff.
- Name the host's walls and design within them. GitHub Pages cannot set COOP/COEP, so no `SharedArrayBuffer`-dependent runtime.
- Budgets are enforced in CI, not aspirational.

**Top risk (and the room's pivotal constraint):** the COOP/COEP wall. Pages cannot set cross-origin-isolation headers, so any runtime needing `SharedArrayBuffer` (WebContainers, threaded WASM) is off the table.

### Curriculum & Product Strategist

A casual visitor edits a real `hello-hook.mjs` and sees the Lesson 1.1 log line within 90 seconds, no install and no API key. From there a single spine escalates from "try one event" to "build the whole router" to "assemble and depersonalize your own harness."

- Prose is generated and single-source; interactivity is hand-authored and layered. If a sentence lives in two places, the design has failed.
- A lesson is completed by producing its artifact, not by reading it. "Mark as done" buttons are banned.
- First win before first install. Part 0 setup is optional scenery, because a static host cannot verify a local Claude install and must not pretend to.
- Match the engine to the concept: a full runtime only for lessons that execute hooks; pure-data simulators for concepts like routing and the cost ladder.

**Top open question they raised:** is the course free/OSS or monetized? That answer originally gated the runtime choice (WebContainers has commercial terms). The architecture below resolves away from WebContainers, which makes the question moot for the runtime, though it still matters for any future hosted tier.

---

## The debates, and how they resolved

The panel did not agree out of the gate. Three of the six independently proposed different in-browser runtimes. Forcing that disagreement into the open is what produced the strongest decision in the spec.

### 1. The runtime: WebContainers vs QuickJS-WASM vs a node-shim Web Worker

This was the central technical fork, and the lenses split:

- **Curriculum/Product** wanted **WebContainers** for full Node fidelity, accepting a `coi-serviceworker` workaround to fake the COOP/COEP headers.
- **Platform** and **Accessibility** wanted **QuickJS-WASM**: single-threaded, no `SharedArrayBuffer`, so no cross-origin-isolation needed.
- **The AI Engineer** argued we need neither heavyweight option, because the runnable code is already browser-loadable ESM over a tiny `node:` surface.

**Resolution: the node-shim Web Worker wins.** WebContainers requires COOP/COEP that GitHub Pages cannot set, plus commercial licensing; both are disqualifying, and the service-worker workaround adds first-load fragility and breaks in embedded browsers. QuickJS-WASM avoids the header problem but adds roughly 500KB and a transpile step for no benefit, since the code is already loadable as an ES module. The learner's real `.mjs` imports unmodified into a plain module worker with an in-memory virtual filesystem; `stdin` is pre-seeded as a string so there is no need for `SharedArrayBuffer` or `Atomics`, and therefore no need for headers the host cannot send. This is lighter than QuickJS, carries no license, and runs the genuine module.

### 2. "Run real code" vs "fully static, no server" for bash, MCP, and LLM lessons

**Resolution: an explicit, labeled execution boundary.** Run real code where the code is browser-loadable ESM (the logic in Parts 0, 1, 2, 5, and the MCP JSON-RPC handler compiled from TypeScript at build time). Mock at exactly two true edges: `fetch` (the LLM) and `child_process` (shell-outs). Simulate, with a visible "this step is simulated" label, only the three things that genuinely cannot run client-side: `bash install.sh` (Part 6), the long-lived MCP process beyond its request/response loop, and the "live wiring" half of each checkpoint. All five technical lenses converged on honesty-as-architecture: a course about verification cannot fake its own verification, so the label is a hard rule, not a nicety.

### 3. Hard mastery gate vs soft, skippable progression

**Resolution: a soft gate on the doing, with an override, never on the reading.** The next lesson's editor unlocks when the current checkpoint passes, which preserves the testing-effect rigor the instructional designer wanted. An "I'm stuck / continue anyway" escape appears after N attempts so a runtime quirk never traps a correct learner, which answers the product and UX worry about mastery-gate dropout on a free, self-paced course. Prose and the worked example stay open always.

### 4. Beauty and richness vs accessibility and the performance budget

**Resolution: restraint as the design system, enhancement as the delivery model.** One accent, one motion curve, under 200ms, only on state change, behind `prefers-reduced-motion`. Every animation has a static labelled-diff fork derived from the same data model, so the two cannot disagree. CodeMirror 6 over Monaco (about 10x smaller). The runtime, editor, and fixtures sit off the initial reading-route budget, lazy-loaded on intent and enforced in CI. Reading works with zero JS as the guaranteed floor.

### 5. Convert every recall `<details>` to gated retrieval, or none

**Resolution: convert a curated subset.** The opening "No peeking" recall and the 🔁 cross-part callbacks become attempt-then-unlock gates; the other inline accordions stay as they are. Converting everything risks quiz fatigue; converting nothing wastes the testing effect the author already designed for. The answer text already exists verbatim in the READMEs, so this is a UI change, not new authoring.

### 6. The hybrid model's central risk: generated prose drifting from the hand-authored runner

**Resolution: derive the runner's fixtures and assertions from the repo's own `fixtures/`, `start/`, and `solution/` at build time, and fail CI on mismatch.** The source markdown is vendored via a git submodule so single-source is enforced by tooling, not discipline. This is the mechanism that lets prose stay single-source while the runner's green ✅ provably tracks the README's stated ✅.

---

## Verification note

The synthesis leaned on specific claims about the reference code. Because the runtime decision rests entirely on those claims, the numbers were checked directly against `reference/hooks/unified/` rather than trusted. The result is a small but instructive correction, and it is exactly the kind of "verify before you ship a claim" discipline the course itself teaches.

| Claim in the brainstorm | What the code actually shows |
| --- | --- |
| `node:fs` used "69x" | imported in **13** of 16 module files |
| `node:path` "63x" | imported in **12** files |
| `node:url` "42x" | imported in **9** files |
| `node:os` "15x" (and elsewhere "0x") | imported in **0** files; home dir comes from `process.env.HOME` (32 `process.env` references) |
| `child_process` "8x in 2 modules" | in **4** modules: `format-lint`, `impact-hint`, `quality-gates`, `session-start` |
| `fetch` is the only LLM edge | confirmed: **1** file, `llm-call.mjs` |

The architect's occurrence counts were inflated, and the red-team's correction was itself slightly off (it claimed `os.homedir` is used; it is not). The verified surface is marginally **simpler** than either described: `node:fs` + `node:path` + `node:url` + `process.env`, with two mock seams (`fetch`, `child_process`) and no `node:os`. The conclusion the numbers were meant to support, that a thin node-shim worker beats WebContainers and QuickJS, holds and is in fact strengthened. The lesson carried into the PRD: pin the exact shim surface with a build-time scanner so this can never drift, and dual-test every checkpoint against real Node in CI.

---

## Where the room landed

A product the architect named **Harness Lab**: a two-pane "read on the left, run on the right" course where learners edit the real harness modules in the browser and pass each lesson's actual checkpoint, fully static on GitHub Pages. The concept, the prioritized feature set, the architecture, the MVP cut, and the phased roadmap are in the [PRD](01-prd.md). The personas, user stories, and acceptance criteria are in [the stories doc](02-user-stories-acceptance.md).
