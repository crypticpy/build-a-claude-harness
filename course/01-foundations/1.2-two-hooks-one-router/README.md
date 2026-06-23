# 1.2 — From two hooks to one router

## Objectives

By the end of this lesson you will be able to:

- **Write** a second standalone hook (a `PostToolUse` edit logger) and feel the duplication it shares with the first.
- **Define** "dispatcher" in one plain sentence.
- **Refactor** both hooks into a single `unified-hook.mjs` that branches on the event name, and **verify** it logs which event fired.

## Time

~15–20 minutes.

## Before you start

You have a working `hello-hook.mjs` from 1.1. Confirm it still passes its checkpoint:

```bash
printf '%s' '{"prompt":"still works"}' | node "$HOME/.claude/hooks/hello-hook.mjs"
tail -n 1 "$HOME/.claude/hello-hook.log"
```

You should see the `prompt: still works` line. If so, you're ready.

## The lesson

### Principle

One hook is a script. Two hooks is a _pattern_ — and the moment you have two, you notice they're nearly the same script copied twice. The fix is a **dispatcher**:

> A **dispatcher** (or **router**) is one script that handles many events by branching on the event name it was passed.

This is the single most important structural idea in the harness. The reference harness has one dispatcher serving _every_ event. You're about to build a two-case version of it.

### Why this matters

Watch what happens without a dispatcher. To add a second hook, you copy `hello-hook.mjs`, rename it, and change the middle. Now the stdin read, the JSON parse, the `try/catch`, the `appendFileSync`, the `process.exit(0)` — all of it — exists **twice**. Add a third hook and it's three copies. Fix a bug in how you read stdin and you have to fix it everywhere. Five hooks in, `settings.json` is a directory listing and every shared helper is duplicated N times.

A dispatcher collapses that. One file, one stdin reader, one `try/catch`, one exit — and a `switch` that's one line per event. New feature? Add a `case`. That's why every serious harness converges on this shape, and why the reference's [`unified-hook.mjs`](../../../reference/hooks/unified/unified-hook.mjs) is the file you anchored on in Part 0.

### How the reference does it

Open the reference router again and find its `switch (eventType)`. Yours will look like a stripped-down version of it: same `process.argv[2]` to read the event name, same `case "prompt":` style branches, same `process.exit(0)` at the end. The reference has more cases and lazy-loads each branch's code; you have two cases inline. **Same skeleton, less muscle.** That's deliberate — you'll add the lazy loading and the extra cases as the course needs them.

> *Aside: the reference's `post-edit` case also runs a real **format-lint** module — it auto-formats the file that was just edited (e.g. runs Prettier on a `.ts` file). We keep our `post-edit` to *logging* the edit, because the point of this lesson is the router shape, not the formatter. You'll meet the real format-lint in Part 3.*

### What you build, in three moves

**Move 1 — feel the duplication.** Look at [`solution/before-refactor/`](solution/before-refactor/). There are two standalone hooks there: `hello-hook.mjs` (from 1.1) and a new `format-lint.mjs` that — despite its name — only _logs_ which file was edited on `PostToolUse` (it doesn't format anything yet; that's deliberate, so the duplication with `hello-hook.mjs` stays the focus — see the aside above). Open them side by side. Notice how much is character-for-character identical — the imports, `readStdin`, the parse, the `try/catch`, `process.exit(0)`. Only the middle differs. _This copy is the problem._

**Move 2 — define the dispatcher.** Say it in your own words before you write it: one script, many events, branch on the event name. That's the whole idea you're about to encode.

**Move 3 — build the router.** Open [`start/unified-hook.mjs`](start/unified-hook.mjs). The two branch handlers (`handlePrompt`, `handlePostEdit`) are already written — they're just the middles of the two standalone hooks. The file is complete except for **two blanks**:

- **Blank 1** — read the event name from `process.argv`. It's `[nodePath, scriptPath, eventName]`, so the event name is at one specific index. Fill it in.
- **Blank 2** — add the `case "post-edit":` branch that calls `handlePostEdit(event)`. Model it on the `case "prompt":` directly above it; don't forget `break;`.

Diff against [`solution/unified-hook.mjs`](solution/unified-hook.mjs) if you get stuck.

### Re-wire `settings.json`

The payoff shows up in the wiring. Before, two events pointed at two files. Now **both events point at the same file**, distinguished only by the last argument. From [`start/settings.snippet.json`](start/settings.snippet.json):

```json
"command": "node $HOME/.claude/hooks/unified/unified-hook.mjs prompt"
"command": "node $HOME/.claude/hooks/unified/unified-hook.mjs post-edit"
```

Same script, two events, the argument is the only difference. Create the nested directory and copy your filled-in `unified-hook.mjs` into it (this is where Part 0's layout and the reference both keep the router):

```bash
mkdir -p "$HOME/.claude/hooks/unified"
cp start/unified-hook.mjs "$HOME/.claude/hooks/unified/unified-hook.mjs"
```

Then replace the old `UserPromptSubmit` block with the two blocks from the snippet, and restart your session.

## Checkpoint

**The dispatcher logs which event fired** — and you can prove it offline, no session needed. Run the router twice with different event names and one log file should show both kinds of line:

```bash
HOOK="$HOME/.claude/hooks/unified/unified-hook.mjs"

printf '%s' '{"prompt":"checkpoint prompt"}' | node "$HOOK" prompt
printf '%s' '{"tool_name":"Edit","tool_input":{"file_path":"src/app.ts"}}' | node "$HOOK" post-edit

tail -n 2 "$HOME/.claude/hello-hook.log"
```

**Pass:** the last two log lines are one of each kind — proving the _same script_ took two different branches based on the event name:

```
2026-06-23T05:54:56.060Z  prompt: checkpoint prompt
2026-06-23T05:54:56.104Z  edit: src/app.ts (.ts)
```

(Timestamps differ.) The `prompt:` line came from the `prompt` case; the `edit:` line came from the `post-edit` case. One file, two events, correct branch each time — that's the dispatcher working.

**Live confirmation (optional):** with the new wiring in place, submit a prompt _and_ let Claude edit a file in a real session, then `tail` the log — you'll see both a `prompt:` and an `edit:` line appear from real events.

## Recap + next

You felt the cost of copy-pasted hooks, named the dispatcher pattern, and built a two-case router that branches on the event name — the exact skeleton the reference harness scales to every event. From here, adding a feature means adding a `case`, not a file.

One thing you've been doing on faith: every branch ends in `process.exit(0)` and is wrapped in `try/catch`. Next lesson makes you earn that.

Next: **[1.3 — Fail-silent design](../1.3-fail-silent/)** — break a hook on purpose and prove the session shrugs it off.

---

_[← 1.1](../1.1-hello-hook/) · 1.2 · [1.3 →](../1.3-fail-silent/)_
