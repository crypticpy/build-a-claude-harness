# 8.2 — Depersonalize & publish (and design something new)

A harness is full of _you_. Your absolute home paths, your email, your employer's name, your private repo names, the env var holding your API key, maybe a model id you shouldn't share. None of that can go on the public internet. This lesson teaches the audit that makes a harness safe to publish — and it teaches it using **the exact checker this repository uses on itself**. Then it hands you the capstone transfer task: design a _new_ harness piece for an annoyance of your own, and grade it against a rubric.

## Objectives

By the end, you will be able to:

- **Explain** the two-pass design of a depersonalization check — repo-wide secret scanning vs. reference-only personal-token scanning — and why those passes have different scopes.
- **Run** a depersonalization check against a harness, prove it **flags a planted secret**, and prove it **passes when clean**.
- **List** the publish-safety steps beyond scanning: rotating any key that touched the repo, and gitignoring runtime data.
- **Design** a new harness piece and self-score it 5/5 against the capstone rubric.

Each objective maps to a Checkpoint or the rubric below.

## Time

30–40 minutes (plus open-ended design time on the transfer task).

## Before you start

> 🧠 **No peeking (recall from Part 1 / Part 6):** Why is a secret in `settings.json` worse than a secret in a runtime log? (Hint: which one does the installer copy _verbatim_ into version control, and which one should never be tracked at all?)
>
> <details><summary>Answer</summary>The <code>settings.json</code> <i>template</i> is <b>tracked and copied verbatim</b> by the installer — a secret there ships to everyone who clones the repo. A runtime log holds session data and should be <b>gitignored entirely</b> — never tracked, so it can't leak through git. The fix differs by location: secrets belong in env/generated-config (not the template), and runtime data belongs in <code>.gitignore</code> (not the repo). The check in this lesson guards the first; <code>.gitignore</code> guards the second.</details>

Copy this lesson's `start/` — it ships a depersonalization checker with a couple of blanks, plus fixtures (a planted-secret sample and a clean sample):

```bash
cp -r start my-publish && cd my-publish && cp -r ../fixtures .
```

## The lesson

### The meta-moment: the checker IS the worked example

Before anything else, open [`scripts/check-depersonalized.sh`](../../../scripts/check-depersonalized.sh) at the **root of this repo.** That script is not a teaching toy. **It is the real check this repository runs in CI**, and it is the reason the harness you've been learning from is safe to be public. This repo was depersonalized _from a private one_ — full of one person's paths, email, employer, private repo names, a non-public model id, an API key env var — and that script is what verifies the cleanup held, every commit. You are about to learn the pattern by reading the production instance of it.

### Principle: encode the discipline so it can't rot

You could depersonalize a harness once, by hand, carefully. It would be clean — until your next commit pasted an absolute path back in. Depersonalization isn't a _state_ you reach; it's a **property you enforce.** That's the same logic as [idempotent setup](../../../docs/principles.md#10-idempotent-templated-setup): put the discipline in a re-runnable tool (a CI check, a pre-commit hook) so the repo _stays_ clean instead of being briefly clean. A check you run on every commit is worth infinitely more than a cleanup you did once.

### The two-pass design (and why the scopes differ)

Read the root checker and notice it scans in **two passes with different scopes** — this is the key design insight:

- **Pass 1 — SECRETS, scanned repo-wide.** A real API key (OpenRouter `sk-or-…`, OpenAI `sk-proj-…`, Anthropic `sk-ant-…`, AWS, a GitHub PAT, a Google key) must appear **nowhere**, in any file. A leaked key is a hard fail anywhere — there is no file where a live secret is acceptable. So this pass scans the whole repo.

- **Pass 2 — PERSONAL tokens, scanned in the shipped harness only (`reference/`).** Absolute home paths, a personal email, an employer name, a private repo name, a non-public model id — these must be clean in the **shipped harness**, but the _course and docs legitimately name them as bad examples._ This very lesson types "don't hardcode a private model id like `gpt-5-mini`" as teaching material; a naive repo-wide scan would flag that and fail on its own documentation. So pass 2 is **scoped to the harness directory** and deliberately _excludes_ the teaching material, which is allowed to name the bad patterns it teaches you to avoid.

That scope split is the whole subtlety: **a secret is never okay anywhere, but a personal token is okay in prose that's teaching you not to use it.** Get the scopes wrong and you either miss leaks (too narrow on pass 1) or fail on your own examples (too wide on pass 2).

### Beyond scanning: rotate and gitignore

A scanner catches what's _in_ the repo now. Two things it can't do for you:

1. **Rotate any key that ever touched the repo.** If a real key was _ever_ committed — even if you've since deleted it — it's in the git history, and history is forever-ish. The only safe move is to **rotate the key** (revoke the old one, issue a new one) at the provider. Removing the line is necessary but not sufficient; the old key must be made worthless. Treat any key that was ever committed as compromised.
2. **Gitignore runtime data.** Memory files, the rolling log, the MCP store, session state — these accumulate _your_ activity (file paths you worked on, prompts, lessons). They belong in `.gitignore`, never tracked. A clean template that ships a populated `memories/` directory has leaked your sessions. Confirm your runtime paths are ignored.

