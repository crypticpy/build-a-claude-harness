# 7.4 — claude-deck: physical control, and the two-pipe model

This is the one module in the course you can't fully do without hardware — and we're not going to pretend otherwise. **claude-deck** turns an Elgato Stream Deck into a physical control surface for Claude Code: a row of real buttons that approve, reject, interrupt, switch model, fire a slash command — and a set of live tiles that show token count, cost, mode, and git status as the session runs. The deep idea worth taking even if you never touch the hardware is the **two-pipe model**: how state flows _out_ of a session onto a button, and how a button press flows _in_ to the session. Those two directions are built completely differently, and understanding why is the lesson.

> 🎛️ **Requirement (read before you start) — HARDWARE-GATED:** claude-deck needs a physical **Elgato Stream Deck** (or the **Stream Deck Mobile** app, which is a software stand-in for the device), plus macOS and an accessibility permission. This course cannot ship you a device. So **this lesson has no solo checkpoint** — it's an honestly-labeled demo of a hardware feature, not a build-and-verify exercise. Read it for the **two-pipe model**, which is a transferable harness pattern; do the hardware demo only if you happen to own the device.

## Objectives

By the end, you will be able to:

- **Explain** the two-pipe model: synthetic keystrokes flowing _out_ to Claude Code, and hook-written state files flowing _in_ to the deck — and why each direction needs a different mechanism.
- **Identify** which Part-1 primitive supplies the "read" pipe (and why it's just files, not an API).
- **Recognize** the hardware-gated nature of this module and the accessibility permission that the "write" pipe depends on.

> ⛔ **No Checkpoint section in this lesson** — it's hardware-gated. The objectives are knowledge objectives (explain / identify / recognize), and the "Demo (if you have the hardware)" section below is the closest thing to a checkpoint, clearly labeled as optional and device-dependent.

## Time

15–20 minutes to read; +30 if you own the device and do the demo.

## Before you start

> 🧠 **No peeking (recall from Part 1):** A hook is "a script that runs automatically at a specific lifecycle moment." Name two lifecycle events a hook can fire on. You'll need this immediately — the deck's "read" pipe is built entirely out of hooks.
>
> <details><summary>Answer</summary>Any two of, e.g.: <code>SessionStart</code>, <code>UserPromptSubmit</code>, <code>PreToolUse</code>, <code>PostToolUse</code>, <code>Stop</code>, <code>PreCompact</code>, <code>Notification</code>. The deck writes state on several of these (PostToolUse to update the token/tool tiles, Stop to flip a "done" indicator, and so on).</details>

## The lesson

### The problem: a button and a session don't speak the same language

A Stream Deck button is a piece of hardware that knows how to do two things: detect a press, and render an image. A Claude Code session is a process in your terminal. There's no API where the deck "calls" Claude Code or Claude Code "calls" the deck. So how does pressing a physical button approve a permission prompt? And how does a tile _know_ the current token count to display it?

The answer is **two completely separate pipes, built from two completely different mechanisms** — because the two directions have nothing in common.

### Pipe 1 — WRITE (button → Claude Code): synthetic keystrokes

When you press the **Approve** button, claude-deck doesn't send a message to Claude Code. There's no channel for that. Instead it **synthesizes a keystroke** — it tells macOS, via AppleScript (`System Events`), to type a `y` into whatever terminal currently has focus. Press **Reject**, it types `n`. Press **Interrupt**, it sends `Ctrl-C`. **Switch model**, it sends the key sequence Claude Code's own UI uses for that.

In other words, the "write" pipe is the deck **pretending to be your keyboard.** From Claude Code's point of view, nothing special happened — a human typed `y`, same as always. That's why it works across any vendor's CLI without integration: the deck isn't talking to Claude Code, it's talking to the _terminal_, and the terminal feeds keystrokes to whatever's running.

> 🔐 **This is why claude-deck needs an Accessibility permission** — and it's the #1 gotcha. Synthesizing keystrokes into another app is exactly the kind of thing macOS guards behind Accessibility. If that permission isn't granted, the buttons **silently do nothing** — no error, just dead buttons. (If you do the demo and a button doesn't work, check System Settings → Privacy & Security → Accessibility first.)

### Pipe 2 — READ (Claude Code → deck): hook-written state files

The tiles go the other way, and they use a mechanism you already know cold: **hooks writing files.** This is the [router from Part 1](../../../docs/principles.md#2-settingsjson-is-the-router), pointed at a new job.

claude-deck registers **hooks** on Claude Code lifecycle events. On `PostToolUse` it writes the running token/cost/tool counts; on `Stop` it flips a "done" state; on `SessionStart` it records which session this is. Each hook writes a small **JSON state file** to disk (one file per session, keyed by the session's process id, so two concurrent sessions don't clobber each other). The deck plugin **watches that directory** for changes and re-renders the affected tiles. The deck never _asks_ Claude Code anything — it reads files that hooks left behind. State flows out of the session and onto the buttons through plain files on disk.

That's the elegant part and the reason the two pipes are different: **reading state and writing actions have no symmetry.** Reading is passive observation, perfectly suited to "hooks dump state, the deck tails it." Writing is active control, which there's no API for, so it's done by faking keystrokes. One pipe is files; the other is a synthetic keyboard. Conflating them — trying to make the read pipe send commands, or the write pipe carry rich state — is the design mistake the two-pipe split exists to avoid.

> 🪦 **A cautionary trace (the honest version):** early designs imagined hooks writing a "commands" file that the deck would _execute_ — a richer two-way command channel. That path is **vestigial**: in practice every action the deck takes is a keystroke, and nothing reads a commands file. The lesson generalizes: when you have a working asymmetric design (files in, keystrokes out), resist bolting on a symmetric command bus you don't need. The keystroke _is_ the command.

### How the reference does it

The harness wires claude-deck's **read** pipe through `settings.json` hooks (the same router as every other hook), each writing per-session state JSON the plugin watches. The **write** pipe lives entirely in the plugin, which maps each button to a keystroke sequence via AppleScript. The plugin supports multiple agent CLIs behind a capability flag, so the same buttons drive Claude Code, Codex, or others — because, again, it's typing into a terminal, not integrating with a vendor.

## Demo (only if you own the hardware) — labeled, not a checkpoint

> ⛔ **This is a hardware demo, not a verifiable solo checkpoint.** If you don't have a Stream Deck (or the Mobile app), skip it — you've already got the transferable idea.

If you do have the device:

1. Install the claude-deck plugin and grant the **Accessibility** permission (the buttons are dead without it).
2. Wire its state hooks into your `settings.json` (the read pipe) per its installer.
3. Start a Claude Code session, trigger a permission prompt, and press **Approve** — watch the session receive the `y`. That's pipe 1.
4. Run a few tool calls and watch the **token/cost tiles update** without you touching anything. That's pipe 2.

There's nothing to assert and nothing to diff — you're confirming a physical device responds. That's exactly why it isn't a course checkpoint: it isn't solo-mechanically-verifiable in a way we can ship you.

## Recap + next

You learned the **two-pipe model**: a _write_ pipe that controls Claude Code by synthesizing keystrokes (it pretends to be your keyboard, which is why it needs Accessibility and works across vendors), and a _read_ pipe that displays session state by watching files that **hooks** write (the Part-1 router again, pointed at the deck). The two directions are deliberately asymmetric, and the keystroke — not a command bus — is the action. The hardware is optional; the read/write split is a pattern you'll recognize anywhere a UI mirrors a process it can't directly call.

That's the last of the Part-7 level-ups. → **[Part 8 — the Capstone](../../08-capstone/)**: assemble the pieces you actually want into your own harness, depersonalize it, and publish it — with a transfer task and rubric to design something new.
