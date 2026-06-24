# Harness Lab — Product Requirements Document

> Product spec for the interactive web edition of the *Build Your Own Claude Code Harness* course, delivered on GitHub Pages. Produced from the [brainstorm session](00-brainstorm-session.md); the personas and acceptance criteria live in [the stories doc](02-user-stories-acceptance.md).

**Status:** Draft for review · **Date:** 2026-06-23 · **Owner decisions:** hybrid content, run-real-code-in-browser, static GitHub Pages, spec-only this round.

---

## 1. Concept

**Harness Lab** is a two-pane "read on the left, run on the right" interactive course that teaches developers to extend Claude Code by having them edit the real harness modules in the browser and pass each lesson's actual checkpoint.

The reading column is generated single-source from the existing `course/` and `docs/` markdown. The right pane is a bespoke runner that executes the learner's edited `.mjs` *unmodified* in a node-shim Web Worker (real `node:fs`/`path`/`url` over a virtual `~/.claude`, with `fetch` and `child_process` mocked at the boundary), asserts the README's literal ✅ artifact (the growing JSONL, the matching fixture, the exit code), and routes failures to that lesson's documented misconception. One reusable event→router simulator is the conceptual spine, re-encountered and deepened from Part 0 through Part 3. Everything is fully static on GitHub Pages: no backend, no secrets, progress in `localStorage`, and honest "your code ran" vs "this step is simulated" labels on every panel.

> **Tagline:** Edit the real harness. Watch it fire. Pass the checkpoint, all in your browser.

---

## 2. Problem and vision

The course is excellent and complete, but it lives as markdown that a learner reads and then, separately, tries to act on by copying commands into a local terminal. That gap (read here, do there, with a local Node and `claude` install required before the first win) is where motivation leaks out. A static site can close it: the same hook modules the course teaches are pure ESM over a tiny `node:` surface, so the learner's *real* edited module can run in the browser with no install and no key, producing the exact observable artifact the README already promises.

The vision is a course where you do not advance by reading, you advance by **producing the artifact the lesson demands**, the same definition of "done" the course itself teaches (verification gates, Principle 8). The site is its own worked example: a verification gate you pass to proceed.

---

## 3. Goals and non-goals

### Goals

- **First win in under 90 seconds.** A visitor runs a real hook and sees its log line before any setup or scroll.
- **In-browser ✅ predicts real ✅.** A passing checkpoint on the page reflects what would happen on real Node, proven by dual-environment CI.
- **Completion measured by artifacts, not pages read.** Progress is the count of checkpoints cleared.
- **Reading is a right.** Every lesson is fully readable and operable with zero JS and zero WASM.
- **Honest about what runs.** Real execution where the code is browser-loadable; clearly labeled simulation everywhere else.
- **Single-source content.** Prose is never re-typed into components; it is parsed from the existing markdown.

### Non-goals (this round)

