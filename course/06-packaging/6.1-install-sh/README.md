# 6.1 — `install.sh`: one idempotent script

You've built a harness across five parts. Right now it lives in scattered
folders. This lesson wires it into `~/.claude` with a single script — and the
property that matters most is that you can run that script **again** (after an
update, on a second machine, when you're not sure if the last run finished)
and it's always safe. That property has a name: **idempotent**.

The script does two simple things: render the settings file from a template, and
copy the harness payload into place. The care is all in _how_ — copy the
template verbatim, back up before overwriting anything user-owned, and never
delete.

## Objectives

By the end, you will be able to:

- **Render** `settings.json` from a template with a verbatim copy (no `$HOME`
  substitution) and explain why the installer must not expand `$HOME`.
- **Back up** an existing `settings.json` before overwriting it — never clobber,
  never `rm`.
- **Prove** idempotency: run the installer twice and show the generated files are
  byte-identical the second time.

Each objective maps to the Checkpoint below.

## Time

20–25 minutes.

## Before you start

> 🧠 **No peeking (recall from Part 0's event model):** The settings file wires
> events to hook scripts with commands like
> `node $HOME/.claude/hooks/unified/unified-hook.mjs prompt`. When does that
> `$HOME` get turned into a real path — when the installer copies the file, or
> later? And who does the expanding?
>
> <details><summary>Answer</summary>**Later**, by **Claude Code**, at
> hook-execution time. The installer copies the template **verbatim** — it must
> NOT expand `$HOME`. If the installer baked in one machine's home path, the file
> would break on any other machine (or after the home dir moves). Leaving the
> literal `$HOME` in the file is what makes it portable.</details>

Copy this lesson's `start/` folder:

```bash
cp -r start my-installer && cd my-installer
```

## The lesson

### Principle: idempotent means "safe to run again"

An idempotent installer leaves the system in the **same end state** no matter
how many times you run it. Re-running after an update shouldn't duplicate files,
shouldn't error because a directory already exists, and shouldn't destroy work.
Three habits get you there:

- **`mkdir -p`** never errors when the directory already exists (the `-p` flag is
  the idempotency).
- **Copy, converge** — harness-owned files are overwritten from source every run,
  so the bytes on disk converge to the source. A second run changes nothing.
- **Back up before overwrite, never delete** — the one user-owned file
  (`settings.json`) is copied aside to a timestamped backup before it's replaced.
  There is no `rm -rf` anywhere; the worst case is a stale backup, never lost work.

### Why the installer must not expand `$HOME` (the verbatim-copy rule)

This is the single most important line in the script:

```bash
cp "$TEMPLATE" "$SETTINGS"     # NOT  sed/envsubst — a plain copy
```

The template's hook commands contain a literal `$HOME`. **Claude Code** expands
that when it runs the hook, on whatever machine the file lives on. If the
_installer_ expanded it (via `sed`, `envsubst`, or shell interpolation), it would
freeze one machine's path into the file — and the harness would silently break
the moment the file moved to a different home. A verbatim copy keeps the file
portable. The "render" step is, deliberately, just a copy.

### How the reference does it

The reference's [`install.sh`](../../../reference/install.sh) does this plus the
MCP build and registration (steps 2 and 4 there — that's lesson 6.2), a Node
version check, and a `--dry-run` mode. Your version keeps the packaging core:
mkdir, backup, verbatim render, payload copy. The structure — a `run` wrapper so
`--dry-run` can describe every action — is lifted straight from the reference.

### Build

Open `start/install.sh`. The structure, the `run`/`--dry-run` wrapper, the backup
filename, and the payload-copy loop are **done**. Fill **three one-line blanks**
marked `# TODO` — each has the exact command in the comment directly above it:

1. **TODO 1** — `mkdir -p` the target dir and its `hooks` subdir.
2. **TODO 2** — `cp` the existing `settings.json` to its backup (a copy — never
   `mv` or `rm`).
3. **TODO 3** — `cp` the template to `settings.json` verbatim (no substitution).

`solution/` has the finished script.

## Checkpoint

Install into a **throwaway** directory (so your real `~/.claude` is untouched),
twice, and prove the generated files don't change on the second run:

```bash
cd my-installer
TGT=$(mktemp -d /tmp/harness-test.XXXXXX)

CLAUDE_HARNESS_TARGET="$TGT" ./install.sh          # run 1
HASH1=$(find "$TGT" -type f ! -name '*.backup.*' -exec shasum {} \; | sort | shasum)

CLAUDE_HARNESS_TARGET="$TGT" ./install.sh          # run 2
HASH2=$(find "$TGT" -type f ! -name '*.backup.*' -exec shasum {} \; | sort | shasum)

[ "$HASH1" = "$HASH2" ] && echo "IDEMPOTENT ✓" || echo "DRIFT ✗"
ls "$TGT"/settings.json.backup.* >/dev/null 2>&1 && echo "backup made on run 2 ✓"
rm -rf "$TGT"
```

✅ **You got it when:**

- `IDEMPOTENT ✓` prints — the installed files are byte-for-byte identical across
  runs. (The curriculum's framing of this check is `git diff --exit-code` on the
  generated files: clean, no changes.)
- `backup made on run 2 ✓` prints — run 2 found the `settings.json` from run 1 and
  backed it up before overwriting, instead of clobbering it.

> 🧪 **Why exclude `*.backup.*` from the hash?** Each run timestamps a fresh
> backup, so the _backup_ files differ run-to-run by design. Idempotency is about
> the **generated** files (settings + payload), which must converge. The
> ever-present backup is the proof we never destroy the old version.

## Recap + next

You have a one-command, re-runnable installer that renders settings verbatim,
backs up before overwriting, and never deletes. You can re-run it after every
change without fear — the defining property of a good installer for a directory
as precious as `~/.claude`.

Next, **[6.2 — MCP registration](../6.2-mcp-registration/)** adds the step that
tells Claude Code about your MCP server — `claude mcp add`, done idempotently and
skipped cleanly when the CLI or the built server isn't there.
