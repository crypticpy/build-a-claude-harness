# 6.2 — MCP registration: tell Claude Code your server exists

You built an MCP server in Part 4. It works — but Claude Code doesn't know it's
there. Registration is the handshake: `claude mcp add` writes the server's launch
command into Claude Code's own config, so the next session starts your server and
exposes its tools. This lesson automates that handshake from a small
`mcp-servers.json`, with the two skip-if-missing guards that keep it from
breaking on a machine that isn't fully set up.

## Objectives

By the end, you will be able to:

- **Register** a server from `mcp-servers.json` with `claude mcp add`, expanding
  `${HOME}` to a real path because the command is used _now_, on _this_ machine.
- **Guard** the step: skip everything if the `claude` CLI is absent; skip one
  server if its built file is missing.
- **Verify** registration with `claude mcp list`.

Each objective maps to the Checkpoint below.

## Time

15–20 minutes.

## Before you start

> 🧠 **No peeking (recall from Part 4):** In one sentence — what _is_ an MCP
> server, mechanically? And what does Claude Code need in order to start one?
>
> <details><summary>Answer</summary>An MCP server is a process that speaks
> JSON-RPC over stdin/stdout — Claude Code sends it `initialize` / `tools/list` /
> `tools/call`, it answers. To start one, Claude Code needs the **launch command**
> (e.g. `node .../dist/mcp-server.js`). Registration is exactly how you hand it
> that command.</details>

Copy this lesson's `start/`:

```bash
cp -r start my-mcp-reg && cd my-mcp-reg
```

## The lesson

### Principle: configuration as data, registration as a guarded action

The _what_ (which servers, which launch commands) is data —
`mcp-servers.json`, which carries no secrets and can be committed. The _how_
(running `claude mcp add`) is an action that depends on the machine's state. Two
guards make that action safe anywhere:

1. **No `claude` CLI → skip the whole step** (warn, `exit 0`). A fresh machine
   without the CLI is a normal state, not a failure. You install the CLI and
   re-run.
2. **A server's built file is missing → skip _that_ server** (`continue`). If
   Part 4's `npm run build` hasn't produced `dist/mcp-server.js` here yet,
   registering its launch command would point Claude Code at a file that doesn't
   exist. Skip it; build it; re-run.

Both guards share a philosophy you've seen since Part 1: **degrade quietly, never
crash.** A packaging script that hard-errors on a half-set-up machine is a
packaging script people stop running.

### Why `${HOME}` is expanded _here_ (the opposite of 6.1)

In 6.1 you copied `settings.json` **verbatim** — its `$HOME` is expanded later, by
Claude Code, at hook-exec time. Here it's the reverse. The path in
`mcp-servers.json` is handed to `claude mcp add` **right now**, on **this**
machine, so the script expands `${HOME}` to the real home before passing it
along. The rule isn't "always expand" or "never expand" — it's **expand when the
path is used now, leave it literal when something else uses it later.** Same
marker, opposite handling, because the consumer is different.

### Idempotent registration

Registering a name that's already registered can error or duplicate. So before
adding, the script removes any existing registration of the same name, then adds
— making a re-run safe, the same idempotency principle as 6.1.

### How the reference does it

The reference folds this into [`install.sh`](../../../reference/install.sh) step 4
and reads [`mcp-servers.json`](../../../reference/mcp-servers.json) — note the
reference also lists an optional `Ref` server gated behind `REF_API_KEY` (skipped
when the env var is unset, the same skip-if-missing idea applied to a secret).
Your standalone `register-mcp.sh` is that step, pulled out so you can run it on
its own.

### Build

Open `start/register-mcp.sh`. The JSON walk, the `${HOME}` expansion, and the
idempotent add are **done**. Fill **two conditions** marked `# TODO` (each `if`
currently tests `false` as a placeholder):

1. **TODO 1** — the "no `claude` CLI" test: `! command -v claude >/dev/null 2>&1`.
2. **TODO 2** — the "built file missing" test: `[[ -n "$skip" && ! -e "$skip" ]]`.

`solution/` has the finished script.

## Checkpoint

You don't need a real MCP server built to prove the logic — `--dry-run` prints
the exact `claude mcp add` command without running it, and the guards are
observable directly.

**A — the guards fire correctly:**

```bash
cd my-mcp-reg

# Guard 1: with no claude CLI on PATH, the whole step skips and exits 0.
env PATH=/usr/bin:/bin bash register-mcp.sh ; echo "exit=$?"
# → "[warn] claude CLI not found ... skipping"   exit=0
```

**B — with `claude` present and the built file present, it would register:**

```bash
# Simulate a set-up machine: a stub `claude` + a present built file.
BIN=$(mktemp -d); printf '#!/usr/bin/env bash\necho "(stub) %s" "$@"\n' claude > "$BIN/claude"; chmod +x "$BIN/claude"
FAKE=$(mktemp -d); mkdir -p "$FAKE/.claude/plugins/context-layer/dist"; touch "$FAKE/.claude/plugins/context-layer/dist/mcp-server.js"

env PATH="$BIN:$PATH" HOME="$FAKE" bash register-mcp.sh --dry-run
# → [dry-run] would: claude mcp add context-layer -- node /…/dist/mcp-server.js

# Guard 2: remove the built file → that server is skipped.
rm "$FAKE/.claude/plugins/context-layer/dist/mcp-server.js"
env PATH="$BIN:$PATH" HOME="$FAKE" bash register-mcp.sh --dry-run
# → [warn] context-layer — built file missing (...); skipping
rm -rf "$BIN" "$FAKE"
```

✅ **You got it when:** part A skips-and-exits-0 with no CLI; part B's first run
prints the `claude mcp add context-layer -- node …/dist/mcp-server.js` line (with
`${HOME}` expanded to the real path), and removing the built file makes that
server skip.

> 🔌 **On a real machine** (CLI installed, server built), drop `--dry-run` and run
> it for real, then verify the registration landed:
>
> ```bash
> claude mcp list          # should list: context-layer
> ```
>
> That `claude mcp list` line is the curriculum's checkpoint — the server now
> shows up, and your next Claude Code session will start it.

## Recap + next

Your MCP server is now discoverable by Claude Code, registered by a guarded,
idempotent script. You also nailed the `${HOME}` distinction: expand it when the
path is consumed _now_, leave it literal when Claude Code consumes it _later_.

Next, **[6.3 — statusline + context-report](../6.3-statusline/)** adds the
at-a-glance feedback layer: a status line showing context/cost, and a one-time
warning when the context window is nearly full.
