# Part 6 — Packaging & setup

**Difficulty:** Intermediate · **Time:** ~50 minutes

You've built every piece of the harness. Right now it's scattered across the
lesson folders and runs only where you assembled it. Part 6 turns that pile into
something **installable** — one script that wires the hooks, registers the MCP
server, and drops in the statusline, on any machine, repeatably.

The theme running through all three lessons is **idempotency**: every step is
safe to run again. You'll re-run the installer after an update, on a second
laptop, or when you're not sure the last run finished — and it just works,
because re-running converges to the same state instead of piling up duplicates or
destroying your config.

## The three lessons

| Lesson                                             | You build                                              | The idea                                             |
| -------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------- |
| [6.1 `install.sh`](6.1-install-sh/)                | An idempotent installer: render settings, copy payload | safe to re-run; verbatim copy; back up, never delete |
| [6.2 MCP registration](6.2-mcp-registration/)      | `register-mcp.sh` over `mcp-servers.json`              | `claude mcp add`, guarded by skip-if-missing         |
| [6.3 statusline + context-report](6.3-statusline/) | A context/cost statusline + a fire-once warning        | always-on feedback that can't break a session        |

A recurring distinction worth holding onto: **`$HOME` is expanded by different
people at different times.** In `settings.json` (6.1) it's left literal — Claude
Code expands it later, at hook-exec time, so the file is portable. In
`mcp-servers.json` (6.2) the installer expands it now, because it's about to
hand the real path to `claude mcp add`. Same marker, opposite handling, decided
by _who consumes the path and when_.

## The principle that ties Part 6 together

**An installer for `~/.claude` must be re-runnable without fear.** That directory
holds your real configuration — a script that clobbers it, errors on the second
run, or `rm -rf`'s anything is a script you'll be afraid to run, and an installer
you're afraid to run is worse than no installer. So: `mkdir -p`, copy-to-converge,
back up before overwrite, and never delete.

Do the lessons in order — 6.2 and 6.3 assume the layout 6.1 installs.

## Part 6 self-assessment

1. **What makes an installer idempotent, and why does it matter especially for
   `~/.claude`?**
   <details><summary>Answer</summary>Idempotent = running it again leaves the
   **same end state** — no duplicated files, no error because something already
   exists, no destroyed work. The habits: `mkdir -p` (never errors on an existing
   dir), copy harness-owned files from source every run (the bytes converge), and
   back up the one user-owned file before overwriting it. It matters for
   `~/.claude` because that's your live config: you must be able to re-run after
   every update without risking the settings, hooks, and registrations you depend
   on. The proof is `git diff --exit-code` on the generated files after a second
   run: clean.</details>

2. **Callback (Part 0 / 6.1):** The installer copies `settings.json` verbatim and
   does **not** expand `$HOME`. Why would expanding it in the installer be a bug?
   <details><summary>Answer</summary>Because the literal `$HOME` is expanded by
   **Claude Code** at hook-execution time, on whatever machine the file lives on.
   If the installer baked in one machine's home path, the file would break the
   moment it moved to a different home (or the home dir changed). The verbatim
   copy is what keeps the file portable.</details>

> 🏁 **Where this leaves you:** your harness is now a real, installable tool. From
> here, [Part 7](../07-level-up/) is opt-in power-ups (token compression,
> auto-approve, multi-vendor review), and [Part 8](../08-capstone/) is assembling
> and publishing your own.