### How the reference does it

The root checker uses `ripgrep` if present (falling back to `grep`), excludes itself and `.git` and `node_modules`, and exits non-zero on any hit so CI fails the build. Its `AUTHOR_HANDLE` is overridable so a forker can substitute their own allowed handle. Your `start/` checker is a trimmed version of the same idea: two passes, two scopes, exit non-zero on a hit. Fill the blanks to make it flag a planted secret and pass on clean input.

### Build — finish the checker

Open `start/check-clean.sh`. The structure (two passes, the scan helper, the exit logic) is written. The **blanks**:

- **Blank 1:** add the secret pattern for an API-key shape to the `SECRET_PATTERNS` list (a `sk-…`-style key). This is the pass-1 pattern that must match nowhere.
- **Blank 2:** in pass 2, scan the **harness directory argument** (not the whole tree) for the personal patterns — that's the scope split. Pass the right path to `scan`.

Then run it against the fixtures.

## Checkpoint

The checkpoint is the property a real depersonalization check must have: **it flags a planted token, and it passes when clean.**

**1 — It flags a planted secret.** `fixtures/dirty/` contains a harness sample with a planted fake API key and an absolute home path:

```bash
bash check-clean.sh fixtures/dirty ; echo "exit=$?"
```

✅ **You got it when** it prints the offending pattern(s) and the file, and **exits non-zero** (1). A check that exits 0 on the dirty fixture would wave a leak through — the worst possible failure for this tool.

**2 — It passes when clean.** `fixtures/clean/` is the same harness with the secret removed and the path made relative:

```bash
bash check-clean.sh fixtures/clean ; echo "exit=$?"
```

✅ **You got it when** it prints a pass message and **exits 0.** Both directions matter: a check that fails on _everything_ is as useless as one that passes on everything. The two fixtures prove it discriminates.

> 🔁 **Then point it at your own harness** (from 8.1): `bash check-clean.sh <your-harness-dir>`. Fix anything it flags — and remember the two things scanning can't do: **rotate** any key that was ever committed, and **gitignore** your runtime data.

---

## Capstone transfer task — design something new

This is the real test of the whole course. Not "can you copy the reference" — **"can you reason out the right harness piece for a problem the course never showed you."**

> **The task:** Pick a real workflow annoyance of your own — something repetitive, error-prone, or noisy that you hit while coding. Design (you don't have to fully build) the harness piece that would fix it. Then **self-score it against the 5-criterion rubric** below. Aim for 5/5.

Write a short design — a paragraph or a filled-in template is plenty — that answers all five criteria. A [worked exemplar that scores 5/5 lives in `8-capstone-exemplar/`](../8-capstone-exemplar/) — read it _after_ you draft yours, then compare.

### The 5-criterion rubric (self-scoring)

Score 1 point each. 5/5 is a design you could hand to someone and have them build without guessing.

| #   | Criterion                         | You earn the point when…                                                                                                                                                                                                                                                      |
| --- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Correct event choice**          | You name the specific lifecycle event (or "no event — it's a command/agent the user invokes") and it's the _right_ one for when the behavior must fire. (Log-on-edit → `PostToolUse`, not `Stop`.)                                                                            |
| 2   | **Right tool-type**               | You pick hook / slash command / skill / sub-agent / MCP tool, and it matches the job: automatic-on-event → hook; saved prompt you type → command; model-invoked ability → skill; clean-context delegation → agent; a question about code answerable by plain code → MCP tool. |
| 3   | **Cost tier justified**           | You state whether it makes an LLM call, and if so, justify the model/effort tier by **frequency vs. stakes** (runs constantly → cheap; runs rarely & matters → can be pricier; code can do it → free, no call).                                                               |
| 4   | **Fail-silent considered**        | You say what happens when it errors or a dependency is missing — and the answer is "degrades to a no-op / exits 0 / falls back to asking the human," never "crashes the session."                                                                                             |
| 5   | **Verifiable checkpoint defined** | You define a _solo-mechanically-verifiable_ success check that observes a concrete artifact (a file written, a log line, an exit code, a fixture matched) — not "it looks right."                                                                                             |

> **Self-scoring honesty:** dock the point if the criterion is vague. "It's a hook" with no event named is _not_ criterion 1. "It uses an LLM" with no tier justified is _not_ criterion 3. "I'll know it works" is _not_ criterion 5. The rubric is strict on purpose — that strictness is the skill.

## Recap + next

You learned the depersonalization audit that makes a harness publishable — a **two-pass check** (secrets repo-wide, personal tokens in the shipped harness only) whose scope split is the subtle part, plus the two things scanning can't do (**rotate** committed keys, **gitignore** runtime data). You ran a real instance of that check against a planted-secret fixture and a clean one. And in the transfer task you designed something new and held it to a 5-criterion rubric — which is the judgment the entire course was building toward.

That's the course. You can build a harness, make it safe to share, and reason out new pieces on your own. → Read the **[worked exemplar](../8-capstone-exemplar/)** to calibrate your rubric scoring, revisit the **[Ten Principles](../../../docs/principles.md)** one more time (they should read like old friends now), and ship your harness.
