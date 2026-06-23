# 7.1 — tokf: compress command output before it costs you context

Some commands are loud. `npm test`, `docker build`, `git log`, `gh pr view` — they dump hundreds of lines, of which the model needs maybe five. Every one of those lines is a [token](../../../docs/glossary.md#token) that enters context, costs money, and dilutes the model's attention. **tokf** is a small, free, local CLI that sits in front of noisy commands and hands the model the signal instead of the noise — while keeping the full output one command away, so nothing is ever actually lost.

> 📦 **Requirement (read before you start):** You install one free CLI with Homebrew. No API key, no account, no network calls at runtime — it's a local binary. If you don't have `brew` (or are on a system without it), read the lesson for the idea; the principle stands on its own.

## Objectives

By the end, you will be able to:

- **Install** tokf and **wire** it as a `PreToolUse` hook on `Bash`, so verbose command output is compressed before it reaches context.
- **Verify** that a loud command comes back compressed, marked with 🗜️.
- **Recover** the complete, unfiltered output with `tokf raw last` — and explain why that escape hatch is what makes aggressive filtering safe.

Each objective maps to the Checkpoint below.

## Time

20–30 minutes (most of it the one-time install).

## Before you start

> 🧠 **No peeking (recall from Part 2):** The rolling log in 2.1 cost zero tokens because it made no LLM call. State the principle that lesson opened with — the one about the _cheapest_ token.
>
> <details><summary>Answer</summary><b>Token economy</b> (Principle 4): <i>the cheapest token is one that never enters context.</i> The rolling log was free because it wrote to disk without ever calling a model. tokf is the same principle applied to <i>command output</i> — the cheapest way to handle 300 lines of build log is to never put 295 of them in front of the model in the first place.</details>

This lesson has no `start/` to copy — you're installing a real tool and wiring one hook line. Everything you need is below.

## The lesson

### Principle: token economy — strip the noise at the boundary

The model doesn't need the 300-line `npm test` output. It needs "47 passed, 2 failed, here are the 2 failures." tokf knows that, because it ships **filters keyed by command pattern**: a rule that says "when the command looks like `npm test *`, keep the summary and the failures, drop the per-test PASS spam." The filtering happens **at the boundary** — after the command runs, before its output enters context — which is exactly where the [token-economy principle](../../../docs/principles.md#4-token-economy) says to spend your effort. Output the model never sees is output you never pay for.

It's a local Rust binary, so the filtering itself is **free in tokens and instant** — no LLM call, no network. (Same spirit as Part 4's MCP tools: distilled answers computed by plain code, off the LLM cost ladder entirely.)

### Why aggressive filtering is safe: the 🗜️ marker + `tokf raw last`

This is what makes aggressive filtering trustworthy rather than risky. If a tool silently _deleted_ 295 lines of output, you'd never adopt it — what if the answer was in line 200?

tokf doesn't delete. It **filters a view** and keeps the original. Two pieces make this safe:

1. **The 🗜️ marker.** Compressed output is prefixed with 🗜️ (a compression emoji). That marker is a standing signal — to the model and to you — that says "this is the filtered view; the full output exists." (This convention is documented so the model knows to honor it: when it sees 🗜️, it knows there's a `raw` it can reach for.)
2. **`tokf raw last`.** The complete, byte-for-byte original output is stored on disk in tokf's tracking database. `tokf raw last` prints the full uncompressed output of the most recent command (and `tokf raw <id>` recovers any earlier one). So the unfiltered bytes are always **one command away.**

That's the whole safety argument: **filtering is a reversible view, not a destructive edit.** You (or the model) can be aggressive about compression precisely because the escape hatch is lossless. If a summary ever looks suspicious or incomplete, `tokf raw last` settles it. Without that escape hatch, you'd have to filter timidly; with it, you can filter hard.

### How the reference does it

The harness wires tokf as a **`PreToolUse` hook on `Bash`** — the same event→script router you've used since Part 1. The hook reads the tool call, runs the command through `tokf`, and returns the compressed output in place of the raw output. tokf resolves filters in a layered way: a repo-local `.tokf/filters` directory overrides a user-level filters directory, which overrides the binary's built-in filters (it ships dozens, for common commands like `git`, `gh`, `npm`, `docker`). You can list what's available with `tokf ls` and author your own.

> 🛠️ **Authoring filters is its own skill.** A filter is a small declarative definition — match a command pattern, then apply ordered steps (keep matching lines, drop noise, collapse repeats, template a summary). The harness ships two helper skills for this: one to **author** a filter for a command that isn't covered, and one to **discover** commands you're running that have no filter yet and are bleeding tokens. You don't need either to do this lesson's checkpoint — the built-in filters are enough — but they're how you extend coverage later.

### Build — install and wire

**1. Install** (Homebrew):

```bash
brew install mpecan/tokf/tokf   # tap + formula; or your platform's documented install
tokf --version                  # confirm it's on PATH
```

**2. Wire the hook.** tokf ships a hook handler; you register it as a `PreToolUse` hook on `Bash` in your `settings.json`, the same router shape as every hook since Part 1:

```jsonc
// settings.json — hooks → PreToolUse (Bash matcher)
{
  "matcher": "Bash",
  "hooks": [
    {
      "type": "command",
      "command": "<path to tokf's pre-tool-use hook handler>",
    },
  ],
}
```

(tokf's installer prints the exact handler path for your platform — paste it verbatim. Like every `settings.json` value, it's copied as-is; don't try to interpolate it.)

**3. Teach the model the marker.** So Claude honors the escape hatch, add a one-line note to your `CLAUDE.md` (or a memory file): _"🗜️ means this output was compressed by tokf. Run `tokf raw last` to see the full uncompressed output of the last command."_ Now when the model sees 🗜️ and needs the detail, it knows the move.

## Checkpoint

Two observations, in one short session, prove the whole loop: **compression happens, and it's losslessly reversible.**

**1 — A loud command comes back compressed.** In a Claude Code session with the hook wired, run a genuinely verbose command — a build, a full test run, a long `git log`, anything that normally floods the terminal:

```bash
git log --stat -50        # or: npm test, docker build ., gh pr view <n>
```

✅ **You got it when** the output the model receives is visibly shorter than the raw command would produce, and it carries the **🗜️ marker**. (If you see the full, unfiltered firehose with no 🗜️, the hook isn't wired — recheck the `PreToolUse`/`Bash` matcher in `settings.json`.)

**2 — `tokf raw last` recovers the full output.** Immediately after, run:

```bash
tokf raw last
```

✅ **You got it when** this prints the **complete, unfiltered** output of that command — every line the compressed view dropped. That's the escape hatch working: the bytes were never gone, just held back. Compare the two and you can see exactly what was filtered and confirm nothing important was hidden.

> Together these two are the lesson: step 1 shows tokf _saving you context_, step 2 shows it _not lying to you about it._ Either one alone wouldn't be enough to trust — both together are.

## Recap + next

You put a token-economy filter at the command boundary: noisy output gets compressed before it costs context, marked with 🗜️ so the compression is visible, and fully recoverable with `tokf raw last` so it's never destructive. The reversibility is the whole reason aggressive filtering is safe — it's a view, not a deletion.

→ **[7.2 — cf-approve](../7.2-cf-approve/)** applies the _friction-reduction_ principle to a different boundary: instead of compressing what the model _says_, it auto-clears the permission prompts the model triggers — but it spends money to do it, so the safety model gets careful attention. (Or jump to any other Part-7 module; they're independent.)
