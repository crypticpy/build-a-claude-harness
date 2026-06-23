# Capstone exemplar — a 5/5 design

This is a **worked answer** to the [capstone transfer task](../8.2-depersonalize-publish/#capstone-transfer-task--design-something-new). Read it _after_ you've drafted your own design, then compare scoring. The point isn't to copy this piece — it's to calibrate what "5/5 against the rubric" actually looks like, so you can grade your own design honestly.

> **Read your own first.** If you read this before drafting, you'll anchor on it and learn less. Draft, score yourself, _then_ come here.

---

## The annoyance

> "When I edit a `package.json` (or `requirements.txt`, `go.mod`, `Cargo.toml`) to add a dependency, I forget to actually install it. Then the next command fails with a confusing 'module not found,' and I waste a minute realizing the lockfile is stale. I want a nudge — not an auto-install, just a reminder — the moment I edit a manifest, telling me the lockfile is now out of date."

A small, real, repetitive friction. Worth a tiny harness piece; not worth a heavyweight one.

## The design — `stale-lockfile-hint`

A **`PostToolUse` hook** on `Edit|Write`. When the edited file's basename is a known dependency manifest, it checks whether a sibling lockfile exists and is **older** than the manifest just edited. If so, it prints a one-line hint:

> `stale-lockfile hint: package.json was edited but package-lock.json is older — run 'npm install' to refresh it.`

It makes **no LLM call** — a manifest-name match plus an `mtime` comparison is plain code. It does **nothing** on any file that isn't a recognized manifest, and **nothing** if no lockfile exists yet (nothing to be stale). It never installs anything — a nudge, not an action, because auto-installing on every manifest edit would be surprising and occasionally destructive.

A sketch (not required for the task — the _design_ is what's graded):

```js
// stale-lockfile-hint.mjs — PostToolUse on Edit|Write
import { statSync, readFileSync } from "node:fs";
import { dirname, basename, join } from "node:path";

const LOCKS = {
  "package.json": "package-lock.json",
  "requirements.txt": "requirements.lock",
  "go.mod": "go.sum",
  "Cargo.toml": "Cargo.lock",
};

// Read the whole hook event off stdin (fd 0) in one synchronous slurp.
const readStdin = () => readFileSync(0, "utf8");

try {
  const evt = JSON.parse(readStdin()); // fail-silent: malformed in → no-op
  const file = evt?.tool_input?.file_path ?? "";
  const lock = LOCKS[basename(file)];
  if (!lock) process.exit(0); // not a manifest → silent
  const lockPath = join(dirname(file), lock);
  const manifestM = statSync(file).mtimeMs;
  const lockM = statSync(lockPath).mtimeMs; // throws if no lockfile → caught below
  if (lockM < manifestM) {
    console.log(
      `stale-lockfile hint: ${basename(file)} was edited but ${lock} is older — refresh it.`,
    );
  }
} catch {
  // any error (no stdin, no lockfile, bad path) → no-op, exit 0
}
process.exit(0);
```

---

## Self-score against the rubric — 5/5

| #   | Criterion                         | This design                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | ✓   |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| 1   | **Correct event choice**          | `PostToolUse` on `Edit\|Write` — the behavior must fire _right after a manifest is edited_, which is exactly what `PostToolUse` observes. Not `Stop` (too late, and would re-nag every turn), not `PreToolUse` (the edit hasn't happened yet).                                                                                                                                                                                                                                                                | ✅  |
| 2   | **Right tool-type**               | A **hook** — it must fire _automatically on an event_, with no human invocation and no model decision. A slash command (you'd have to remember to type it — defeating the purpose) or a skill (model-invoked, non-deterministic) would both be wrong for an automatic, deterministic nudge.                                                                                                                                                                                                                   | ✅  |
| 3   | **Cost tier justified**           | **No LLM call — free.** The job is "match a basename and compare two mtimes," which plain code does perfectly. It runs on _every_ edit, so even a cheap model would be wasteful; the right tier for a constant, code-answerable job is _no call at all._ (Cost ladder: prefer free when code can do it.)                                                                                                                                                                                                      | ✅  |
| 4   | **Fail-silent considered**        | Wrapped in try/catch, exits 0 on any error. No lockfile yet → `statSync` throws → caught → silent (correct: nothing to be stale). Malformed event, missing path, unreadable file → all no-ops. It can never crash the session or block an edit.                                                                                                                                                                                                                                                               | ✅  |
| 5   | **Verifiable checkpoint defined** | **Solo-mechanically-verifiable:** create a dir with a `package.json` and a `package-lock.json`, `touch` the lockfile _older_ than the manifest, pipe a synthetic `{"tool_input":{"file_path":".../package.json"}}` event to the hook, and assert it prints the `stale-lockfile hint:` line. Then `touch` the lockfile _newer_ and assert it prints **nothing**. Then send a `README.md` edit and assert **nothing**. Three concrete, observable outcomes — a printed line or its absence — not "looks right." | ✅  |

**Total: 5/5.** Every criterion is _specific_ — a named event, a justified tool-type, an explicit "no call, here's why," a concrete fail-silent behavior, and a checkpoint that observes printed output (an artifact), not a vibe.

## Why this scores 5 and a weaker draft scores 3

A common 3/5 version of the same idea:

- _"I'll add a hook that reminds me to install dependencies."_ — Criterion 1 has **no named event** (which hook? when?) → no point. Criterion 5 is **"it reminds me"** with no observable artifact → no point. Criterion 3 might be hand-waved (_"maybe it asks an LLM if the lockfile is stale"_ — unjustified, and wrong: code can answer this) → no point.

Same instinct, half the score — because the rubric rewards _specificity_. "A hook" is not criterion 1; _"`PostToolUse` on `Edit|Write`, because the nudge must fire right after the manifest changes"_ is. The discipline the rubric trains is naming the exact thing, every time.

---

_[Back to 8.2](../8.2-depersonalize-publish/) · [Capstone landing](../README.md) · [The Ten Principles](../../../docs/principles.md)_
