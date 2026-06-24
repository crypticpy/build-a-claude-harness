# Harness Lab — User Stories and Acceptance Criteria

> Personas, user stories, and Given/When/Then acceptance criteria for the [Harness Lab PRD](01-prd.md). Feature ids in parentheses (e.g. F3) reference the [PRD feature set](01-prd.md#6-feature-set). MVP-blocking stories are marked **must**.

**Date:** 2026-06-23 · 5 personas · 17 stories across 7 epics.

---

## Personas

### Priya, the Curious Skimmer
A working developer who uses Claude Code daily and just heard it can be extended with hooks. She arrived from a link or search, has 5-10 minutes, and zero patience for setup. She wants to see something real happen before she decides the course is worth her evening. She reads on her laptop, often on a second monitor while something else compiles. If the landing page makes her install anything or read three paragraphs before she can act, she leaves.
**Primary goal:** a real, tangible win in under 90 seconds (run an actual hook in the browser and watch it fire) so she can decide the course is credible.

### Marcus, the Committed Builder
A mid-to-senior engineer who has decided to learn to extend Claude Code properly and will work through the course over several sittings. He does the exercises rather than just reading, diffs his work against the solution when stuck, and cares that the in-browser checkpoint reflects what would happen on his real machine. He values the soft mastery gate as a forcing function but resents being trapped by a tooling quirk. He works across devices and expects to resume exactly where he left off.
**Primary goal:** complete the course by producing every checkpoint artifact for real, confident that an in-browser ✅ predicts a real-machine ✅, and resume seamlessly across sessions.

### Dana, the Returning Reference User
An engineer who already finished or skimmed the course and now treats the site as a reference. She comes back to look up a specific thing (the exact Memento event pair, the `settings.json` matcher syntax, where to spend tokens), usually via search or a deep link a teammate shared. She wants the answer in seconds, not a re-walk through onboarding. She also shares pre-broken example states with teammates to illustrate a point.
**Primary goal:** jump straight to a specific lesson, doc, or concept via search or deep link, get the precise answer, and share an exact state, without re-onboarding.

### Sam, the Accessibility-Dependent Learner
A blind developer who navigates with a screen reader and keyboard only, and sometimes uses Windows High Contrast / forced-colors mode. Sam is fully capable of the engineering work and refuses a degraded experience. Sam needs the prose to be first-class semantic HTML readable with zero JS, the widgets operable by keyboard without focus traps, and pass/fail outcomes announced as text, never by color or canvas alone.
**Primary goal:** read every lesson and operate the runner and checkpoints entirely by keyboard and screen reader, with outcomes announced as text, never walled out of the reading or the doing.

### Theo, the Mobile / Constrained-Network Learner
A learner who reads on a phone during a commute on a throttled connection, then later sits at a laptop for the hands-on parts. He expects the reading experience to be fast and fully usable on a narrow viewport with the two-pane workspace collapsing to tabs, and he expects the heavy runtime not to cost him bandwidth or battery when he is only reading.
**Primary goal:** read and navigate the entire course comfortably on a phone over a slow connection, with the interactive runtime never loading until he intends to use it.

---

## Epic A — Landing and onboarding

### HL-001 · First win above the fold · **must** · Priya
**As a** curious skimmer landing for the first time, **I want** to run a real hook and see its log line above the fold before any setup or scrolling, **so that** I can verify the course is credible in under 90 seconds.

- **Given** a first-time visitor on the landing page, **when** the page finishes loading, **then** the Lesson 1.1 hello-hook runner (editor + Run + output region) is visible above the fold with no scroll, and no install/signup/Part-0 step gates it (F16).
- **Given** the embedded 1.1 runner, **when** the visitor clicks Run without editing (the `start/` skeleton still has its TODO blanks), **then** the runner executes the real `start/hello-hook.mjs` in the node-shim worker and the output shows the honest failure/empty path for the unfilled blank, not a fake success (F2, F3).
- **Given** the visitor fills the two TODO blanks correctly and clicks Run, **when** the worker finishes, **then** the output announces `Exited 0 — checkpoint passed ✅` as text, shows the appended log line, and a client-side timer records time-to-first-win (F3, F13, F16).
- **Given** the runner panel, **when** displayed, **then** a persistent plain-text label states this code ran for real (not simulated), distinguishing it from any simulated panel.
- **Given** a visitor with prior progress in `localStorage`, **when** the landing loads, **then** a "Resume where you left off" affordance links to their last in-progress lesson (F8, F16).
- **Given** the landing below the fold, **when** the visitor scrolls, **then** a router mini-map of the six lifecycle events is shown, each in its permanent color, and hovering/focusing an event highlights which lessons touch it and doubles as navigation (F4, F11).
- **Given** the reading-route budget, **when** the landing is measured on a 4x-throttled mid-tier mobile profile in CI, **then** LCP <1.5s, CLS <0.05, and the worker runtime is lazy-loaded on intent, not on initial load (F17).

### HL-002 · Part 0 as optional scenery · **should** · Marcus
**As a** learner deciding how to start, **I want** Part 0 setup reframed as optional scenery with an honest browser-capability probe, **so that** I am not gated behind a local-machine check a static site cannot perform.

- **Given** Part 0, **when** a learner views it, **then** it is presented as optional scenery and does not block access to Part 1 (F16).
- **Given** the browser-capability probe, **when** it runs, **then** it checks only browser features (module Web Worker boots, the fs/worker shim initializes) and explicitly states in text that it cannot and does not verify the learner's real Node or `claude` install (F16).
- **Given** the three onboarding tiers, **when** a learner clears a tier's graduation event (run 1.1, unlock Part 1, reach Part 2 Memento), **then** that graduation is recorded once in `localStorage` and reflected in the navigator (F8, F16).

---

## Epic B — Browsing and navigation

### HL-003 · Persistent course navigator · **must** · Marcus
**As a** learner working over multiple sittings, **I want** a persistent left-rail navigator of all parts, lessons, and the transfer task showing each lesson's state, **so that** I always know what I have passed, attempted, and what is next.

- **Given** the `/course` view, **when** it loads, **then** a persistent left-rail navigator lists all 9 parts, expanding to 27 lessons plus the transfer task, each a real link to its own per-lesson URL (F1, F8).
- **Given** each lesson node, **when** rendered, **then** its state (not-started / attempted / checkpoint-passed) is conveyed by **both** a glyph and a text label, never by color alone (F8, F11, F13).
- **Given** the active lesson, **when** the navigator renders, **then** the active node carries `aria-current` and is visually distinguished (F8).
- **Given** a lesson completes, **when** the learner produces its checkpoint artifact, **then** its state flips to checkpoint-passed automatically (no "mark done" button) and the next lesson's editor unlocks (F8).
- **Given** a learner anywhere, **when** they invoke the ⌘K palette, **then** they can search and jump to any lesson or doc by title via keyboard (F8).
- **Given** the navigator on a narrow viewport, **when** displayed, **then** it collapses into an accessible disclosure/drawer without losing the per-lesson glyph+text state (F8, F12).

---

## Epic C — Reading a lesson

### HL-004 · Single-source, zero-JS reading floor · **must** · Theo
**As a** learner reading lessons, sometimes on a phone over a slow connection, **I want** every lesson rendered as fast, semantic, single-source HTML generated from the repo markdown, **so that** I can read and navigate the whole course with zero JS and minimal bandwidth.

- **Given** any of the 27 lessons or the transfer task, **when** the page is requested, **then** it is served as one static HTML file generated from the repo's `course/**/README.md`, with prose never re-typed into components (F1).
- **Given** the lesson anatomy (Objectives / Time / Before you start / The lesson / Checkpoint / Recap+next), **when** the build runs, **then** a parser produces all named slots and CI fails if any lesson fails to yield all expected slots (F1).
- **Given** a lesson with JavaScript fully disabled, **when** a learner reads it, **then** the full prose, Objectives, Checkpoint criteria, and prev/next links are present, readable, and operable (the zero-JS floor) (F1).
- **Given** relative cross-links in the source markdown (e.g. `../../docs/glossary.md#payload`), **when** the page is built, **then** they are rewritten to working in-site routes/anchors, not broken file paths (F1).
- **Given** the two-pane workspace on a wide viewport, **when** a lesson loads, **then** the left pane shows the generated prose in a ~65ch measure and the right pane pins the widget relevant to the current section (F12).
- **Given** a narrow viewport, **when** the workspace renders, **then** it collapses to tabbed Read / Run panes with no horizontal scrolling of prose (F12).
- **Given** the reading route, **when** measured in CI, **then** it ships ≤100KB JS gzipped and no interactive island is statically imported into the reading bundle (F17).

### HL-005 · Inline reference affordances · **should** · Dana
**As a** returning reference user, **I want** glossary terms to surface inline hovercards and code blocks to render with filename tabs and copy buttons, **so that** I can get a precise definition or copy an exact snippet without leaving the lesson.

- **Given** a glossary term in lesson prose, **when** a learner hovers or keyboard-focuses it, **then** a hovercard with the glossary definition appears and is dismissible by keyboard (F12).
- **Given** a fenced code block, **when** rendered, **then** it shows a filename tab (when the source specifies one), Shiki highlighting, and a working copy-to-clipboard button (F12).
- **Given** a lesson's ✅ success criterion, **when** rendered, **then** it uses the dedicated success-card style and includes the verbatim outcome string from the README (e.g. the exact `wc -l < ... # expect: 2` expectation for 2.1) (F12).

---

## Epic D — In-browser interactive exercise

### HL-006 · Scaffolding-and-fading editor · **must** · Marcus
**As a** learner doing a hands-on coding exercise, **I want** to edit the real harness module in a code editor with scaffolding I can fade in or out, **so that** I can practice at the difficulty matching my confidence against the same checkpoint.

- **Given** a code task, **when** it loads, **then** the default tier is the completion problem: the repo's real `start/` file with its 1-2 TODO blanks rendered as highlighted slot decorations auto-placed from the existing `____`/`TODO` markers (F7).
- **Given** the completion tier, **when** the learner chooses "Show me", **then** the editor fades to the worked-example tier (solution + step-through); **when** they choose "Try it cold", **then** it fades to blank-slate, all three asserting the same checkpoint (F7).
- **Given** two cold passes, **when** the next code task loads, **then** the site nudges cold-by-default but does not force it (F7).
- **Given** the editor, **when** the learner edits, **then** per-file copy and reset-to-skeleton controls are available and the buffer persists to `localStorage` namespaced/versioned (e.g. `hl:v1:<lessonId>`) (F7, F8).
- **Given** CodeMirror 6, **when** a learner is keyboard-only, **then** the editor is keyboard-trap-free: Tab can move focus out (Esc-then-Tab path, visible "Tab moves focus" toggle), satisfying WCAG 2.2 SC 2.1.2 (F7, F13).
- **Given** a learner who edited code and reloads, **when** the lesson reopens, **then** their edited buffer is restored, not reset to skeleton (F8).

### HL-007 · Event→router simulator · **must** · Priya
**As a** learner exploring the event model, **I want** an event→router simulator that runs the real `unified-hook` against a payload I choose and shows which matcher row fires, **so that** I can build a mental model of how an event becomes a dispatched command without touching Node.

- **Given** the router simulator, **when** it renders, **then** the matcher table is parsed from the real `reference/settings.template.json` at build time (SessionStart/UserPromptSubmit/PreCompact/Stop on `*`, PostToolUse on `Write|Edit` with `*` fallback), not a hand-copied table (F4).
- **Given** a learner picks one of the six events and edits a payload, **when** they run it, **then** the worker executes the real `unified-hook.mjs` with that event as `argv[2]` and the payload pre-seeded on stdin, and the UI highlights the matched row and the switch branch taken (F2, F4).
- **Given** a run, **when** it completes, **then** the simulator visualizes which module was lazy-imported, the resulting virtual-filesystem diff, and the captured stdout, with a step / slow-mo toggle (F4).
- **Given** each lifecycle event, **when** shown anywhere (chip, router row, timeline), **then** it uses its single permanent hue so the same event reads identically across the UI (F4, F11).
- **Given** progressive disclosure, **when** the learner reaches it, **then** 0.2 is read-only, 1.2 lets them wire a new row and watch their hook fire, and 2.2 overlays the Memento write/read pair on the same timeline (F4).

### HL-008 · Mocked LLM with labeled modes · **should** · Marcus
**As a** learner who just learned about LLM-backed hooks, **I want** the LLM call mocked at the `fetch` boundary with clearly labeled modes, **so that** I can see both the fail-silent no-op path and a real parsed summary without a backend or my API key.

- **Given** a lesson whose module calls `callLlm()` (`llm-call.mjs`, the only fetch site), **when** the learner selects "no key" mode, **then** fetch rejects, `callLlm` returns null, and the learner observes the real fail-silent no-op path executing (F5).
- **Given** "mocked" mode, **when** the learner runs the module, **then** a deterministic Responses/Chat-shaped JSON is returned so `extractResponsesText`/`extractChatText` parse a real summary, and a persistent "MOCKED RESPONSE" badge is shown (F5).
- **Given** any fetch-fed panel, **when** displayed, **then** the mocked-vs-real status is labeled in plain text and the LLM edge is never silently presented as real network traffic (F5).

---

## Epic E — Running a checkpoint

### HL-009 · Run the literal checkpoint · **must** · Marcus
**As a** learner who filled in a lesson's TODO blanks, **I want** to run the lesson's actual checkpoint and have it assert the README's literal ✅ artifact, **so that** a passing checkpoint in the browser predicts a passing checkpoint on my real machine.

- **Given** the learner's edited `start/` file, **when** they run the checkpoint, **then** the file is loaded into the virtual filesystem, executed against the lesson's fixture payload in the node-shim worker, and the README's observable artifact is asserted (log line / file path / stdout / exit code / JSON shape) using the repo's own `fixtures/` (F2, F3).
- **Given** assertion-based verification, **when** a learner's solution differs stylistically from `solution/` but produces the correct artifact, **then** the checkpoint passes (assertion on artifact, not string-equality) (F3).
- **Given** Lesson 2.1's checkpoint, **when** the learner runs the rolling-log module twice with two fake tool events, **then** the runner confirms `logs/<session>.jsonl` has exactly 2 lines (the count climbs each run) and the first line matches `fixtures/expected-log-line.jsonl` shape (timestamp excepted), and announces "checkpoint passed ✅" (F3, F13).
- **Given** the documented misconception "file gets replaced instead of growing (count stays at 1)", **when** a failing run matches that signature, **then** the runner surfaces the lesson's exact remediation ("you used a write instead of an append, re-check blank 2") rather than a generic red X. For MVP this is at minimum the plain assertion-failure message, with misconception routing as a documented fast-follow (F3, F15).
- **Given** the README's two paths, **when** the checkpoint widget renders, **then** the "offline (proves the code)" path runs client-side for real and the "live (proves the wiring)" path is a one-click copy-paste command honestly labeled as not runnable in-browser (F3).
- **Given** an attempt has been made, **when** the learner requests "Compare to solution", **then** a merge-view diff against `solution/` is revealed only after that first attempt (F3, F7).
- **Given** a runnable lesson, **when** the build runs in CI, **then** its checkpoint passes identically in the worker and on real Node, and any runnable lesson lacking a fixture (e.g. 1.1/1.2/1.3) is a hard build error after its fixture is authored from `solution/` output (F3).
- **Given** a learner's code with an infinite loop, **when** the checkpoint runs, **then** a 3s abort guard terminates the worker so the tab does not hang, and the output reports the timeout as text (F2).

### HL-010 · Soft mastery gate with escape hatch · **must** · Marcus
**As a** learner who has not yet passed the current checkpoint, **I want** a soft mastery gate with an escape hatch after repeated attempts, **so that** I am pushed to actually pass, but a runtime quirk never traps me.

- **Given** an unpassed checkpoint, **when** the learner views the next lesson, **then** the next lesson's editor is locked but its reading remains fully open (F8).
- **Given** the current checkpoint passes, **when** the artifact is produced, **then** the next lesson's editor unlocks automatically (F8).
- **Given** N failed attempts (a per-lesson override count), **when** the threshold is reached, **then** an "I'm stuck / continue anyway" override appears and unlocks the next editor when used (F8).
- **Given** the gate, **when** applied, **then** it gates only the doing, never the prose and never the "Show me" worked example, which stay open always (F8).

---

## Epic F — Progress, retrieval, search and sharing

### HL-011 · Local progress with export/import · **must** · Marcus
**As a** learner using the course across sessions and devices with no account, **I want** my progress, editor buffers, and attempt history persisted locally with export/import, **so that** I can resume exactly where I left off and move progress between machines.

- **Given** any state change (lesson state, editor buffer, retrieval attempt), **when** it occurs, **then** it is written to `localStorage` under a namespaced, versioned key (e.g. `hl:v1:<lessonId>`) (F8).
- **Given** a returning learner, **when** they reopen the site, **then** a "Resume where you left off" entry point links to their last in-progress lesson and restores its editor buffers (F8).
- **Given** no backend account, **when** they want to move progress, **then** they can export all progress as a single JSON blob and import it on another device, restoring state, buffers, and attempt history (F8).
- **Given** a future schema change, **when** the app loads older data, **then** the versioned key allows migration rather than silent loss of buffers (F8).
- **Given** completion is defined by artifacts, **when** counting progress, **then** per-lesson completion reflects checkpoints cleared (27 + transfer task), never pages read or a manual toggle (F8).

### HL-012 · Active-retrieval recall gate · **could** · Marcus
**As a** learner recalling prior material, **I want** the opening recall and cross-part callbacks to require an attempt before revealing the answer, **so that** I get the testing-effect benefit instead of passively expanding a details box.

- **Given** a lesson's opening "No peeking" recall and the 🔁 cross-part callbacks, **when** rendered, **then** they are attempt-then-unlock gates rather than click-to-reveal details, scoped to only those (not every `<details>`) to avoid quiz fatigue (F14).
- **Given** an attempt, **when** the learner submits a non-empty free-text or MCQ response, **then** the canonical answer (already verbatim in the README) is revealed plus a one-line why; gating is on "attempted", not auto-graded correctness (F14).
- **Given** an attempt, **when** submitted, **then** it is logged to `localStorage` with an optional sure/unsure confidence tag (F14).

### HL-013 · Search and shareable state · **could** · Dana
**As a** returning reference user, **I want** full-text search across all lessons and docs, plus shareable links that encode a specific state, **so that** I can jump to the exact thing I need and share an exact example with a teammate.

- **Given** any page, **when** the learner opens search, **then** Pagefind returns full-text results across all 27 lessons and the docs, with its WASM index fetched correctly under the `/build-a-claude-harness/` base path (F22).
- **Given** the search index, **when** the site is deployed, **then** a CI smoke test fetches the Pagefind index under the base path and fails the build if it 404s (F22, F10).
- **Given** a learner with edited code and a chosen payload, **when** they create a shareable link, **then** the state is encoded in the URL hash (lz-string) so opening it reproduces the same buffer and payload, fully client-side (F22).
- **Given** the ⌘K palette as the always-available navigation fallback, **when** search is unavailable, **then** learners can still reach any lesson or doc by title (F8).

---

## Epic G — Accessibility, mobile, and hosting integrity

### HL-014 · Accessible console widget · **must** · Sam
**As a** screen-reader and keyboard-only learner, **I want** the console/terminal widget to be a real ARIA live region announcing outcomes as text, **so that** I can run code and hear the result without a screen-reader-invisible canvas.

- **Given** the console widget, **when** output streams, **then** it is a DOM region with `role=log aria-live=polite aria-atomic=false` (not a canvas/WebGL terminal), so lines announce incrementally (F13).
- **Given** a chatty hook producing many lines, **when** output streams, **then** live-region appends are debounced and batched (flush roughly every 150ms) so the screen reader is not flooded (F13).
- **Given** a run completes, **when** the outcome is known, **then** it is exposed via `role=status` using the exact pass/fail string the markdown specifies (e.g. `Exited 0 — checkpoint passed ✅`), and every cue uses glyph + text, never color alone (F13).
- **Given** the widget controls, **when** operated by keyboard, **then** focus order is stdin input → Run → output → Reset, all controls are real buttons, and there is a labelled textarea for stdin (F13).
- **Given** Windows High Contrast / forced-colors mode, **when** the widget renders, **then** it remains fully legible and operable (F13, F11).

### HL-015 · Perceivable without color, JS, or motion · **must** · Sam
**As a** keyboard and screen-reader learner, **I want** the whole reading experience and all visualizations operable and perceivable without color, JS, or motion dependence, **so that** I am never walled out of either the reading or the doing.

- **Given** any lesson with JavaScript disabled, **when** Sam reads it, **then** all prose, Objectives, Checkpoint criteria, callouts, and prev/next navigation are present and operable (F1).
- **Given** every page, **when** loaded, **then** a skip-to-content link is the first focusable element and headings are properly nested with anchored links (F12).
- **Given** the six event hues and the accent, **when** measured in both dark and light themes, **then** each meets 4.5:1 contrast, verified by an automated CI check, and no information is conveyed by color alone (F11).
- **Given** any animated visualization (race condition, Memento timeline, JSON-RPC step), **when** `prefers-reduced-motion` is set, **then** a static labelled before/after diff derived from the same data model is shown instead, so the two cannot disagree (F11, F15).
- **Given** an in-page reduce-motion toggle and a theme toggle (dark default / light / system), **when** used, **then** they take effect immediately and are keyboard-operable (F11).
- **Given** the editor and widgets, **when** navigated by keyboard, **then** there are no focus traps and every control is reachable and labelled (WCAG 2.2) (F7, F13).

### HL-016 · Mobile workspace and pay-on-intent runtime · **should** · Theo
**As a** learner reading on a phone over a throttled connection, **I want** the two-pane workspace to collapse to tabs and the heavy runtime to never load until I intend to use it, **so that** reading stays fast and cheap and the runtime does not cost me bandwidth or battery.

- **Given** a narrow viewport, **when** a lesson loads, **then** the Read | Run split collapses to accessible tabbed panes, defaulting to Read, with no horizontal scroll of prose (F12).
- **Given** a learner only reading, **when** the page loads, **then** the node-shim worker, CodeMirror language modes, and per-lesson fixtures are not in the initial bundle and load only on intent (focus/click of a sandbox), pre-warmed by proximity (F17).
- **Given** the reading route on a 4x-throttled mid-tier mobile profile, **when** measured in CI (enforced after the first-deploy baseline), **then** JS ≤100KB gzipped, LCP <1.5s, CLS <0.05, INP <200ms, and a regression that bloats the reading route fails the build (F17).
- **Given** the runtime cannot boot on a constrained device, **when** a learner opens the Run pane, **then** the panel degrades to the lesson's copy-pasteable command and its expected output rather than failing silently (F3).

### HL-017 · Base-path integrity in production · **must** · Dana
**As a** learner following a deep link to a specific lesson on the live GitHub Pages site, **I want** deep links and the in-browser runtime to resolve correctly under the repo base path, **so that** shared links work and the interactive runner actually boots in production.

- **Given** the site deployed to GitHub Pages, **when** any internal link, asset, worker URL, or Pagefind index resolves, **then** it is built via `import.meta.env.BASE_URL` or `new URL('./x.worker.js', import.meta.url)` under `/build-a-claude-harness/`, with no root-absolute paths (F10).
- **Given** a deep link to a per-lesson URL, **when** followed directly, **then** the lesson loads (one static HTML per lesson), and an unknown deep link falls back to `404.html` (F1, F10).
- **Given** the deploy pipeline, **when** it runs, **then** Pages source is GitHub Actions (not Jekyll), `.nojekyll` is present so `_astro/` hashed assets survive, and a post-build headless smoke test fetches the hashed worker chunk at the deployed base path and boots it, gating deploy on success (F10).
- **Given** built HTML, **when** CI checks it, **then** a no-root-absolute-paths assertion fails the build if any absolute path would 404 the runtime in production (F10).

---

## Traceability: stories → MVP features

| Story | Priority | Key features |
| --- | --- | --- |
| HL-001 First win | must | F16, F2, F3, F13, F4, F11, F17 |
| HL-002 Part 0 scenery | should | F16, F8 |
| HL-003 Navigator | must | F1, F8, F11, F13 |
| HL-004 Reading floor | must | F1, F12, F17 |
| HL-005 Reference affordances | should | F12 |
| HL-006 Fading editor | must | F7, F8, F13 |
| HL-007 Router simulator | must | F4, F2, F11 |
| HL-008 Mocked LLM | should | F5 |
| HL-009 Run checkpoint | must | F2, F3, F13, F15 |
| HL-010 Soft gate | must | F8 |
| HL-011 Local progress | must | F8 |
| HL-012 Active retrieval | could | F14 |
| HL-013 Search + sharing | could | F22, F10, F8 |
| HL-014 Accessible console | must | F13, F11 |
| HL-015 No color/JS/motion dependence | must | F1, F12, F11, F15, F7, F13 |
| HL-016 Mobile + pay-on-intent | should | F12, F17, F3 |
| HL-017 Base-path integrity | must | F10, F1 |

The **must** stories (HL-001, 003, 004, 006, 007, 009, 010, 011, 014, 015, 017) define the MVP acceptance surface. Their features are exactly the [MVP set](01-prd.md#10-mvp).
