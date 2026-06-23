# 3.2 — Skills (two activation paths)

A command is a prompt _you_ trigger by name. A **skill** moves the trigger to _Claude_: it reads the skill's `description` and decides on its own when to invoke it. That's the powerful part and the subtle part — the description isn't decoration, it's the matcher. This lesson builds a skill two ways: the **model path** (description-driven) and the **hook path** (a `skill-rules.json` rule the harness matches and suggests) — and walks you straight into the decoy file that eats afternoons.

## Objectives

By the end, you will be able to:

- **Write** a `SKILL.md` whose `description` tells the model exactly when to invoke it and when not to (the model activation path).
- **Wire** a `skill-rules.json` rule and a matcher so a hook suggests the skill on a triggering prompt, proving the rule matches a test phrase and stays quiet on excluded ones (the hook activation path) — and place the rule in the canonical file, not the decoy.

Each objective maps to the Checkpoint below.

## Time

15–20 minutes.

## Before you start

> 🧠 **No peeking (recall from 3.1):** When you type `/scope add caching`, what two things does Claude Code do to the command file before the text reaches the model?
>
> <details><summary>Answer</summary>It <b>strips the frontmatter</b> and <b>substitutes <code>$ARGUMENTS</code></b> with what you typed. A skill is the same kind of Markdown-plus-frontmatter file — but its frontmatter <code>description</code> isn't thrown away: it's the text the model (and the activation hook) matches against to decide whether to load the skill at all.</details>

Confirm 3.1 works (your `/scope` expansion diffs clean against the fixture). Then copy this lesson's `start/`:

```bash
cp -r start my-skill && cd my-skill
```

## The lesson

### Principle: a skill has two ways to fire

There are two independent activation paths, and a real harness uses both:

1. **Model activation (description-driven).** Claude reads every available skill's `description` and decides for itself when one applies. You don't trigger it; you _describe the trigger_ precisely and let the model handle timing. This is why a skill's description spends as much energy on **when _not_ to** use it as on when to — a vague description gets invoked at the wrong moments.
2. **Hook activation (rule-driven).** On `UserPromptSubmit`, the harness matches your prompt against `skill-rules.json` — keyword and regex triggers, plus exclude patterns — and emits a short "you might want this skill" suggestion. This path is pure string/regex matching: **deterministic and testable with no model in the loop.** That's what makes it the checkpoint.

### Why it matters

The model path is what makes skills feel magic — you ask for a thing and the right capability shows up. The hook path is the safety net and the testable surface: you can _prove_ a rule fires on the phrases it should and stays silent on the ones it shouldn't, which you can't do with a probabilistic model decision. Together they're belt and suspenders.

### How the reference does it

The matcher is a trimmed [`modules/skill-activation.mjs`](../../../reference/hooks/unified/modules/skill-activation.mjs). The load order is the load-bearing detail — and it's where the gotcha lives:

> ⚠️ **The decoy stub.** A project may carry a `skill-rules.json` in its runtime `.claude/skills/` directory. The activation hook does **not** read it as rules — it's a **redirect stub**: `{"redirect": true}`. The hook checks for `redirect` and skips it, falling through to the **canonical** file at [`hooks/unified/skill-rules.json`](../../../reference/hooks/unified/skill-rules.json) (where the reference keeps its real rules). Edit the decoy and your rule silently does nothing. This lesson ships both files in `start/` — the decoy at `skills/skill-rules.json` and the canonical one at `hooks/unified/skill-rules.json` — so you can see the trap and the escape: `loadRules()` returns the project file _only if_ it has a `skills` map and `redirect` is not set; otherwise it loads the canonical one.

The reference's `checkSkills` does more (priority grouping, once-per-session state, proactive hints). We keep just the matching core. Read [commands-skills-agents](../../../docs/commands-skills-agents.md) alongside for how skills sit next to commands and agents.

### Build

Three things to fill, plus two given to you:

1. **`skills/changelog-entry/SKILL.md`** — fill **blank 1**: the `description`. Make it say when to use the skill _and_ when not to. (This is the model activation path; there's no test for it — it's a "you should also see…" observation.)
2. **`hooks/unified/skill-rules.json`** (the **canonical** file) — fill **blanks 2 and 3**: the keyword phrases and the intent regex that trigger the skill.
3. **`match-skill.mjs`** — fill **three function bodies** (`loadRules` redirect check, `skillMatches` exclude check, `matchPrompt` loop). The redirect check is what defuses the decoy.

Given complete: `skills/skill-rules.json` (the **decoy** — read it, don't edit it) and `run-matcher-test.mjs` (the test driver).

## Checkpoint

Run the matcher test against the shipped cases:

```bash
node run-matcher-test.mjs
```

✅ All 5 cases pass and the script exits 0:

- "add a changelog entry…" and "update the changelog…" → **suggest `changelog-entry`** (keyword + intent),
- "full release notes…", "plan the changelog… thinking about…", and an unrelated prompt → **no match** (excludePatterns + nothing matches).

This is a **structural check**: it proves the skill is _registered and its rule matches the right phrases_. It also proves the decoy is correctly skipped — `matchPrompt` only returns `changelog-entry` because `loadRules()` fell through the `redirect:true` stub to the canonical file. If you'd put your rule in the decoy (or skipped the redirect check), every positive case would fail with `(no match)`.

Prove the decoy point to yourself directly:

```bash
node match-skill.mjs "please add a changelog entry for the retry fix"   # -> changelog-entry
cat skills/skill-rules.json   # -> {"redirect": true, ...} — the file you must NOT edit
```

> 👀 **You should also see…** (model activation — not the gate): drop `skills/changelog-entry/` into a real `.claude/skills/` directory and, in a normal session, say "add a changelog entry for the new flag." Claude should notice the situation and invoke the skill on its own — _because the `description` you wrote matched_. That live behavior is the payoff; the matcher test above is what you can verify solo.

## Recap + next

You built a skill twice: the `description` that lets the model invoke it for itself, and the `skill-rules.json` rule + matcher that lets a hook suggest it deterministically. And you met the decoy — the top-level `skills/skill-rules.json` redirect stub that quietly ignores your edits while the real rules live in `hooks/unified/`.

→ **[3.3 — Sub-agents](../3.3-sub-agents/)**, where the work moves _out_ of your conversation entirely: a focused job that runs in its own clean context and reports back only its conclusion — plus the "no-wakeup" gotcha that bites anyone who expects an agent to ping them mid-run.
