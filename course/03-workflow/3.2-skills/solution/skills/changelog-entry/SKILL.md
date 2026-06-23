---
name: changelog-entry
description: Draft a single CHANGELOG entry from the current change. Use when the user asks to "add a changelog entry", "update the changelog", or "write a changelog line" for work that is already done — not for writing release notes for a whole version, and not for code that isn't finished yet.
---

You are drafting one CHANGELOG entry for a change that is already complete. Produce a single line, then stop. Do not edit files unless the user asks you to apply it.

This is a **skill**: Claude invokes it for itself based on the `description` above. The description spends as much energy on _when not to_ (whole-version release notes, unfinished code) as on _when to_ — that precision is what keeps the model from pulling it in at the wrong moment.

## When this applies

- The change is finished and the user wants a changelog line for it.
- The user says "add a changelog entry / update the changelog / write a changelog line."

It does **not** apply when the user wants full release notes for a version, or when the work isn't done. If there's no completed change to describe, say so and stop.

## How to write the entry

1. Pick the category: `Added`, `Changed`, `Fixed`, `Removed`, or `Security`. Pick exactly one — the one that best fits the change.
2. Write one line, imperative mood, user-facing: what changed from the user's point of view, not the internal mechanics.
3. Keep it under ~100 characters. No issue numbers unless the user gives one.

## Output format

```
- <Category>: <one line, imperative, user-facing>
```

One line. If the change touches several unrelated things, say it should be split into separate entries rather than cramming them into one.

## Stop condition

One entry, then stop. Do not rewrite the whole changelog, do not invent a version header, and do not edit files unless the user explicitly asks you to apply the line.