- No backend, accounts, or server-side persistence (the host is static, and by choice).
- No Python runtime (Pyodide); there is no Python anywhere in the subject matter.
- No real LLM calls by default and no real local-machine verification (a static site cannot check a local install; pretending to would betray the course's own subject).
- Not building the site this round. This document plus the stories is the deliverable.

---

## 4. Personas (summary)

Full personas and their stories are in [02-user-stories-acceptance.md](02-user-stories-acceptance.md). In brief:

| Persona | One-line need |
| --- | --- |
| **Priya, the Curious Skimmer** | A real, tangible win in 90 seconds or she leaves |
| **Marcus, the Committed Builder** | Produce every checkpoint for real, resume across sessions, trust the green ✅ |
| **Dana, the Returning Reference User** | Deep-link and search straight to the exact answer, share an exact state |
| **Sam, the Accessibility-Dependent Learner** | Read and operate everything by keyboard and screen reader, never walled out |
| **Theo, the Mobile / Constrained-Network Learner** | Read the whole course fast on a phone; the runtime never costs him bandwidth until he uses it |

---

## 5. Experience pillars

1. **Run the real module, shim only the edges.** Around 80% of lessons execute the learner's actual edited `.mjs` unmodified. Only the two true edges are faked: the LLM (`fetch`) and subprocesses (`child_process`). Where code genuinely cannot run client-side, the UI says "simulated" in plain text. A course about verification never fakes its own verification.
2. **Reproduce the literal checkpoint, never a proxy quiz.** The in-browser pass/fail asserts the README's own artifact against the repo's own fixtures, so passing on the page predicts passing for real. Assertions are on the artifact, not string-equality against `solution/`, so style varies freely. A failed assertion routes to the lesson's documented wrong answer, not a generic red X.
3. **One conceptual model, re-encountered.** The event→router is the spine. A single reusable simulator renders the real `settings.template.json` matcher table; Part 0.2 shows it read-only, 1.2 lets the learner wire a row and watch their hook fire, 2.2 overlays the Memento pair on the same timeline, Part 3 adds matcher narrowing. Each of the six lifecycle events owns one permanent color used everywhere, so the UI itself teaches the model.
4. **Reading is a right; interactivity is an enhancement.** All lessons render as semantic HTML, fully readable with zero JS. The runtime and editor lazy-load only on intent. If the runtime cannot boot, the panel degrades to the lesson's copy-pasteable command and its expected output. Gating applies to the doing, never the reading.
5. **Fade the scaffold, gate on mastery, persist locally.** Each code task has three fidelity tiers over the same checkpoint: worked example, completion problem (the repo's real `start/` with TODO blanks, the default), and blank slate. The next lesson's editor unlocks when the current checkpoint passes (soft gate with an override). Progress, buffers, and attempt history persist in `localStorage` with JSON export/import.

---

## 6. Feature set

22 features were identified, prioritized (MoSCoW), and red-teamed against the static host. **Build cost is the red-team-adjusted figure** (the brainstorm under-scoped the runtime substrate). Feasibility: `yes` = runs for real client-side; `partial` = real with a caveat; `sim` = honest simulation by necessity.

| ID | Feature | MoSCoW | Learning | Cost | Feasible | MVP |
| --- | --- | --- | --- | --- | --- | --- |
| **F1** | Astro static site + markdown content pipeline | must | high | M | yes | ✅ |
| **F2** | Node-shim Web Worker runtime (virtual FS substrate) | must | high | **XL** | yes | ✅ |
| **F3** | Checkpoint runner: artifact assertion + solution diff | must | high | L | yes | ✅ |
| **F4** | Event→router simulator (the signature interactive) | must | high | L | yes | ✅ |
| **F5** | Mocked LLM provider at the `fetch` boundary | must | high | M | partial | ✅ |
| **F6** | `child_process` mock seam for shell-out modules | must | med | M | sim | defer |
| **F7** | Scaffolding-and-fading editor (three fidelity tiers) | must | high | M | yes | ✅ |
| **F8** | Course navigator + `localStorage` progress + soft gate | must | med | M | yes | ✅ |
| **F9** | MCP JSON-RPC debugger (real loop, browser-side) | should | high | **L** | partial | defer |
| **F10** | GitHub Actions deploy + Pages base-path hardening | must | low | **M** | yes | ✅ |
| **F11** | Design system: dark-first tokens, per-event color | must | med | M | yes | ✅ |
| **F12** | Two-pane lesson workspace (Read \| Run) | must | high | L | yes | ✅ |
| **F13** | Accessible terminal/console (ARIA log, not canvas) | must | med | M | yes | ✅ |
| **F14** | Active-retrieval gateway (replaces collapsible recall) | should | high | S | yes | defer |
| **F15** | Misconception-routed feedback + race visualizer | should | high | M | yes | defer |
| **F16** | Three-tier onboarding funnel anchored to Lesson 1.1 | should | med | M | yes | ✅ |
| **F17** | Performance budget enforced in CI | should | low | M | yes | defer¹ |
| **F18** | Token-cost ladder calculator | could | med | S | yes | cut |
| **F19** | Idempotent install simulator (Part 6) | could | med | M | sim | cut |
| **F20** | Capstone tools: depersonalization check + design rubric | could | high | M | partial | cut |
| **F21** | Spaced-retrieval review deck | won't | med | M | yes | cut |
| **F22** | Shareable permalinks + Pagefind search | could | low | S | yes | cut |

¹ F17's *lazy-loading architecture* is in the MVP; only the CI budget *gates* are deferred until there is a post-deploy baseline to assert against.

Feature descriptions and the full feasibility verdict for each ID are in [Appendix A](#appendix-a-feature-detail-and-feasibility-verdicts).

---

## 7. Architecture

The whole design resolves the central tension (run *real* code on a *fully static, no-COOP/COEP* host) by exploiting a verified property of this codebase: the runnable code is pure ESM over a narrow `node:fs`/`path`/`url` surface with exactly one `fetch` site and four `child_process` modules. That makes a thin node-shim worker, not a heavyweight VM, the honest and lightweight way to run the learner's actual module.

### 7.1 Site generator: Astro (`output: 'static'`)

Astro with `@astrojs/mdx` and Content Collections, chosen decisively over the alternatives:

- **vs Next static-export:** drags an SSR mental model onto a host with no server.
- **vs VitePress / Docusaurus:** doc-centric; they fight per-block stateful framework islands.
- **vs a raw Vite SPA:** loses zero-JS prose and real per-lesson URLs.

Astro is the only mainstream SSG where roughly 90% of each page ships as zero-JS HTML, which is exactly right for the reading floor and the bandwidth budget, while specific widgets hydrate as islands. That islands seam maps precisely onto the pinned hybrid model. The output is an MPA: one static HTML file per lesson, real per-lesson URLs, indexable, no SPA focus-loss hack, with `404.html` reserved as a genuine deep-link fallback.

### 7.2 Execution: a single node-shim Web Worker

One module Web Worker is the substrate for nearly every interactive (F2 powers F3, F4, F5, F9, F15). The learner's real `.mjs` imports unmodified; the `node:` builtins are provided by an in-memory virtual filesystem.

**Verified surface (checked against `reference/hooks/unified/`):**

- `node:fs` (13 files), `node:path` (12), `node:url` (9), and `process.env` including `HOME` (32 references). **`node:os` is not imported anywhere**, so the home directory resolves via `process.env.HOME`.
- The VFS must implement `readFileSync` (including `readFileSync(0)` for stdin), `writeFileSync`, `appendFileSync`, `existsSync`, `mkdirSync` (recursive), `renameSync`, `readdirSync`, `statSync`, `unlinkSync`, with faithful `ENOENT`-shaped errors and atomic-rename semantics.
- `stdin` is pre-seeded as a string before `main()` runs, so `readFileSync(0)` returns synchronously. **No `SharedArrayBuffer` and no COOP/COEP headers are needed**, which is what keeps us off the rocks that sink WebContainers on Pages.

**Two mock seams only:** `fetch` (the lone LLM boundary, `llm-call.mjs`, F5) and `node:child_process` (four shell-out modules, F6). A build-time scanner greps `solution/` and `reference/` for `node:` imports and `execSync`, and **fails CI** if any specifier is outside the supported shim set, so the surface can never silently drift.

**Decision, explicit:** node-shim worker, **not** WebContainers (needs COOP/COEP the host cannot set, plus commercial licensing) and **not** QuickJS-WASM as primary (adds ~500KB and a transpile step for code that is already browser-loadable ESM). The MCP server's six TypeScript files have zero runtime deps and are `esbuild`-compiled to ESM at build time, then run for real (F9). `bash install.sh` (Part 6), the long-lived MCP process beyond its loop, and the "live wiring" checkpoint half are deterministic **simulators, labeled as such**. The worker runs fresh-per-run for clean state (matching the short-lived-hook reality) with a 3s abort guard so an infinite loop cannot hang the tab.

### 7.3 Content composition (the hybrid model)

`course/**/README.md` and `docs/*.md` are ingested verbatim by Astro Content Collections. A build-time loader (a remark/rehype plugin) parses the consistent lesson anatomy (Objectives / Time / Before you start / The lesson / Checkpoint / Recap) into named slots and rewrites relative cross-links into in-site routes. **Prose is never re-typed into JSX**; bespoke islands inject only at authored anchor points. A per-lesson `lesson.json` manifest declares the runner type, the fixture, and the assert list, so the build auto-selects the right wrapper.

The hybrid model's central risk is drift between the generated prose (source of truth) and the hand-authored runner's checks. **Mitigation, enforced by tooling:** the runner's fixtures and assertions are derived from the repo's own `fixtures/` + `start/` + `solution/` at build time, CI fails on mismatch, and the source markdown is vendored via a git submodule so single-source is a tooling guarantee, not a discipline.

### 7.4 State persistence

`localStorage` only, keyed by lesson id under a namespaced, versioned key (e.g. `hl:v1:<lessonId>`) so a future format change can migrate rather than lose buffers. Stored: per-lesson state (not-started / attempted / passed), editor buffers, and retrieval-attempt history with optional confidence tags. Completion is defined by producing the artifact, never a "mark done" button. Export/import as a JSON blob covers the no-account, cross-device reality. Larger buffers may overflow to IndexedDB. No telemetry by default.

### 7.5 Deploy pipeline

A new `.github/workflows/deploy.yml`, kept separate from the existing `ci.yml` so a lint failure does not block a docs deploy. Pages source = **GitHub Actions** (not Jekyll, which strips Astro's underscored `_astro/` and cannot bundle the worker). Steps: checkout (with submodule) → `setup-node` 20 → `npm ci` → `astro build` → `upload-pages-artifact` (adds `.nojekyll`) → `deploy-pages`.

`astro.config` sets `site` and `base: '/build-a-claude-harness/'`; every internal link, asset, `fetch`, and especially the worker URL uses `import.meta.env.BASE_URL` / `new URL('./harness.worker.js', import.meta.url)`. **CI gates:** a no-root-absolute-paths check on built HTML, the `node:`-import scanner, and a post-build headless smoke test that fetches the hashed worker chunk *at the deployed base path* and boots it. Build is comfortably under the 10-minute cap (no media, ~412KB markdown), and the site is megabytes against the 1GB / 100GB envelopes.

---

## 8. Information architecture / site map

Top level, MPA, base `/build-a-claude-harness/`:

- **`/`: Landing.** Above the fold: the Lesson 1.1 hello-hook runner (edit, run, see the log line) before any setup. Below: the router mini-map (six colored event nodes wired to `unified-hook.mjs`, hover highlights which lessons touch each event) doubling as navigation; three entry affordances mapping to the onboarding tiers; "Resume where you left off."
- **`/course/`: The spine.** Persistent left-rail navigator: 9 parts → 27 lessons + transfer task, each showing not-started / attempted / passed by glyph **and** text. Soft mastery gate on the doing.
- **`/course/<part>/<lesson>/`: Two-pane workspace.** Left: generated prose (lede, Objectives, attempt-then-unlock recall, principle/why/reference/build, ✅ success card, Recap + next, prev/next anchors). Right: the lesson's runner per its manifest (router-sim | worker-checkpoint editor | MCP debugger | race visualizer | cost-ladder | install simulator | no-interaction).
- **Part reframe:** Part 0 (setup) becomes optional scenery with a browser-capability probe replacing the local Node/`claude` check. Parts 1-3 are the live-execution heart. Part 4 ships the MCP debugger. Parts 6-8 lean on labeled simulators plus the capstone tools.
- **`/docs/`: The reference pages,** rendered with the same prose system; glossary terms power inline hovercards course-wide.
- **Cross-cutting:** ⌘K command palette, Pagefind search, theme toggle (dark default / light / system), in-page reduce-motion toggle, export/import progress, `404.html` fallback, skip-to-content on every page.

---

## 9. Non-functional requirements

- **Performance (reading route):** ≤100KB JS gzipped, LCP <1.5s on a 4x-throttled mid-tier mobile profile, CLS <0.05, INP <200ms. The runtime, editor language modes, and fixtures are off the reading-route budget, lazy-loaded on intent as one shared hashed chunk. Self-hosted subsetted font, content-hashed filenames (the only durable cache lever on Pages).
- **Accessibility:** WCAG 2.2 AA. Zero-JS reading floor. Keyboard-operable everything, no focus traps (SC 2.1.2), real buttons, `role=log aria-live=polite` console (no canvas terminal), `role=status` outcomes using the README's verbatim pass/fail string, glyph + text for every cue (never color alone), forced-colors support, `prefers-reduced-motion` fork for every animation derived from the same data model.
- **Static-host integrity:** no server, no runtime secrets, no `SharedArrayBuffer`. Every URL base-path-correct; verified in CI, not assumed.
- **Honesty:** every panel labels "ran for real" vs "simulated"; a simulated step names the exact faked command and, where useful, lets the learner edit the canned output so they still exercise the real branching logic.
- **Fidelity:** every runnable checkpoint passes identically in the worker and on real Node in CI (dual-environment test). Zero unlabeled simulations.

---

## 10. MVP

**The bet: depth-of-honesty on the first four parts beats shallow interactivity across all nine.**

The MVP is a complete, beautiful, fully accessible read-on-the-left / run-on-the-right course where **Parts 0-3 (the live-execution heart, 17 of 27 lessons) actually execute the learner's real edited `.mjs`** and assert the README's literal checkpoint, with the event-router simulator as the recurring spine. The reading floor ships for **all 27 lessons** immediately (the markdown is the guaranteed deliverable); the bespoke runners for Parts 4-8 (MCP debugger, install simulator, depersonalization tool) are a fast-follow.

**MVP feature set:** F1, F2, F3, F4, F5, F7, F8, F10, F11, F12, F13, F16.

**The single biggest MVP risk is F2 being XL, not L** (it was re-scoped up by the red-team and it gates everything interactive). It is therefore built and dual-environment-tested against real Node **first**, before any lesson UI.

---

## 11. Phased roadmap

### Phase 0 — Runtime spike (gate before anything else)
Build F2 against the verified surface (`fs`/`path`/`url`/`process.env`, no `os`); vendor `memfs` rather than hand-rolling; seed `process.env` and a writable `~/.claude` per run; stand up the dual-environment CI test (every runnable checkpoint passes identically in the worker and on real Node) **as the gating acceptance test**. Stand up F1 (Astro pipeline) and F10 (deploy + base-path smoke test) in parallel so the base-path worker fight is fought early, on an empty site, not on deploy day.

### Phase 1 — Vertical slice (one lesson, end to end)
F11 design tokens + F12 two-pane workspace + F13 accessible console + F7 editor + F3 checkpoint runner, wired for **Lesson 1.1 only**, deployed live. Authors the missing `1.x` fixtures by running `solution/` on real Node in CI. Exit criterion: 1.1 reads at zero JS, runs for real, and passes its checkpoint on the live Pages URL.

### Phase 2 — The live-execution heart (Parts 0-3) + onboarding
Roll the slice across all 17 Parts 0-3 lessons; F4 router simulator (progressively unlocked 0.2 → 1.2 → 2.2 → 3.x); F5 mocked LLM (no-key + mocked modes only); F8 navigator + progress + soft gate; F16 landing funnel anchored on the 1.1 runner. **This is the MVP launch.**

### Phase 3 — Fast-follow depth
F6 `child_process` seam + F9 MCP debugger (Part 4); F15 misconception routing + race visualizer; F14 active-retrieval gateway; F17 CI performance gates (now that a baseline exists).

### Phase 4 — Capstone + reference polish
F19 install simulator (Part 6); F20 depersonalization tool + design rubric (Part 8); F18 cost-ladder calculator; F22 Pagefind search + shareable permalinks. F21 (spaced-retrieval deck) stays cut unless return-visit data justifies it.

---

## 12. Open decisions (owner input wanted)

These were raised by the panel and are genuine product or deployment forks, not implementation details:

1. **Custom domain vs base path.** The whole link-resolution strategy assumes `base: '/build-a-claude-harness/'`. A custom domain (CNAME) drops the base path and changes every URL decision. Default assumption: **no custom domain** (use the repo base path). Confirm if a domain is planned.
2. **Part 4 TypeScript: in-browser transpile vs precompiled.** Either compile the MCP `.ts` to ESM at build time (smaller, faster, but the learner edits pre-compiled code) or ship `esbuild-wasm`/`sucrase` (~1MB on that lesson only) so they truly run their edit. Recommendation: **precompiled for MVP**, in-browser transpile as a Phase 3 enhancement.
3. **"Bring your own LLM key" mode (F5c).** Tempting, but `api.openai.com` sends no browser CORS headers and forbids browser-side keys, so it fails for the default provider and puts a key into trusted JS. Recommendation: **ship no-key + mocked only**; keep BYO-key out unless restricted to explicitly CORS-enabled gateways with a plain-language warning.
4. **Optional privacy-respecting analytics.** Time-to-first-win and the checkpoint funnel are the north-star metrics, but they are only measurable with a client beacon (GoatCounter / Plausible). Default: **no telemetry**; metrics stay client-side and exportable. Flip only on an explicit decision.
5. **Free/OSS vs any future hosted tier.** The architecture is fully static and assumes free/OSS. A hosted tier (real LLM calls, accounts) would reopen choices deliberately closed here.

---

## 13. Top risks

| Risk | Mitigation |
| --- | --- |
| **F2 is XL and gates everything.** A wrong VFS surface or wrong `fs` error/atomic-rename semantics makes in-browser ✅ diverge from real ✅, destroying the core premise. | Build F2 first against the verified surface; vendor `memfs`; dual-environment CI test as the gating acceptance criterion before any lesson UI. |
| **Base-path worker/asset resolution** (the #1 Pages deploy-day failure). One root-absolute path silently 404s the runtime in production while working locally. | Post-build headless smoke test that fetches and boots the hashed worker chunk at the deployed base path; no-root-absolute-paths grep as a hard CI failure. Fight it in Phase 0 on an empty site. |
| **Honesty-boundary erosion.** F6 (`child_process`) and F9 (MCP stdin) are more simulated than "80% real" implies; `quality-gates`/`impact-hint` branch on canned `git`/`tsc` stdout. Mislabeling teaches verification learners to trust a fake. | Labels name the exact faked command; let learners edit the canned output to exercise real branching; keep these out of MVP so the first impression is genuinely-real Parts 0-3. |
| **Fixture coverage gaps.** Lessons 1.1/1.2/1.3 and 4.1 have `start/`+`solution/` but no `fixtures/`, and 1.1 is the landing first-win. | Author the missing fixtures by running `solution/` on real Node in CI; make any runnable lesson lacking a fixture a hard build error. |
| **BYO-LLM-key over-promise** (see Open Decision 3). | Ship no-key + mocked only for MVP. |

---

## 14. North-star metrics

1. **Time-to-first-win:** median seconds from landing to a passing 1.1 checkpoint. Target under 90s, measured client-side and exportable.
2. **Checkpoint-pass rate and attempts-to-pass per lesson** (from the `localStorage` event log), with a misconception-hit breakdown showing which documented failure modes fire most.
3. **Completion = artifacts produced:** count of the 27 + 1 checkpoints cleared per learner, and the part-by-part drop-off curve (especially across the Part 0→1 reframe and the Part 4 MCP step).
4. **In-browser ✅ predicts real ✅:** 100% of runnable-lesson checkpoints pass identically in the worker and on real Node in CI, with zero unlabeled simulations.
5. **Reading-floor integrity:** every lesson fully readable and keyboard/screen-reader operable with zero JS/WASM, and the reading-route budget green in CI on every deploy.

---

## Appendix A — Feature detail and feasibility verdicts

Each feature with its description, the red-team's static-host verdict, the adjusted cost, and the key mitigation.

### MVP features

- **F1: Astro static site + markdown pipeline (M, yes).** Content Collections over the 27 READMEs; a slot parser for the consistent anatomy; relative-link rewriting; islands injected at anchors. *Mitigation:* build the anatomy parser as a remark/rehype plugin with a CI assertion that every lesson yields all 6 named slots, so a drifting README cannot silently drop content.
- **F2: Node-shim Web Worker runtime (XL, yes).** The substrate. Re-scoped L→XL: a correct `memfs` with atomic-rename semantics, `process.env`/`HOME` seeding, a 3s abort guard, fresh-per-run isolation, and faithful `ENOENT` shapes is genuinely XL. *Mitigation:* vendor `memfs`; pin the surface with the `node:`-import scanner; dual-test against real Node in CI.
- **F3: Checkpoint runner (L, yes).** Asserts the README's artifact against the repo's `fixtures/`; assertion-based, not string-equality; "Compare to solution" diff reveals after an attempt. *Gap:* several lessons lack `fixtures/`; author them in this feature and make a missing fixture a build error.
- **F4: Event→router simulator (L, yes).** Drives off the real `settings.template.json` parsed at build time; runs the real `unified-hook.mjs` with the chosen event as `argv[2]` and payload on stdin; visualizes the matched row, branch, lazy imports, VFS diff, stdout, with step/slow-mo. Progressively unlocked across Parts 0-3.
- **F5: Mocked LLM at the `fetch` boundary (M, partial).** `callLlm()` already returns null on failure. Modes: "no key" (real fail-silent path), "mocked" (deterministic Responses/Chat JSON). *Caveat:* the "BYO key" sub-mode fails CORS for OpenAI and leaks the key; ship only no-key + mocked for MVP (Open Decision 3).
- **F7: Scaffolding-and-fading editor (M, yes).** CodeMirror 6 (≈10x smaller than Monaco, no base-path worker-from-blob gotcha). Three tiers over the same checkpoint; TODO slots auto-placed from the existing `____`/`TODO` markers in `start/`. Keyboard-trap-free (SC 2.1.2).
- **F8: Navigator + `localStorage` progress + soft gate (M, yes).** Glyph+text state, artifact-defined completion, soft gate with per-lesson override, ⌘K palette, export/import. *Mitigation:* namespace and version the storage schema.
- **F10: Deploy + Pages hardening (M, yes).** Re-scoped S→M: getting the worker chunk to resolve under a subpath with Astro+Vite is a known multi-iteration fight. *Mitigation:* post-build headless smoke test that boots the worker at the deployed base path, gating deploy.
- **F11: Design system, per-event color (M, yes).** CSS custom-property tokens; one accent; one permanent hue per lifecycle event used across chips/router/timeline/Memento so the UI teaches the model; dark + a real light theme, 4.5:1 in both, contrast checked in CI.
- **F12: Two-pane workspace (L, yes).** Resizable Read | Run, collapsing to tabs on narrow viewports; first-class prose (lede, checkable Objectives, recall accordion, GitHub-alert callouts, Shiki code with filename tab + copy, anchored headings, ✅ success card). Anchored section handoff for MVP; smooth scroll-spy only if it stays jank-free.
- **F13: Accessible console (M, yes).** `role=log aria-live=polite` (not canvas); debounced batched appends so a chatty hook does not flood the screen reader; `role=status` outcome using the README's verbatim string; real Run/Reset/Copy buttons; forced-colors support.
- **F16: Onboarding funnel (M, yes).** 1.1 runner above the fold; Part 0 reframed as optional scenery with a browser-capability probe that explicitly states it cannot check the local machine; three tiers, each with one graduation event.

### Deferred / cut

- **F6: `child_process` seam (M, sim) [defer].** Needed only for Part 3.4; the seam's `node:`-import scanner ships in MVP, the mock itself follows. Let learners edit the canned subprocess output so they still exercise real branching.
- **F9: MCP JSON-RPC debugger (L, partial) [defer].** Re-scoped M→L: the server reads stdin via `process.stdin.on('data'/'end')` event streaming with Content-Length framing, **not** `readFileSync(0)`, so it needs an EventEmitter stdin shim and an async event pump, not a synchronous trace. Verified upside: zero runtime deps, so `esbuild`→ESM→worker is genuinely real (the strongest run-real-code story in the set).
- **F14: Active-retrieval gateway (S, yes) [defer].** UI swap; answers already in the READMEs. Gate on "attempted" (non-empty), not auto-graded correctness.
- **F15: Misconception routing + race visualizer (M, yes) [defer].** Encode each documented failure mode as data co-located with the lesson manifest; drive the animated and static-diff forks from one shared run record.
- **F17: CI performance budget (M, yes) [defer the gates].** Lazy-loading architecture is in MVP; the `size-limit`/Lighthouse-CI gates land once there is a baseline.
- **F18: Cost-ladder calculator (S, yes) [cut].** Pure JS; source thresholds from the real `config.json`.
- **F19: Install simulator (M, sim) [cut].** `bash` cannot run client-side; hand-authored model of the install logic over the VFS, run 3x to prove convergence, labeled simulated. Derive its expected end-state from running the real `install.sh` in CI.
- **F20: Capstone tools (M, partial) [cut].** Port the depersonalization checker to browser-safe JS only if it is pure string/path scanning; the design-rubric form is trivial.
- **F21: Spaced-retrieval deck (M, yes) [cut, was "won't"].** Low ROI on a self-paced static course; revisit only if seeded free from F14 history.
- **F22: Permalinks + Pagefind search (S, yes) [cut].** Both fully static; the only gotcha is base-path-correct index fetch, same class as the worker check.
